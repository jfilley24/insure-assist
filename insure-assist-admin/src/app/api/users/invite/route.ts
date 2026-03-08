import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(request: Request) {
    try {
        const { email, displayName, role, brokerId } = await request.json();

        if (!email || !role) {
            return NextResponse.json(
                { error: "Email and Role are required." },
                { status: 400 }
            );
        }

        if ((role === "broker_admin" || role === "agent" || role === "assistant" || role === "csr") && !brokerId) {
            return NextResponse.json(
                { error: "A Broker ID must be provided to assign that role." },
                { status: 400 }
            );
        }

        // Attempt to create the user inside Firebase Auth securely
        // By doing this on the server with Firebase Admin, we bypass the disabled 
        // "Enable open client sign-ups" client-side limitation.
        let userRecord;
        try {
            userRecord = await adminAuth.createUser({
                email: email,
                emailVerified: false,
                displayName: displayName || undefined,
                password: Math.random().toString(36).slice(-8) // Generate secure arbitrary temp password, they will reset it via link
            });
        } catch (createError: any) {
            if (createError.code === 'auth/email-already-exists') {
                userRecord = await adminAuth.getUserByEmail(email);
            } else {
                throw createError;
            }
        }

        // Set the custom claims so the user is provisioned correctly from birth
        await adminAuth.setCustomUserClaims(userRecord.uid, {
            role: role,
            brokerId: brokerId || null,
        });

        // Generate the password reset link
        const actionCodeSettings = {
            // NOTE: During strictly local testing, we print this to the console.
            // For production, this points to your deployed website's login/action handler.
            url: "http://localhost:3000/auth/action",
            handleCodeInApp: false,
        };

        // We send a Password Reset email as the "Invite" mechanism.
        // They click it, define their password, and enter into their already-provisioned account.
        const inviteLink = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);

        return NextResponse.json({
            message: "Invite generated successfully",
            uid: userRecord.uid,
            inviteUrl: inviteLink // In production, plug into an email service like SendGrid
        });

    } catch (error: any) {
        console.error("Error creating invite:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create user invite." },
            { status: 500 }
        );
    }
}
