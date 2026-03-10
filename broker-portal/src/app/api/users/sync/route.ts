import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const admin = initAdmin();
        const decodedToken = await admin.auth().verifyIdToken(token);

        const { uid, email, role, brokerId, name } = decodedToken;

        // Use provided body names, fallback to Firebase standard name, fallback to email prefix
        const body = await request.json().catch(() => ({}));
        let firstName = body.firstName || '';
        let lastName = body.lastName || '';

        if (!firstName && !lastName && name) {
            const parts = name.split(' ');
            firstName = parts[0] || '';
            lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
        }

        if (!firstName) {
            firstName = email ? email.split('@')[0] : 'Unknown';
        }

        // Upsert the user into the database
        const user = await (prisma as any).user.upsert({
            where: { id: uid },
            update: {
                email: email || '',
                firstName,
                lastName: lastName || null,
                role: role || 'agent', // Default if custom claims are missing
                brokerId: brokerId || null,
                updatedAt: new Date()
            },
            create: {
                id: uid,
                email: email || '',
                firstName,
                lastName: lastName || null,
                role: role || 'agent',
                brokerId: brokerId || null,
                isActive: true
            }
        });

        return NextResponse.json({ success: true, user });

    } catch (error) {
        console.error('[User Sync Error]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
