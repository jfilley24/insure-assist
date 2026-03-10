"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PolicyManager } from "./PolicyManager";
import { CoiRequestManager } from "./CoiRequestManager";
import { ClientHistoryTab } from "./ClientHistoryTab";

export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();

    // State
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const clientId = params.clientId as string;

    useEffect(() => {
        if (!token) return;

        const fetchClient = async () => {
            try {
                const res = await fetch(`/api/clients/${clientId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setClient(data);
                } else {
                    console.error("Failed to fetch client");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchClient();
    }, [clientId, token]);

    const fetchClientRefresh = async () => {
        if (!token) return;
        try {
            const res = await fetch(`/api/clients/${clientId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setClient(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return <div className="p-8 text-slate-500">Loading client data...</div>;
    }

    if (!client) {
        return <div className="p-8 text-red-500 text-lg">Client not found.</div>;
    }

    return (
        <div className="p-2 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/clients')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{client.name}</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {client.authorizedDomains?.length > 0 ? client.authorizedDomains.join(', ') : 'No trusted domains'}
                        </p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="requests" className="w-full">
                {/* Clean underline style tabs */}
                <TabsList variant="line" className="w-full justify-start h-auto p-0 border-b border-slate-200 mb-6 gap-6">
                    <TabsTrigger value="requests" className="px-1 py-3 text-base data-[state=active]:text-blue-600 data-[state=active]:after:bg-blue-600">
                        Requests & Communications
                    </TabsTrigger>
                    <TabsTrigger value="policies" className="px-1 py-3 text-base data-[state=active]:text-blue-600 data-[state=active]:after:bg-blue-600">
                        Policy Documents
                    </TabsTrigger>
                    <TabsTrigger value="acord-rules" className="px-1 py-3 text-base data-[state=active]:text-blue-600 data-[state=active]:after:bg-blue-600">
                        ACORD Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="policies" className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Auto Policy Card */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        Auto Policy
                                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">25</span>
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 p-0">
                                <PolicyManager
                                    policyType="AUTO"
                                    clientId={client.id}
                                    existingPolicy={client.policies?.find((p: any) => p.fileType === "AUTO")}
                                    onRefresh={fetchClientRefresh}
                                />
                            </CardContent>
                        </Card>

                        {/* General Liability Card */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        General Liability
                                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">25</span>
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 p-0">
                                <PolicyManager
                                    policyType="GL"
                                    clientId={client.id}
                                    existingPolicy={client.policies?.find((p: any) => p.fileType === "GL")}
                                    onRefresh={fetchClientRefresh}
                                />
                            </CardContent>
                        </Card>

                        {/* Workers Comp Card */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        Workers Comp
                                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">25</span>
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 p-0">
                                <PolicyManager
                                    policyType="WC"
                                    clientId={client.id}
                                    existingPolicy={client.policies?.find((p: any) => p.fileType === "WC")}
                                    onRefresh={fetchClientRefresh}
                                />
                            </CardContent>
                        </Card>

                        {/* Umbrella Card */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        Umbrella
                                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">25</span>
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 p-0">
                                <PolicyManager
                                    policyType="UMBRELLA"
                                    clientId={client.id}
                                    existingPolicy={client.policies?.find((p: any) => p.fileType === "UMBRELLA")}
                                    onRefresh={fetchClientRefresh}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="acord-rules" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>ACORD Customizations</CardTitle>
                            <CardDescription>Specific AI overrides tailored for this client.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600">Coming soon. You'll be able to tell the AI specific rules (e.g. "Always check the waiver of subrogation box for GL on this client's requests").</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="requests" className="mt-6 space-y-6">
                    <CoiRequestManager
                        clientId={client.id}
                        client={client}
                        clientEmail={client.primaryEmail || (client.authorizedDomains?.[0] ? `contact@${client.authorizedDomains[0]}` : undefined)}
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Communication History</CardTitle>
                            <CardDescription>Log of all generated ACORD COI Requests and dispatched emails for this client.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ClientHistoryTab
                                clientId={client.id}
                                clientName={client.name}
                                clientEmail={client.primaryEmail || (client.authorizedDomains?.[0] ? `contact@${client.authorizedDomains[0]}` : undefined)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
