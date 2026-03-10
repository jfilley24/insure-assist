"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CopyPlus, Clock, ShieldCheck, Files, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [expiredPolicies, setExpiredPolicies] = useState<any[]>([]);
    const [reviewPolicies, setReviewPolicies] = useState<any[]>([]);
    const [recentRequests, setRecentRequests] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        async function fetchDashboard() {
            try {
                const token = await user?.getIdToken();
                if (!token) return;

                const response = await fetch('/api/dashboard', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setExpiredPolicies(data.expiredPolicies || []);
                    setReviewPolicies(data.reviewPolicies || []);
                    setRecentRequests(data.recentRequests || []);
                    setMetrics(data.metrics || null);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchDashboard();
    }, [user]);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-slate-500 mt-1">Manage policies, clients, and generate ACORD certificates.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-white">
                        <Clock className="h-4 w-4 mr-2" /> Recent Activity
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <CopyPlus className="h-4 w-4 mr-2" /> New COI
                    </Button>
                </div>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Clients</CardTitle>
                        <UsersIcon className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{isLoading || !metrics ? "-" : metrics.totalClients}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Active Policies</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{isLoading || !metrics ? "-" : metrics.activePolicies}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Policies Needing Review</CardTitle>
                        <InboxIcon className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{isLoading || !metrics ? "-" : metrics.reviewPolicies}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Expired Policies</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{isLoading || !metrics ? "-" : metrics.expiredPolicies}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Chart and Usage Grid */}
            {!isLoading && metrics && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Activity Chart */}
                    <Card className="shadow-sm border-slate-200 lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-slate-800">COI Generation Activity (30 Days)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={{ cois: { label: "COIs", color: "#2563eb" } }} className="h-[200px] w-full">
                                <AreaChart data={metrics.coisGeneratedDaily} margin={{ left: 12, right: 12, top: 12 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => {
                                            const date = new Date(value);
                                            // Handle timezone diff mapping cleanly
                                            return date.getUTCDate() === 1 ? date.toLocaleDateString("en-US", { month: "short", timeZone: 'UTC' }) : date.toLocaleDateString("en-US", { day: "numeric", timeZone: 'UTC' });
                                        }}
                                    />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                                    <Area
                                        dataKey="cois"
                                        type="natural"
                                        fill="var(--color-cois)"
                                        fillOpacity={0.4}
                                        stroke="var(--color-cois)"
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Subscription Tracker */}
                    <Card className="shadow-sm border-slate-200 flex flex-col justify-center">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-slate-800">Current Plan Usage</CardTitle>
                            <p className="text-sm text-slate-500">Billing cycle ends in 12 days</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-end justify-between border-b pb-4">
                                <div className="text-4xl font-bold text-slate-900">{metrics.coisGeneratedCount}</div>
                                <div className="text-sm font-medium text-slate-500 mb-1">/ 200 included</div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full ${metrics.coisGeneratedCount >= 200 ? 'bg-red-500' : metrics.coisGeneratedCount >= 160 ? 'bg-amber-500' : 'bg-blue-600'}`}
                                    style={{ width: `${Math.min((metrics.coisGeneratedCount / 200) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-slate-500">
                                {metrics.coisGeneratedCount >= 200
                                    ? "You have exceeded your plan limits. Overage fees apply."
                                    : `${200 - metrics.coisGeneratedCount} fast generations remaining`}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Needs Review Widget */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <InboxIcon className="h-5 w-5 text-amber-500" />
                                Policies Needing Review
                            </CardTitle>
                            {!isLoading && reviewPolicies.length > 0 && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                                    {reviewPolicies.length} Pending
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-8 text-center text-slate-500 text-sm animate-pulse">Loading review queue...</div>
                        ) : reviewPolicies.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">All active policies are fully reviewed and confirmed!</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Client</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Missing Fields</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reviewPolicies.map((policy) => (
                                        <TableRow
                                            key={policy.id}
                                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => router.push(`/dashboard/clients/${policy.client.id}`)}
                                        >
                                            <TableCell className="font-medium text-slate-900">{policy.client.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 font-mono text-xs">
                                                    {policy.fileType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-amber-600 font-medium text-sm flex items-center gap-1.5">
                                                <AlertTriangle className="h-3 w-3" />
                                                {policy.missingFieldsCount} empty
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Expired Policies Widget */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                Expired Policies
                            </CardTitle>
                            {!isLoading && expiredPolicies.length > 0 && (
                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-none">
                                    {expiredPolicies.length} Action Needed
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-8 text-center text-slate-500 text-sm animate-pulse">Loading expired policies...</div>
                        ) : expiredPolicies.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">No expired policies found. You're all caught up!</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Client</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Expiration</TableHead>
                                        <TableHead>Past Due</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expiredPolicies.map((policy) => (
                                        <TableRow
                                            key={policy.id}
                                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => router.push(`/dashboard/clients/${policy.client.id}`)}
                                        >
                                            <TableCell className="font-medium text-slate-900">{policy.client.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 font-mono text-xs">
                                                    {policy.fileType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-600">
                                                {new Date(policy.expirationDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-red-600 font-medium text-sm">
                                                {formatDistanceToNow(new Date(policy.expirationDate))} ago
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent COI Requests Widget (Full Width) */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Recent COI Requests
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500 text-sm animate-pulse">Loading recent requests...</div>
                    ) : recentRequests.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No COI requests found across your portfolio.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Client</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentRequests.map((req: any) => (
                                    <TableRow
                                        key={req.id}
                                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => router.push(`/dashboard/clients/${req.client.id}`)}
                                    >
                                        <TableCell className="font-medium text-slate-900">{req.client?.name || "Unknown"}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-slate-600 font-mono text-xs">
                                                {req.source}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {req.requestedBy || "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={req.status === 'PASSED' ? 'default' : req.status === 'FAILED' ? 'destructive' : 'secondary'}
                                                className={req.status === 'PASSED' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none' :
                                                    req.status === 'FAILED' ? 'bg-red-100 text-red-700 hover:bg-red-100 border-none' :
                                                        'bg-amber-100 text-amber-700 hover:bg-amber-100 border-none'}
                                            >
                                                {req.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                                            {formatDistanceToNow(new Date(req.createdAt))} ago
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}

function InboxIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
    )
}
