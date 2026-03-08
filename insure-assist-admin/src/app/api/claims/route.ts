import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const { uid, role, brokerId } = await request.json();

        if (!uid || !role) {
            return NextResponse.json({ error: "Missing uid or role parameters." }, { status: 400 });
        }

        // Assign the custom claims explicitly grouping role & brokerId natively inside the JWT
        const claims: any = { role };
        if (brokerId) claims.brokerId = brokerId;

        await adminAuth.setCustomUserClaims(uid, claims);

        return NextResponse.json({ success: true, message: `Successfully assigned role '${role}' to user ${uid}` });
    } catch (error: any) {
        console.error('Error setting custom claims:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
