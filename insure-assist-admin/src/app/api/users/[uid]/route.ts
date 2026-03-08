import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function PUT(
    request: Request,
    props: { params: Promise<{ uid: string }> }
) {
    try {
        const { uid } = await props.params;
        const body = await request.json();
        const { email } = body;

        if (!uid || !email) {
            return NextResponse.json({ error: "Missing uid or email" }, { status: 400 });
        }

        const userRecord = await adminAuth.updateUser(uid, {
            email: email,
        });

        return NextResponse.json({ success: true, user: userRecord }, { status: 200 });
    } catch (error: any) {
        console.error(`PUT /api/users/[uid] error:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    props: { params: Promise<{ uid: string }> }
) {
    try {
        const { uid } = await props.params;

        if (!uid) {
            return NextResponse.json({ error: "Missing uid" }, { status: 400 });
        }

        await adminAuth.deleteUser(uid);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error(`DELETE /api/users/[uid] error:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
