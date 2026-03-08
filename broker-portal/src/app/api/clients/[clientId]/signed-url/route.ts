import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { initAdmin } from "@/lib/firebase-admin";
import crypto from "crypto";

initAdmin();

export async function POST(
    request: Request,
    context: any
) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(token);
        } catch (e: any) {
            return NextResponse.json({ error: `Invalid Token: ${e.message}` }, { status: 401 });
        }

        const userBrokerId = decodedToken.brokerId;
        if (!userBrokerId) {
            return NextResponse.json({ error: "Forbidden: Missing Broker assignment" }, { status: 403 });
        }

        // Context dynamic routing safely extracted (Next.js 15 requires awaiting params)
        const params = await context.params;
        const clientId = params.clientId;

        // Verify the client belongs to the user's broker
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { brokerId: true }
        });

        if (!client || client.brokerId !== userBrokerId) {
            return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 });
        }

        const body = await request.json();
        const { policyType, contentType } = body;

        if (!policyType || !contentType) {
            return NextResponse.json({ error: "Missing policyType or contentType" }, { status: 400 });
        }

        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();

        if (!bucketName) {
            console.error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set");
            return NextResponse.json({ error: "Storage configuration error" }, { status: 500 });
        }

        // Create a unique, isolated path for the file
        const fileUuid = crypto.randomUUID();
        const fileName = `${policyType}_${fileUuid}.pdf`;
        // Architecture Rule: policies/{brokerId}/{clientId}/filename.pdf
        const objectPath = `policies/${userBrokerId}/${clientId}/${fileName}`;

        // Generate the V4 Signed URL for uploading via IAM Credentials API (No JSON Key Required)
        // This is the Enterprise approach to bypass iam.disableServiceAccountKeyCreation

        // Enterprise Workload Identity: Unbreakable Pure-REST Math URL Generator
        // We completely bypass the @google-cloud/storage internal `getSignedUrl` because its internal 
        // identity dependency tree fails to map Application Default Credentials strictly inside Next.js Windows sandboxes.
        // Instead, we extract the pure JWT string organically and use standard HTTPS REST to perform the math.
        const serviceAccountEmail = "firebase-adminsdk-fbsvc@insure-assist-dev.iam.gserviceaccount.com";
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

        let url;
        try {
            const { GoogleAuth } = require('google-auth-library');
            const auth = new GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });

            const client = await auth.getClient();
            const tokenResponse = await client.getAccessToken();
            const accessToken = tokenResponse.token;

            if (!accessToken) {
                throw new Error("Unable to locate your Application Default Credentials.");
            }

            const method = 'PUT';
            const timestamp = Math.floor(Date.now() / 1000);
            const expiration = 5 * 60; // 5 min expiry
            const isoDate = new Date(timestamp * 1000).toISOString().replace(/[:-]|\.\d{3}/g, '');
            const dateStamp = isoDate.substring(0, 8);
            const credentialScope = `${dateStamp}/auto/storage/goog4_request`;
            const serviceAccountEmail = "firebase-adminsdk-fbsvc@insure-assist-dev.iam.gserviceaccount.com";

            const encodedObjectName = encodeURIComponent(objectPath).replace(/%2F/g, '/');
            const canonicalQueryString = [
                `X-Goog-Algorithm=GOOG4-RSA-SHA256`,
                `X-Goog-Credential=${encodeURIComponent(serviceAccountEmail + '/' + credentialScope)}`,
                `X-Goog-Date=${isoDate}`,
                `X-Goog-Expires=${expiration}`,
                `X-Goog-SignedHeaders=${encodeURIComponent('content-type;host')}`
            ].join('&');

            const canonicalRequest = [
                method,
                `/${bucketName}/${encodedObjectName}`,
                canonicalQueryString,
                `content-type:${contentType}\nhost:storage.googleapis.com\n`,
                'content-type;host',
                'UNSIGNED-PAYLOAD'
            ].join('\n');

            const crypto = require('crypto');
            const hash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
            const stringToSign = ['GOOG4-RSA-SHA256', isoDate, credentialScope, hash].join('\n');
            console.log("\n\n=== NEXTJS STRING TO SIGN ===");
            console.log(stringToSign);
            console.log("=== END NEXTJS STRING TO SIGN ===\n\n");

            const iamUrl = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:signBlob`;

            const iamRes = await fetch(iamUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ payload: Buffer.from(stringToSign).toString('base64') })
            });

            if (!iamRes.ok) {
                const errBody = await iamRes.text();
                throw new Error(`IAM REST API Rejected Signature: ${iamRes.status} ${errBody}`);
            }

            const data = await iamRes.json();
            const signatureHex = Buffer.from(data.signedBlob, 'base64').toString('hex');

            url = `https://storage.googleapis.com/${bucketName}/${encodedObjectName}?${canonicalQueryString}&X-Goog-Signature=${signatureHex}`;

        } catch (authError: any) {
            console.error("IAM REST Math Generator failed:", authError.message);
            if (authError.message?.includes("PermissionDenied") || authError.message?.includes("403")) {
                return NextResponse.json({
                    error: "IAM Permission Denied: Your admin user account must be granted the 'Service Account Token Creator' role."
                }, { status: 403 });
            }
            throw authError; // bubble up
        }

        const gcsUri = `gs://${bucketName}/${objectPath}`;

        return NextResponse.json({
            uploadUrl: url,
            gcsUri,
            fileUuid,
            objectPath
        });

    } catch (error: any) {
        console.error("POST /api/clients/[clientId]/signed-url error details:", error?.message, error?.stack);
        return NextResponse.json(
            {
                error: error?.message || "Internal Server Error",
                stack: error?.stack
            },
            { status: 500 }
        );
    }
}
