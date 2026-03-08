import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase-admin";

initAdmin();

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ clientId: string, policyId: string }> }
) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        const userBrokerId = decodedToken.brokerId;
        const userId = decodedToken.uid;

        if (!userBrokerId) {
            return NextResponse.json({ error: "Forbidden: Missing Broker assignment" }, { status: 403 });
        }

        const { clientId, policyId } = await params;
        const body = await request.json();
        const { acord_fields_json } = body;

        if (!acord_fields_json) {
            return NextResponse.json({ error: "Missing acord_fields_json payload" }, { status: 400 });
        }

        // Verify the client and policy ownership
        const policy = await prisma.policy.findFirst({
            where: {
                id: policyId,
                clientId: clientId,
                client: {
                    brokerId: userBrokerId
                }
            }
        });

        if (!policy) {
            return NextResponse.json({ error: "Policy not found or access denied" }, { status: 404 });
        }

        // Attempt to parse expiration date again in case the human edited it
        let expDate = policy.expirationDate;
        try {
            const parsed = JSON.parse(acord_fields_json);
            if (parsed.expiration_date) {
                expDate = new Date(parsed.expiration_date);
            }
        } catch {
            // Ignore parse errors for the specific date mapping
        }

        const updatedPolicy = await prisma.policy.update({
            where: { id: policyId },
            data: {
                acord_fields_json,
                expirationDate: expDate,
                updatedById: userId
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: userId,
                action: "POLICY_JSON_EDITED",
                entityType: "POLICY",
                entityId: policyId,
                brokerId: userBrokerId,
                details: JSON.stringify({ fileType: policy.fileType })
            }
        });

        return NextResponse.json(updatedPolicy, { status: 200 });

    } catch (error: any) {
        console.error(`PUT /api/clients/[clientId]/policies/[policyId] error:`, error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
