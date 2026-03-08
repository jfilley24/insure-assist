import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, ingestionDomain, brokerAdminIds } = body;

        if (!name || !ingestionDomain) {
            return NextResponse.json({ error: "Missing required fields: name, ingestionDomain" }, { status: 400 });
        }

        // Ensure Domain uniqueness globally
        const existingDomain = await prisma.broker.findUnique({
            where: { ingestionDomain }
        });

        if (existingDomain) {
            return NextResponse.json({ error: "Broker with this ingestionDomain already exists." }, { status: 409 });
        }

        const newBroker = await prisma.broker.create({
            data: {
                name,
                ingestionDomain,
                brokerAdminIds: brokerAdminIds || ""
            }
        });

        return NextResponse.json(newBroker, { status: 201 });

    } catch (error: any) {
        console.error("POST /api/brokers error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const brokers = await prisma.broker.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ brokers });
    } catch (error: any) {
        console.error("GET /api/brokers error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
