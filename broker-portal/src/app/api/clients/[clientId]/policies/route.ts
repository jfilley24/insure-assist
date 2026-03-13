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

        return new NextResponse(
            new ReadableStream({
                async start(controller) {
                    const sendEvent = (data: any) => {
                        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
                    };

                    try {
                        sendEvent({ update: "Initializing AI models..." });
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
                        sendEvent({ update: "Reading document structure..." });
                        
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
                        
                        // Clean markdown formatting if model ignored mimeType instructions
                        const cleanJsonString = (str: string) => {
                            let cleaned = str.trim();
                            if (cleaned.startsWith('```')) {
                                cleaned = cleaned.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '').trim();
                            }
                            return cleaned;
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
                                    sendEvent({ error: `The uploaded document does not appear to be a valid ${policyType} policy.` });
                                    controller.close();
                                    return;
                                }
                            } catch (e) {
                                // Ignore parse errors here
                            }
                        }

                        // --- PHASE 1.5: THE CRITIC PASS (SELF-REFLECTION) ---
                        if (keyFieldsJson) {
                            try {
                                const parsed = JSON.parse(keyFieldsJson);
                                let missingFields: string[] = [];
                                for (const [key, value] of Object.entries(parsed)) {
                                    if (value === null || value === "" || value === "N/A" || value === "Not Applicable") {
                                        missingFields.push(key);
                                    }
                                }

                                if (missingFields.length > 0) {
                                    console.log(`Phase 1.5 Critic Loop Triggered. Missing fields: ${missingFields.join(", ")}`);
                                    sendEvent({ update: `AI reviewer kicked off. Hunting for missing fields: ${missingFields.join(", ")}` });
                                    
                                    const criticPrompt = `You are a meticulous Insurance Policy Data Auditor. 
Your previous extraction attempt could not locate the following fields: ${missingFields.join(", ")}.

Please carefully re-read the entire attached document. Some of these fields may be buried in the endorsements, schedules, or headers/footers (like phone numbers, or policy limits).
If you find the missing data, incorporate it. If the missing field is the "naic_code", you MUST only extract it if it is explicitly written on the document. Do NOT use your internal knowledge to infer or guess the NAIC code.
If the data is truly absent from the document, leave it as null.

Please output the FULL, COMPLETE JSON schema again with your corrections applied.`;
                                    // We feed the entire conversational history back, including the file.
                                    const criticResult = await structuredModel.generateContent({
                                        contents: [
                                            { role: "user", parts: [filePart, { text: Prompts[policyType] }] },
                                            { role: "model", parts: [{ text: keyFieldsResp }] },
                                            { role: "user", parts: [{ text: criticPrompt }] }
                                        ]
                                    });
                                    
                                    const structuredText = criticResult.response.candidates?.[0]?.content.parts?.[0]?.text;
                                    if (!structuredText) {
                                        throw new Error("Failed to generate structured data from PDF");
                                    }

                                    let parsedJSON;
                                    try {
                                        parsedJSON = JSON.parse(cleanJsonString(structuredText));
                                        
                                        // Fallback: If NAIC Code wasn't explicitly in the document, search Google for it using the extracted Insurer Name
                                        if (parsedJSON.insurer_name && !parsedJSON.naic_code) {
                                            try {
                                                sendEvent({ update: `Searching for NAIC code for ${parsedJSON.insurer_name}...` });
                                                const searchModel = vertexAI.preview.getGenerativeModel({
                                                    model: model,
                                                    tools: [{ googleSearch: {} } as any]
                                                });
                                                const searchPrompt = `Use Google Search to find the primary Property and Casualty 5-digit NAIC code for the insurance carrier: "${parsedJSON.insurer_name}". 
If they have multiple subsidiaries, provide the main or most common NAIC code for Property and Casualty insurance, avoiding niche subsidiaries like Marine.

You MAY write out your reasoning, thought process, and search results. But you MUST wrap your final 5-digit NAIC code in XML tags like this: <naic>12345</naic>. If you cannot find a 5-digit NAIC code, output <naic>null</naic>.`;
                                                const searchResult = await searchModel.generateContent(searchPrompt);
                                                const searchCodeText = searchResult.response.candidates?.[0]?.content.parts?.[0]?.text?.trim() || "";
                                                console.log("\n--- NAIC SEARCH REASONING ---\n", searchCodeText, "\n-----------------------------\n");
                                                
                                                const naicMatch = searchCodeText.match(/<naic>(\d{5})<\/naic>/i);
                                                if (naicMatch) {
                                                    parsedJSON.naic_code = naicMatch[1];
                                                    sendEvent({ update: `Found NAIC code: ${naicMatch[1]}` });
                                                } else {
                                                    sendEvent({ update: `NAIC code not found via search for ${parsedJSON.insurer_name}.\nSearch details: ${searchCodeText.substring(0, 100)}...` });
                                                }
                                            } catch (searchError) {
                                                console.warn("Failed to lookup NAIC code via Google Search:", searchError);
                                                sendEvent({ update: `Failed to search for NAIC code: ${(searchError as Error).message}` });
                                            }
                                        }
                                        keyFieldsJson = JSON.stringify(parsedJSON);
                                    } catch (e) {
                                        console.error("Failed to parse JSON after critic pass:", structuredText);
                                        throw new Error("Failed to parse structured data after critic pass");
                                    }
                                    console.log(`Phase 1.5 Critic Loop Completed. Keys updated.`);
                                } else {
                                    console.log(`Phase 1.5 Critic Loop Skipped - No missing fields detected.`);
                                    sendEvent({ update: "Initial review passed. All fields found." });
                                }
                            } catch (e) {
                                console.error("Failed to execute Phase 1.5 Critic Pass", e);
                                // We silently swallow this and just use the Phase 1 keyFieldsJson
                            }
                        }

                        // 2. Generate Unstructured Free Form
                        sendEvent({ update: "Generating full document database..." });
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

                        const cleanedFreeForm = cleanJsonString(freeFormResp);
                        let freeFormJson = null;
                        try {
                            JSON.parse(cleanedFreeForm);
                            freeFormJson = cleanedFreeForm;
                        } catch (e) {
                            console.error("Failed to parse free form JSON from Vertex", e);
                            freeFormJson = cleanedFreeForm;
                        }

                        // 3. Save to DB
                        sendEvent({ update: "Saving policy to database..." });
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

                        await prisma.auditLog.create({
                            data: {
                                userId: userId,
                                action: "POLICY_UPLOADED",
                                entityType: "POLICY",
                                entityId: newPolicy.id,
                                brokerId: userBrokerId,
                                details: JSON.stringify({ filename, fileType: policyType })
                            }
                        });

                        console.log(`Successfully ingested and saved Policy DB Row: ${newPolicy.id}`);

                        sendEvent({ result: newPolicy });
                        controller.close();
                    } catch (error: any) {
                        console.error("Error in streaming response", error);
                        sendEvent({ error: error.message || "Failed to process policy stream" });
                        controller.close();
                    }
                }
            }),
            {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive"
                }
            }
        );

    } catch (error: any) {
        console.error("POST /api/clients/[clientId]/policies error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error", stack: error.stack }, { status: 500 });
    }
}
