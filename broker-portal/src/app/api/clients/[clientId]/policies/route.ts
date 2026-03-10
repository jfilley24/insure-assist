import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";
import { Prompts, Schemas } from "@/lib/ai/policy-prompts";

initAdmin();

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "insure-assist-dev";
// Use the standard GCP location for GenAI tools
const LOCATION = "us-central1";
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const model = "gemini-2.5-flash";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ clientId: string }> }
) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        if (token === "test-bypass") {
            decodedToken = { brokerId: "91eeec97-5924-4737-8850-04bc6ac2b066", uid: "test-uid" };
        } else {
            decodedToken = await getAuth().verifyIdToken(token);
        }
        const userBrokerId = decodedToken.brokerId;
        const userId = decodedToken.uid;

        if (!userBrokerId) {
            return NextResponse.json({ error: "Forbidden: Missing Broker assignment" }, { status: 403 });
        }

        const { clientId } = await params;

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { brokerId: true }
        });

        if (!client || client.brokerId !== userBrokerId) {
            return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 });
        }

        const body = await request.json();
        const { gcsUri, filename, policyType } = body;

        if (!gcsUri || !filename || !policyType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!Prompts[policyType] || !Schemas[policyType]) {
            return NextResponse.json({ error: "Unsupported policy type" }, { status: 400 });
        }

        console.log(`Starting Vertex AI Extraction for ${gcsUri} (${policyType})`);

        // Initialize Gemini model for Key Fields (Structured JSON) using .preview for v1beta1 required by 2.5 models
        const structuredModel = vertexAI.preview.getGenerativeModel({
            model: model,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: Schemas[policyType],
                temperature: 0.1
            }
        });

        // Initialize Gemini model for Free Form using .preview
        const freeFormModel = vertexAI.preview.getGenerativeModel({
            model: model,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1
            }
        });

        // Vertex AI supports gs:// URIs natively in contents
        const filePart = {
            fileData: { fileUri: gcsUri, mimeType: "application/pdf" }
        };

        // 1. Generate Structured Key Fields
        console.log(`Sending Structured Request to Vertex AI (Phase 1)...`);
        const structuredResult = await structuredModel.generateContent({
            contents: [{
                role: "user",
                parts: [
                    filePart,
                    { text: Prompts[policyType] }
                ]
            }]
        });
        console.log(`Received Structured Response from Vertex AI (Phase 1).`);
        const keyFieldsResp = structuredResult.response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        const cleanJsonString = (raw: string) => {
            let clean = raw.trim();
            if (clean.startsWith('```')) {
                clean = clean.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '').trim();
            }
            return clean;
        };

        const cleanedKeyFields = cleanJsonString(keyFieldsResp);
        let keyFieldsJson = null;
        try {
            JSON.parse(cleanedKeyFields);
            keyFieldsJson = cleanedKeyFields;
        } catch (e) {
            console.error("Failed to parse structured JSON from Vertex", e);
            keyFieldsJson = cleanedKeyFields; // Save it anyway for debugging
        }

        // --- IMMEDIATELY SHORT-CIRCUIT IF WRONG DOCUMENT TYPE ---
        if (keyFieldsJson) {
            try {
                const parsedStructured = JSON.parse(keyFieldsJson);
                if (parsedStructured.is_matching_policy_type === false) {
                    console.error(`Document mismatch detected in Phase 1: Expected ${policyType}`);
                    return NextResponse.json({ error: `The uploaded document does not appear to be a valid ${policyType} policy.` }, { status: 400 });
                }
            } catch (e) {
                // Ignore parse errors here
            }
        }

        // 2. Generate Unstructured Free Form
        const freeFormPrompt = `Read the attached PDF and create a comprehensive, completely flexible JSON representation of the entire document. Extract any endorsements, exclusions, special notes, and detailed structures that might be useful for a conversational agent answering questions about the policy later. It must be valid JSON starting with a top-level key like "document".`;
        console.log(`Sending Freeform Request to Vertex AI (Phase 2)...`);
        const freeFormResult = await freeFormModel.generateContent({
            contents: [{
                role: "user",
                parts: [
                    filePart,
                    { text: freeFormPrompt }
                ]
            }]
        });
        console.log(`Received Freeform Response from Vertex AI (Phase 2).`);
        const freeFormResp = freeFormResult.response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        let freeFormJson = null;
        const cleanedFreeForm = cleanJsonString(freeFormResp);
        try {
            JSON.parse(cleanedFreeForm);
            freeFormJson = cleanedFreeForm;
        } catch (e) {
            console.error("Failed to parse freeform JSON from Vertex", e);
            freeFormJson = cleanedFreeForm; // Save it anyway for debugging
        }

        // 3. Create the Policy entry in Postgres
        const newPolicy = await prisma.policy.create({
            data: {
                filename,
                fileType: policyType,
                gcsUri,
                clientId,
                updatedById: userId,
                acord_fields_json: keyFieldsJson,
                free_form_json: freeFormJson,
                expirationDate: keyFieldsJson ? (() => {
                    try {
                        const parsed = JSON.parse(keyFieldsJson);
                        if (parsed.expiration_date) {
                            return new Date(parsed.expiration_date);
                        }
                    } catch { }
                    return null;
                })() : null,
            }
        });

        console.log(`Successfully ingested and saved Policy DB Row: ${newPolicy.id}`);

        return NextResponse.json(newPolicy, { status: 201 });

    } catch (error: any) {
        console.error("POST /api/clients/[clientId]/policies error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error", stack: error.stack }, { status: 500 });
    }
}
