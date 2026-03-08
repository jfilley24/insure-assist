import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
    try {
        // Since this is a highly destructive system initialization endpoint inside the core API, 
        // we lock it behind a strict secret that we pass from the local insure-assist-admin fetch
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.SUPER_ADMIN_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized Super Admin Access" }, { status: 403 });
        }

        const body = await request.json();
        const { name, ingestionDomain, brokerAdminIds } = body;

        if (!name || !ingestionDomain || !brokerAdminIds) {
            return NextResponse.json({ error: "Missing required fields: name, ingestionDomain, brokerAdminIds" }, { status: 400 });
        }

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
                brokerAdminIds
            }
        });

        return NextResponse.json(newBroker, { status: 201 });

    } catch (error: any) {
        console.error("POST /api/admin/brokers error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.SUPER_ADMIN_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized Super Admin Access" }, { status: 403 });
        }

        const brokers = await prisma.broker.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ brokers });
    } catch (error: any) {
        console.error("GET /api/admin/brokers error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
