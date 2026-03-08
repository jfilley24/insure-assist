import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase-admin";

// Initialize Firebase Admin (safe to call multiple times)
initAdmin();

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);

        console.log("DEBUG: decodedToken.brokerId =", decodedToken.brokerId);

        if (!decodedToken.brokerId) {
            console.log("DEBUG: Failing because no brokerId on token.");
            return NextResponse.json({ error: "Forbidden: Missing Broker assignment" }, { status: 403 });
        }

        const broker = await prisma.broker.findUnique({
            where: {
                id: decodedToken.brokerId
            },
            select: {
                id: true,
                isActive: true
            }
        });

        console.log("DEBUG: Found broker in DB:", broker);

        if (!broker) {
            return NextResponse.json({ error: "Broker not found", isActive: false }, { status: 404 });
        }

        return NextResponse.json({ isActive: broker.isActive });

    } catch (error) {
        console.error("GET /api/brokers/me error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
