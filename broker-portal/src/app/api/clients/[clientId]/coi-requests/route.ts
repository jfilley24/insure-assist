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
        const client = await (prisma.client.findUnique as any)({
            where: { id: clientId },
            select: { 
                name: true,
                brokerId: true,
                managedAuto: true,
                managedGL: true,
                managedUmb: true,
                managedWC: true,
                agentId: true,
                broker: true // Fetch all broker fields dynamically
            }
        });

        if (!client) {
            return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 });
        }

        // RBAC: Agents can only generate COIs for clients assigned to them
        if (decodedToken.role === 'agent' && client.agentId !== decodedToken.uid) {
            return NextResponse.json({ error: "Forbidden: You are not assigned to this client" }, { status: 403 });
        }

        if (!client.agentId) {
            return NextResponse.json({ error: "Client must have an assigned Agent to generate a COI." }, { status: 400 });
        }

        const assignedAgent = await (prisma as any).user.findUnique({
            where: { id: client.agentId }
        });
        
        if (!assignedAgent) {
            return NextResponse.json({ error: "The assigned Agent could not be found." }, { status: 400 });
        }
        
        const brokerContactName = `${assignedAgent.firstName} ${assignedAgent.lastName || ''}`.trim();
        const brokerContactEmail = assignedAgent.email;

        const body = await request.json();
        const { gcsUri, source = "PORTAL", isManual, certificateHolderName, descriptionOfOperations } = body;

        let fileBuffer: Buffer | null = null;
        let bucketName = "";

        if (!isManual) {
            if (!gcsUri) {
                return NextResponse.json({ error: "Missing required gcsUri for request document." }, { status: 400 });
            }

            // 2. Fetch the file from GCS
            const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
            if (!match) {
                return NextResponse.json({ error: "Malformed GCS URI" }, { status: 400 });
            }
            bucketName = match[1];
            const objectPath = match[2];

            console.log(`Downloading request document from GCS: ${gcsUri}`);
            const storage = getStorage();
            const fileRef = storage.bucket(bucketName).file(objectPath);
            const [downloadedBuffer] = await fileRef.download();
            fileBuffer = downloadedBuffer;
        } else {
            // Need bucketName for uploading the output later
            // For preview/manual, we may not have a bucket name if the environment isn't strictly set up.
            const dummyBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ""; 
            bucketName = dummyBucket;
        }

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
        
        if (!isManual && fileBuffer) {
            console.log("Creating Blob from PDF...");
            const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' });
            formData.append("request_pdf", blob, "request.pdf");
        } else if (isManual) {
            formData.append("certificate_holder_name", certificateHolderName || "Unknown");
            formData.append("description_of_operations", descriptionOfOperations || "");
        }
        
        formData.append("policies_json", JSON.stringify(policyDataPayload));
        
        const clientSettingsPayload = {
            managedAuto: client.managedAuto,
            managedGL: client.managedGL,
            managedUmb: client.managedUmb,
            managedWC: client.managedWC,
            clientName: client.name,
            brokerName: client.broker?.name,
            brokerAddress: client.broker?.addressLine1,
            brokerCity: client.broker?.city,
            brokerState: client.broker?.state,
            brokerZip: client.broker?.postalCode,
            brokerPhone: client.broker?.phoneNumber,
            brokerFax: client.broker?.faxNumber,
            brokerContactName: brokerContactName,
            brokerContactEmail: brokerContactEmail
        };
        formData.append("client_settings_json", JSON.stringify(clientSettingsPayload));

        const baseEngineUrl = process.env.ACORD_ENGINE_URL || "http://127.0.0.1:8000";
        const fastApiUrl = isManual ? `${baseEngineUrl}/generate-coi-manual` : `${baseEngineUrl}/generate-coi`;
        console.log(`Fetching FASTAPI at ${fastApiUrl}...`);

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

        // 5. Upload Generated PDF back to GCS (Even if it failed review)
        let generatedPdfUri = null;
        if (pdf_base64 && bucketName && source !== "PORTAL_PREVIEW") {
            try {
                const outputFileName = `generated_coi_${Date.now()}.pdf`;
                const outputObjectPath = `policies/${decodedToken.brokerId}/${clientId}/coi_outputs/${outputFileName}`;
                const storage = getStorage();
                const outputFileRef = storage.bucket(bucketName).file(outputObjectPath);

                const fileBytes = Buffer.from(pdf_base64, 'base64');
                await outputFileRef.save(fileBytes, {
                    contentType: 'application/pdf',
                    metadata: {
                        cacheControl: 'public, max-age=31536000',
                    }
                });
                generatedPdfUri = `gs://${bucketName}/${outputObjectPath}`;
            } catch (storageErr) {
                console.warn("Could not save to GCS (bucket may not exist). Proceeding with base64 only.", storageErr);
            }
        }

        if (source === "PORTAL_PREVIEW") {
            console.log("7. Returning ephemeral PDF base64 for preview");
            return NextResponse.json({ 
                status, 
                pdf_base64 
            }, { status: 200 });
        }

        // 6. Create Database Record
        console.log("6. Creating DB Record");
        const coiRequest = await (prisma as any).cOIRequest.create({
            data: {
                clientId,
                brokerId: client.brokerId,
                source: source,
                requestedBy: isManual ? certificateHolderName : (decodedToken.name || decodedToken.email || "Unknown Requestor"),
                requestorId: decodedToken.uid,
                requestDocumentUri: isManual ? null : gcsUri,
                demandsJson: JSON.stringify(demands),
                status,
                reviewReport: JSON.stringify(policy_reviews),
                generatedPdfUri
            }
        });

        await (prisma as any).auditLog.create({
            data: {
                userId: decodedToken.uid,
                action: "COI_GENERATED",
                entityType: "COI_REQUEST",
                entityId: coiRequest.id,
                brokerId: decodedToken.brokerId,
                details: JSON.stringify({ status })
            }
        });

        console.log("7. Complete DB Record!");
        return NextResponse.json({
            ...coiRequest,
            pdfBase64: pdf_base64 
        }, { status: 201 });

    } catch (error: any) {
        console.error("========== CRASH TRACE ==========");
        console.error("Error processing COI Request:", error);
        console.error("Stack:", error.stack);
        console.error("=================================");
        return NextResponse.json({ error: `CRASH TRACE: ${error.message || String(error)}` }, { status: 500 });
    }
}
