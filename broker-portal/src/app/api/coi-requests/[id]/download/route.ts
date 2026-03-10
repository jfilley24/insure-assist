import { NextResponse } from "next/server";
import { getSecurePrisma } from "@/lib/db/prisma";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { initAdmin } from "@/lib/firebase-admin";

initAdmin();

export async function GET(
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

        // 1. Verify Request Ownership via Prisma Extension & Client relation
        const coiRequest = await (prisma as any).cOIRequest.findUnique({
            where: { id: id },
            include: {
                client: true
            }
        });

        if (!coiRequest || !coiRequest.generatedPdfUri) {
            return NextResponse.json({ error: "COI Request or PDF not found" }, { status: 404 });
        }

        // The secure prisma client automatically enforced that the client belongs to the broker
        // but we can double check defensively
        if (coiRequest.client.brokerId !== decodedToken.brokerId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 2. Proxy the raw file Data instead of signing a URL
        // Format gs://bucket/path/to/file.pdf
        const match = coiRequest.generatedPdfUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
        if (!match) {
            return NextResponse.json({ error: "Malformed GCS URI" }, { status: 500 });
        }

        const bucketName = match[1];
        const objectPath = match[2];

        const storage = getStorage();
        const fileRef = storage.bucket(bucketName).file(objectPath);

        const [fileContents] = await fileRef.download(); // Returns a Buffer array

        return new NextResponse(fileContents as any, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="coi_document.pdf"`,
            },
        });

    } catch (error: any) {
        console.error("========== DOWNLOAD CRASH ==========");
        console.error("Error generating download URL:", error);
        console.error("Stack:", error.stack);
        console.error("====================================");
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
