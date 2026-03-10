import { NextResponse } from "next/server";
import { getSecurePrisma } from "@/lib/db/prisma";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase-admin";

initAdmin();

export async function GET(
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

        // Fetch COI Requests for this client, including any associated communication logs
        const coiRequests = await (prisma as any).cOIRequest.findMany({
            where: {
                clientId: clientId
            },
            include: {
                communicationLogs: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ coiRequests });

    } catch (error: any) {
        console.error("Error fetching client history:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
