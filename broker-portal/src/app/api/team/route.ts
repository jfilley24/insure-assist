import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getSecurePrisma } from '@/lib/db/prisma';
import { getAuth } from 'firebase-admin/auth';

initAdmin();

export async function GET(request: Request) {
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

        // Broker Admins and Agents can view the team (Agents need it to assign clients)
        if (!['broker_admin', 'agent'].includes(decodedToken.role)) {
            return NextResponse.json({ error: "Forbidden: Insufficient Permissions" }, { status: 403 });
        }

        const prisma = getSecurePrisma(decodedToken);
        const users = await (prisma as any).user.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(users);

    } catch (error) {
        console.error("Error fetching team:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
