import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;

        if (!id) {
            return NextResponse.json({ error: "Missing broker ID" }, { status: 400 });
        }

        // For large scale production, user assignments should ideally be stored in PostgreSQL User tables synced via webhooks.
        // For MVP, we iterate the internal raw Auth list over batches, finding matching brokers.
        const listUsersResult = await adminAuth.listUsers(1000);

        const brokerUsers = listUsersResult.users.filter(u => u.customClaims?.brokerId === id).map(u => ({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || '',
            role: u.customClaims?.role || 'Unknown',
            createdAt: u.metadata.creationTime
        }));

        return NextResponse.json({ users: brokerUsers }, { status: 200 });

    } catch (error: any) {
        console.error(`GET /api/brokers/[id]/users error:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
