import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const listUsersResult = await adminAuth.listUsers(1000);

        const users = listUsersResult.users.map((userRecord) => ({
            uid: userRecord.uid,
            email: userRecord.email,
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
            customClaims: userRecord.customClaims || {},
        }));

        return NextResponse.json({ users });
    } catch (error: any) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
