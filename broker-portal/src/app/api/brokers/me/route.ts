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
                isActive: true,
                name: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                postalCode: true,
                phoneNumber: true,
                faxNumber: true
            }
        });

        console.log("DEBUG: Found broker in DB:", broker);

        if (!broker) {
            return NextResponse.json({ error: "Broker not found", isActive: false }, { status: 404 });
        }

        return NextResponse.json(broker);

    } catch (error) {
        console.error("GET /api/brokers/me error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);

        if (!decodedToken.brokerId || decodedToken.role !== "broker_admin") {
            return NextResponse.json({ error: "Forbidden: Only Broker Admins can update settings" }, { status: 403 });
        }

        const body = await request.json();
        const { 
            name, 
            addressLine1, 
            addressLine2, 
            city, 
            state, 
            postalCode, 
            phoneNumber, 
            faxNumber 
        } = body;

        if (!name) {
            return NextResponse.json({ error: "Brokerage name is required" }, { status: 400 });
        }

        const updatedBroker = await prisma.broker.update({
            where: { id: decodedToken.brokerId },
            data: {
                name,
                addressLine1: addressLine1 ? addressLine1.trim() : null,
                addressLine2: addressLine2 ? addressLine2.trim() : null,
                city: city ? city.trim() : null,
                state: state ? state.trim() : null,
                postalCode: postalCode ? postalCode.trim() : null,
                phoneNumber: phoneNumber ? phoneNumber.trim() : null,
                faxNumber: faxNumber ? faxNumber.trim() : null,
            }
        });

        return NextResponse.json(updatedBroker, { status: 200 });

    } catch (error) {
        console.error("PUT /api/brokers/me error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
