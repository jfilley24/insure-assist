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

        // Only Broker Admins can manage the team
        if (decodedToken.role !== 'broker_admin') {
            return NextResponse.json({ error: "Forbidden: Broker Admins only" }, { status: 403 });
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
