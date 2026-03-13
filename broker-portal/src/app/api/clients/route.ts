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

        if (!decodedToken.role || !decodedToken.brokerId) {
            return NextResponse.json({ error: "Forbidden: No Role or missing Broker assignment" }, { status: 403 });
        }

        // RBAC: Agents can only see clients assigned to them
        const whereClause: any = {
            brokerId: decodedToken.brokerId
        };
        
        if (decodedToken.role === 'agent') {
            whereClause.agentId = decodedToken.uid;
        }

        const clients = await prisma.client.findMany({
            where: whereClause,
            include: {
                policies: true,
                broker: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Parse SQLite string-arrays back to JSON arrays
        const cleanedClients = clients.map((client: any) => ({
            ...client,
            authorizedDomains: client.authorizedDomains ? client.authorizedDomains.split(',') : [],
            broker: {
                ...client.broker,
                brokerAdminIds: client.broker.brokerAdminIds ? client.broker.brokerAdminIds.split(',') : [],
            }
        }));

        return NextResponse.json(cleanedClients);

    } catch (error) {
        console.error("GET /api/clients error:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function POST(request: Request) {
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

        const body = await request.json();
        const { 
            name, 
            authorizedDomains, 
            primaryEmail,
            managedAuto = true,
            managedGL = true,
            managedUmb = true,
            managedWC = true,
            agentId
        } = body;
        const brokerId = decodedToken.brokerId; // System-derived

        let finalAgentId = agentId || decodedToken.uid;
        if (decodedToken.role === 'agent') {
            finalAgentId = decodedToken.uid;
        }

        if (!name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

        // Uniqueness Validation
        const existingClients = await prisma.client.findMany({
            where: { brokerId }
        });

        const nameExists = existingClients.some((c: any) => c.name.toLowerCase() === name.toLowerCase());
        if (nameExists) {
            return NextResponse.json({ error: "A client with this name already exists." }, { status: 409 });
        }

        // Check domain overlaps
        for (const c of existingClients) {
            if (!c.authorizedDomains) continue;
            const existingDoms = c.authorizedDomains.split(',');
            for (const newDom of validatedDomains) {
                if (existingDoms.includes(newDom)) {
                    return NextResponse.json({ error: `Domain ${newDom} is already registered to client: ${c.name}` }, { status: 409 });
                }
            }
        }

        const newClient = await prisma.client.create({
            data: {
                name,
                brokerId,
                authorizedDomains: validatedDomains.join(','),
                primaryEmail,
                managedAuto,
                managedGL,
                managedUmb,
                managedWC,
                updatedById: decodedToken.uid,
                agentId: finalAgentId || null
            }
        });

        // Parse string back out for API response safety
        const parsedClient = {
            ...newClient,
            authorizedDomains: newClient.authorizedDomains ? newClient.authorizedDomains.split(',') : [],
        };

        // Log the creation
        await prisma.auditLog.create({
            data: {
                userId: decodedToken.uid,
                action: "CLIENT_CREATED",
                entityType: "CLIENT",
                entityId: newClient.id,
                brokerId: newClient.brokerId,
                details: JSON.stringify({ name: newClient.name })
            }
        });

        return NextResponse.json(parsedClient, { status: 201 });

    } catch (error) {
        console.error("POST /api/clients error:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
