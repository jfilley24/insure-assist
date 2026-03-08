import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
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

        if (!decodedToken.role || !decodedToken.brokerId) {
            return NextResponse.json({ error: "Forbidden: No Role or missing Broker assignment" }, { status: 403 });
        }

        // Await the params due to Next.js 15 layout changes
        const resolvedParams = await params;
        const clientId = resolvedParams.clientId;

        const client = await prisma.client.findFirst({
            where: {
                id: clientId,
                brokerId: decodedToken.brokerId
            },
            include: {
                policies: {
                    orderBy: {
                        uploadedAt: 'desc'
                    }
                },
                broker: true
            }
        });

        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        // Parse SQLite string-arrays back to JSON arrays
        const cleanedClient = {
            ...client,
            authorizedDomains: client.authorizedDomains ? client.authorizedDomains.split(',') : [],
            broker: {
                ...client.broker,
                brokerAdminIds: client.broker.brokerAdminIds ? client.broker.brokerAdminIds.split(',') : [],
            }
        };

        console.log("API ROUTE - SENDING POLICIES WITH KEYS:", cleanedClient.policies?.map((p: any) => Object.keys(p)));

        return NextResponse.json(cleanedClient);

    } catch (error) {
        console.error(`GET /api/clients/[clientId] error:`, error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function PUT(
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

        if (!['broker_admin', 'agent'].includes(decodedToken.role) || !decodedToken.brokerId) {
            return NextResponse.json({ error: "Forbidden: Insufficient Permissions or missing Broker assignment" }, { status: 403 });
        }

        const resolvedParams = await params;
        const clientId = resolvedParams.clientId;

        const body = await request.json();
        const { name, authorizedDomains } = body;

        if (!name) {
            return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
        }

        let validatedDomains: string[] = [];
        if (Array.isArray(authorizedDomains)) {
            const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
            for (const d of authorizedDomains) {
                if (!domainRegex.test(d)) {
                    return NextResponse.json({ error: `Invalid domain format provided: ${d}` }, { status: 400 });
                }
                validatedDomains.push(d);
            }
        }

        // Fetch current client to get its brokerId
        const currentClient = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!currentClient || currentClient.brokerId !== decodedToken.brokerId) {
            return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 });
        }

        // Uniqueness Validation
        const existingClients = await prisma.client.findMany({
            where: {
                brokerId: currentClient.brokerId,
                id: { not: clientId } // exclude self
            }
        });

        const nameExists = existingClients.some((c: any) => c.name.toLowerCase() === name.toLowerCase());
        if (nameExists) {
            return NextResponse.json({ error: "Another client with this name already exists." }, { status: 409 });
        }

        for (const c of existingClients) {
            if (!c.authorizedDomains) continue;
            const existingDoms = c.authorizedDomains.split(',');
            for (const newDom of validatedDomains) {
                if (existingDoms.includes(newDom)) {
                    return NextResponse.json({ error: `Domain ${newDom} is already registered to client: ${c.name}` }, { status: 409 });
                }
            }
        }

        const updatedClient = await prisma.client.update({
            where: { id: clientId },
            data: {
                name,
                authorizedDomains: validatedDomains.join(','),
                updatedById: decodedToken.uid
            }
        });

        // Log the update
        await prisma.auditLog.create({
            data: {
                userId: decodedToken.uid,
                action: "CLIENT_UPDATED",
                entityType: "CLIENT",
                entityId: updatedClient.id,
                brokerId: updatedClient.brokerId,
                details: JSON.stringify({ name: updatedClient.name })
            }
        });

        return NextResponse.json(updatedClient, { status: 200 });

    } catch (error) {
        console.error("PUT /api/clients/[clientId] error:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function DELETE(
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

        if (!['broker_admin', 'agent'].includes(decodedToken.role) || !decodedToken.brokerId) {
            return NextResponse.json({ error: "Forbidden: Insufficient Permissions or missing Broker assignment" }, { status: 403 });
        }

        const resolvedParams = await params;
        const clientId = resolvedParams.clientId;

        // Verify ownership before delete
        const targetClient = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!targetClient || targetClient.brokerId !== decodedToken.brokerId) {
            return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 });
        }

        const deletedClient = await prisma.client.delete({
            where: { id: clientId }
        });

        await prisma.auditLog.create({
            data: {
                userId: decodedToken.uid,
                action: "CLIENT_DELETED",
                entityType: "CLIENT",
                entityId: deletedClient.id,
                brokerId: deletedClient.brokerId,
                details: JSON.stringify({ name: deletedClient.name })
            }
        });

        return NextResponse.json({ message: "Client deleted successfully" }, { status: 200 });

    } catch (error) {
        console.error("DELETE /api/clients/[clientId] error:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
