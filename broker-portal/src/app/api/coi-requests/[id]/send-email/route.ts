import { NextResponse } from "next/server";
import { getSecurePrisma } from "@/lib/db/prisma";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase-admin";
// Depending on email provider (SendGrid, Postmark, etc.), import here.
// import sgMail from '@sendgrid/mail';

initAdmin();

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
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

        const { id } = await params;
        const prisma = getSecurePrisma(decodedToken);

        const coiRequest = await (prisma as any).cOIRequest.findUnique({
            where: { id },
            include: { client: true }
        });

        if (!coiRequest) {
            return NextResponse.json({ error: "COI Request not found or access denied" }, { status: 404 });
        }

        const body = await request.json();
        const { to, cc, subject, message } = body;

        if (!to) {
            return NextResponse.json({ error: "Missing required 'to' email address." }, { status: 400 });
        }

        // This is a placeholder for the actual email dispatch logic.
        // e.g. using SendGrid
        /*
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
        const msg = {
          to: to,
          cc: cc,
          from: `acord25@${coiRequest.client.authorizedDomains.split(',')[0] || 'insureassist.com'}`,
          subject: subject || `Certificate of Insurance - ${coiRequest.client.name}`,
          text: message || "Please find the requested COI attached.",
          // Attach the PDF by fetching from GCS and converting to base64, 
          // or sending the signed URL.
        };
        await sgMail.send(msg);
        */

        console.log(`Mock Dispatching Email to ${to} for COI Request ${id}`);

        // Persist the communication log
        const commLog = await (prisma as any).communicationLog.create({
            data: {
                coiRequestId: id,
                clientId: coiRequest.clientId,
                brokerId: coiRequest.brokerId,
                type: "EMAIL_OUTBOUND",
                subject: subject || `Certificate of Insurance - ${coiRequest.client.name}`,
                body: message || "Please find the requested COI attached.",
                to,
                cc,
                from: "system@insureassist.com" // Placeholder
            }
        });

        return NextResponse.json({ success: true, log: commLog }, { status: 200 });

    } catch (error: any) {
        console.error("Error dispatching COI email:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
