import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { prisma } from '@/lib/db/prisma';

initAdmin();

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);

        if (!decodedToken.brokerId || decodedToken.role !== 'broker_admin') {
            return NextResponse.json({ error: "Forbidden: Broker Admins only" }, { status: 403 });
        }

        const body = await request.json();
        const { email, firstName, lastName, role, password } = body;

        if (!email || !firstName || !role || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Ensure role is valid
        if (!['broker_admin', 'agent', 'assistant', 'csr'].includes(role)) {
            return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
        }

        const auth = getAuth();

        // 1. Create the Firebase User
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: `${firstName} ${lastName || ''}`.trim(),
        });

        // 2. Set Custom Claims exactly scoped to this tenant
        await auth.setCustomUserClaims(userRecord.uid, {
            role,
            brokerId: decodedToken.brokerId
        });

        // 3. Mirror the identity into our Postgres Shadow Table using Global Prisma
        const dbUser = await (prisma as any).user.create({
            data: {
                id: userRecord.uid,
                email,
                firstName,
                lastName: lastName || null,
                role,
                brokerId: decodedToken.brokerId,
                isActive: true
            }
        });

        return NextResponse.json({ success: true, user: dbUser }, { status: 201 });

    } catch (error: any) {
        console.error("Error inviting team member:", error);
        // Catch Firebase duplicates cleanly
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
