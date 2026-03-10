import { NextResponse } from "next/server";
import { getSecurePrisma } from "@/lib/db/prisma";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { initAdmin } from "@/lib/firebase-admin";

initAdmin();

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
        const decodedToken = await getAuth().verifyIdToken(token);

        if (!decodedToken.brokerId) {
            return NextResponse.json({ error: "Forbidden: Missing Broker assignment" }, { status: 403 });
        }

        const { clientId } = await params;
        const prisma = getSecurePrisma(decodedToken);

        // 1. Verify Client Ownership using secure Prisma extension
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 });
        }

        const body = await request.json();
        const { gcsUri, source = "PORTAL", requestedBy = "" } = body;

        if (!gcsUri) {
            return NextResponse.json({ error: "Missing required gcsUri for request document." }, { status: 400 });
        }

        // 2. Fetch the file from GCS
        // Format gs://bucket/path/to/file.pdf -> bucket, path/to/file.pdf
        const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
        if (!match) {
            return NextResponse.json({ error: "Malformed GCS URI" }, { status: 400 });
        }
        const bucketName = match[1];
        const objectPath = match[2];

        console.log(`Downloading request document from GCS: ${gcsUri}`);
        const storage = getStorage();
        const fileRef = storage.bucket(bucketName).file(objectPath);
        const [fileBuffer] = await fileRef.download();

        // 3. Fetch Client Policies
        // Active policies
        const policies = await prisma.policy.findMany({
            where: { clientId: clientId },
            orderBy: { uploadedAt: 'desc' }
        });

        // Get latest distinct by type
        const latestPolicies = policies.reduce((acc, policy) => {
            if (!acc[policy.fileType]) {
                acc[policy.fileType] = policy;
            }
            return acc;
        }, {} as Record<string, any>);

        const policyDataPayload = {
            auto: latestPolicies["AUTO"]?.acord_fields_json ? JSON.parse(latestPolicies["AUTO"].acord_fields_json) : {},
            gl: latestPolicies["GL"]?.acord_fields_json ? JSON.parse(latestPolicies["GL"].acord_fields_json) : {},
            umbrella: latestPolicies["UMBRELLA"]?.acord_fields_json ? JSON.parse(latestPolicies["UMBRELLA"].acord_fields_json) : {},
            wc: latestPolicies["WC"]?.acord_fields_json ? JSON.parse(latestPolicies["WC"].acord_fields_json) : {},
        };

        // 4. Send to FastAPI Microservice
        console.log("4. Dispatching to FastAPI Engine...");
        const formData = new FormData();
        console.log("Creating Blob...");
        const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' });
        formData.append("request_pdf", blob, "request.pdf");
        formData.append("policies_json", JSON.stringify(policyDataPayload));

        const fastApiUrl = process.env.ACORD_ENGINE_URL || "http://127.0.0.1:8000/generate-coi";
        console.log("Fetching FASTAPI...");

        const fastApiResponse = await fetch(fastApiUrl, {
            method: "POST",
            body: formData
        });

        if (!fastApiResponse.ok) {
            const err = await fastApiResponse.text();
            console.error("FastAPI Error Responses:", err);
            return NextResponse.json({ error: `Generation Engine Failed: ${err}` }, { status: 500 });
        }

        console.log("Parsing FastAPI response...");
        const responseData = await fastApiResponse.json();
        const { demands, status, policy_reviews, pdf_base64 } = responseData;
        console.log("5. Uploading Generated PDF back to GCS...");

        // 5. Upload Generated PDF back to GCS ONLY if the review didn't fail
        let generatedPdfUri = null;
        if (pdf_base64 && status === "PASSED") {
            const outputFileName = `generated_coi_${Date.now()}.pdf`;
            const outputObjectPath = `policies/${decodedToken.brokerId}/${clientId}/coi_outputs/${outputFileName}`;
            const outputFileRef = storage.bucket(bucketName).file(outputObjectPath);

            const fileBytes = Buffer.from(pdf_base64, 'base64');
            await outputFileRef.save(fileBytes, {
                contentType: 'application/pdf',
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                }
            });
            generatedPdfUri = `gs://${bucketName}/${outputObjectPath}`;
        }

        // 6. Create Database Record
        console.log("6. Creating DB Record");
        const coiRequest = await (prisma as any).cOIRequest.create({
            data: {
                clientId,
                source,
                requestedBy,
                requestDocumentUri: gcsUri,
                demandsJson: JSON.stringify(demands),
                status,
                reviewReport: JSON.stringify(policy_reviews),
                generatedPdfUri
            }
        });

        console.log("7. Complete DB Record!");
        return NextResponse.json(coiRequest, { status: 201 });

    } catch (error: any) {
        console.error("========== CRASH TRACE ==========");
        console.error("Error processing COI Request:", error);
        console.error("Stack:", error.stack);
        console.error("=================================");
        return NextResponse.json({ error: `CRASH TRACE: ${error.message || String(error)}` }, { status: 500 });
    }
}
