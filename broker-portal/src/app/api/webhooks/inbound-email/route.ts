import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
    try {
        // NOTE: In a real implementation setup, we would validate the provider signature here
        // (e.g. SendGrid Event Webhook Signature, or CloudMailin basic auth)
        // to ensure the payload actually came from our email provider.

        // This assumes a generic parsed payload
        // E.g. SendGrid Inbound Parse posts a multipart/form-data payload
        const formData = await request.formData();

        // Example basic extraction depending on the provider format
        const fromEmail = formData.get("from")?.toString() || "";
        const subject = formData.get("subject")?.toString() || "";
        const text = formData.get("text")?.toString() || "";
        const attachments = formData.getAll("attachment"); // List of Files

        console.log(`Received Inbound Email Webhook from: ${fromEmail}`);

        // 1. Domain Matching Logic
        // Extract the domain from the sender's email
        const domainMatch = fromEmail.match(/@(.+)$/);
        if (!domainMatch) {
            return NextResponse.json({ error: "Could not parse domain from sender email." }, { status: 400 });
        }
        const senderDomain = domainMatch[1].toLowerCase();

        // Find the client that has this domain authorized
        // Note: SQLite/Prisma doesn't easily regex search comma-separated strings inside the DB query, 
        // so we find by partial text or pull and filter. In PostgreSQL, we could use an array field.
        const clients = await prisma.client.findMany({
            where: {
                authorizedDomains: {
                    contains: senderDomain
                }
            }
        });

        // Filter exact match since "contains" might match "testdomain.com" to "domain.com"
        const matchedClient = clients.find(c =>
            c.authorizedDomains.split(',').map(d => d.trim().toLowerCase()).includes(senderDomain)
        );

        if (!matchedClient) {
            console.log(`No authorized client found for domain: ${senderDomain}`);
            return NextResponse.json({ error: "No matching client for domain." }, { status: 404 });
        }

        // 2. Locate the Request Document Attachment
        let requestDocumentFile = null;
        for (const attachment of attachments) {
            if (attachment instanceof File && attachment.type === "application/pdf") {
                requestDocumentFile = attachment;
                break;
            }
        }

        if (!requestDocumentFile) {
            console.log(`No PDF attachment found in email from ${fromEmail}`);
            // Log it but do nothing else
            await prisma.communicationLog.create({
                data: {
                    clientId: matchedClient.id,
                    brokerId: matchedClient.brokerId,
                    type: "EMAIL_INBOUND",
                    from: fromEmail,
                    to: "acord25@system.com",
                    subject: subject,
                    body: "FAILED: No PDF Document Attached.\n\n" + text,
                }
            });
            return NextResponse.json({ status: "skipped - no pdf" }, { status: 200 });
        }

        // 3. To trigger the pipeline, we would typically either:
        // A) Call out to our FastAPI microservice here identically to `coi-requests/route.ts`
        // B) Push this to a queue (like Google Cloud Tasks) so it doesn't timeout the webhook
        // For the prototype architecture, we mock the handoff:

        console.log(`Valid Request PDF found for Client ${matchedClient.id}. Triggering Pipeline...`);

        const commLog = await prisma.communicationLog.create({
            data: {
                clientId: matchedClient.id,
                brokerId: matchedClient.brokerId,
                type: "EMAIL_INBOUND",
                from: fromEmail,
                to: "acord25@system.com",
                subject: subject,
                body: "PROCESSED ACORD GENERATION\n\n" + text,
            }
        });

        // Handoff logic to generate-coi microservice would go here...

        return NextResponse.json({ status: "processing", logId: commLog.id }, { status: 200 });

    } catch (error: any) {
        console.error("Error processing inbound email webhook:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
