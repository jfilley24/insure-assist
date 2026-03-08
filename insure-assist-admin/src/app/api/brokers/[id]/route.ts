import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PUT(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        if (!id) {
            return NextResponse.json({ error: "Missing broker ID parameter" }, { status: 400 });
        }

        const body = await request.json();
        const { name, ingestionDomain, isActive } = body;

        // Perform basic validations if they sent the payload
        if (name !== undefined && (!name || name.trim() === '')) {
            return NextResponse.json({ error: "Broker name cannot be empty." }, { status: 400 });
        }

        if (ingestionDomain !== undefined) {
            const existingDomain = await prisma.broker.findUnique({
                where: { ingestionDomain }
            });

            // Ensure we don't accidentally let a domain be taken over if it's assigned to a DIFFERENT active broker.
            if (existingDomain && existingDomain.id !== id) {
                return NextResponse.json({ error: "Ingestion Domain is already bound to another tenant." }, { status: 409 });
            }
        }

        const updatedBroker = await prisma.broker.update({
            where: { id },
            data: {
                name,
                ingestionDomain,
                isActive: typeof isActive === 'boolean' ? isActive : undefined // maintain current if not supplied
            }
        });

        return NextResponse.json(updatedBroker, { status: 200 });

    } catch (error: any) {
        console.error(`PUT /api/brokers/[id] error:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        if (!id) {
            return NextResponse.json({ error: "Missing broker ID parameter" }, { status: 400 });
        }

        const broker = await prisma.broker.findUnique({ where: { id } });

        if (!broker) {
            return NextResponse.json({ error: "Broker Not Found." }, { status: 404 });
        }

        if (broker.isActive) {
            return NextResponse.json({ error: "Active brokerages cannot be deleted. You must deactivate the tenant before permanent deletion." }, { status: 400 });
        }

        await prisma.broker.delete({
            where: { id }
        });

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error(`DELETE /api/brokers/[id] error:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
