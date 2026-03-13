import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase-admin";

initAdmin();

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);

        if (!decodedToken.role || !decodedToken.brokerId) {
            return NextResponse.json({ error: "Forbidden: No Role or missing Broker assignment" }, { status: 403 });
        }

        const brokerId = decodedToken.brokerId;
        const now = new Date();

        // Helpers for evaluating missing JSON fields (mirrors frontend PolicyManager logic)
        const isFieldConfirmedEmpty = (val: any) => typeof val === 'string' && val.endsWith('_CONFIRMED_EMPTY');
        const isFieldEmpty = (val: any) => {
            if (isFieldConfirmedEmpty(val)) return false;
            const strVal = String(val).trim().toLowerCase();
            return val === null || val === undefined || val === "" || strVal === "null" || strVal === "none" || strVal === "n/a";
        };

        const clientWhereClause: any = {
            brokerId: brokerId
        };
        
        if (decodedToken.role === 'agent') {
            clientWhereClause.agentId = decodedToken.uid;
        }

        // CORE BUSINESS RULE: Only evaluate the single most recently uploaded policy for a given client + module type.
        const allLatestPolicies = await prisma.policy.findMany({
            where: {
                client: clientWhereClause,
                fileType: {
                    not: "UNPROCESSED" // Don't alert on policies that are still actively extracting
                }
            },
            distinct: ['clientId', 'fileType'], // Get the first record for each combination
            orderBy: {
                uploadedAt: 'desc' // Ensure the 'first' record is the absolute newest one
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        const expiredPolicies: any[] = [];
        const reviewPolicies: any[] = [];

        // Single pass over the latest active portfolio
        for (const policy of allLatestPolicies) {
            // 1. Expiration Check
            if (policy.expirationDate && policy.expirationDate < now) {
                expiredPolicies.push(policy);
            }

            // 2. Missing/Review Check
            let missingFieldsCount = 0;
            if (policy.acord_fields_json) {
                try {
                    const parsed = JSON.parse(policy.acord_fields_json);
                    for (const val of Object.values(parsed)) {
                        if (isFieldEmpty(val)) {
                            missingFieldsCount++;
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse acord_fields_json for policy:", policy.id);
                }
            }

            if (missingFieldsCount > 0) {
                reviewPolicies.push({
                    ...policy,
                    missingFieldsCount
                });
            }
        }

        // Sort them before returning
        expiredPolicies.sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());
        reviewPolicies.sort((a, b) => b.missingFieldsCount - a.missingFieldsCount); // Most missing fields at top

        // 3. Recent COI Requests
        const recentRequestWhereClause: any = {
            brokerId: brokerId
        };
        
        if (decodedToken.role === 'agent') {
            recentRequestWhereClause.client = {
                agentId: decodedToken.uid
            };
        }

        const recentRequests = await (prisma as any).cOIRequest.findMany({
            where: recentRequestWhereClause,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        });

        // 4. Metrics & Top Cards Data
        const totalClientsCount = await prisma.client.count({
            where: clientWhereClause
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const coisLast30DaysWhereClause: any = {
            brokerId: brokerId,
            createdAt: {
                gte: thirtyDaysAgo
            }
        };

        if (decodedToken.role === 'agent') {
            coisLast30DaysWhereClause.client = {
                agentId: decodedToken.uid
            };
        }

        const coisLast30Days = await (prisma as any).cOIRequest.findMany({
            where: coisLast30DaysWhereClause,
            select: {
                createdAt: true
            }
        });

        const coisGeneratedCount = coisLast30Days.length;

        // Group by day for the chart
        const dailyCounts: Record<string, number> = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dailyCounts[d.toISOString().split('T')[0]] = 0;
        }

        coisLast30Days.forEach((req: any) => {
            const dateStr = req.createdAt.toISOString().split('T')[0];
            if (dailyCounts[dateStr] !== undefined) {
                dailyCounts[dateStr]++;
            } else {
                dailyCounts[dateStr] = 1;
            }
        });

        const coisGeneratedDaily = Object.keys(dailyCounts).map(date => ({
            date,
            cois: dailyCounts[date]
        })).sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
            expiredPolicies: expiredPolicies.slice(0, 20),
            reviewPolicies: reviewPolicies.slice(0, 20),
            recentRequests: recentRequests,
            metrics: {
                totalClients: totalClientsCount,
                activePolicies: allLatestPolicies.length - expiredPolicies.length,
                expiredPolicies: expiredPolicies.length,
                reviewPolicies: reviewPolicies.length,
                coisGeneratedCount,
                coisGeneratedDaily
            }
        });

    } catch (error) {
        console.error("GET /api/dashboard error:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
