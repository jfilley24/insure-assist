"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, MoreHorizontal } from "lucide-react";
import { AddClientSheet } from "./AddClientSheet";
import { EditClientSheet } from "./EditClientSheet";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ClientsPage() {
    const { user, token } = useAuth();
    const router = useRouter();
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);
    const [team, setTeam] = useState<any[]>([]);

    useEffect(() => {
        const fetchTeam = async () => {
            if (!token) return;
            try {
                const res = await fetch("/api/team", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTeam(data);
                }
            } catch (err) {
                console.error("Failed to fetch team", err);
            }
        };
        fetchTeam();
    }, [token]);

    const fetchClients = async () => {
        if (!token) return;
        try {
            const res = await fetch("/api/clients", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setClients(data);
            }
        } catch (error) {
            console.error("Failed to fetch clients", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchClients();
        }
    }, [token]);

    const handleDeleteClient = async (clientId: string, clientName: string) => {
        setPageError(null);
        if (!window.confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/clients/${clientId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.ok) {
                fetchClients(); // Refresh table
            } else {
                let errorMsg = "Unknown delete error";
                try {
                    const errorData = await res.json();
                    errorMsg = errorData.error || errorMsg;
                } catch {
                    errorMsg = await res.text();
                }
                setPageError(errorMsg);
            }
        } catch (error: any) {
            console.error("Delete client error:", error);
            setPageError(error.message || "Failed to delete client");
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clients</h1>
                    <p className="text-slate-500 mt-1">Manage insured entities and their associated policy documents.</p>
                </div>
                {user?.role === 'broker_admin' && (
                    <AddClientSheet onSuccess={fetchClients} />
                )}
            </header>

            {pageError && (
                <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-lg text-sm font-medium">
                    {pageError}
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search clients or domains..."
                            className="pl-9 bg-white border-slate-200"
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-semibold text-slate-900">Client Name</TableHead>
                            <TableHead className="font-semibold text-slate-900">Authorized Domains</TableHead>
                            <TableHead className="font-semibold text-slate-900">Active Policies</TableHead>
                            <TableHead className="font-semibold text-slate-900">Agent</TableHead>
                            <TableHead className="font-semibold text-slate-900">Added</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    Loading clients...
                                </TableCell>
                            </TableRow>
                        ) : clients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                                            <Building2 className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <div className="text-slate-500 font-medium">No clients found</div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            clients.map((client) => (
                                <TableRow key={client.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                                    <TableCell className="font-medium text-slate-900">
                                        {client.name}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 flex-wrap">
                                            {client.authorizedDomains?.map((domain: string) => (
                                                <Badge key={domain} variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                                                    {domain}
                                                </Badge>
                                            ))}
                                            {(!client.authorizedDomains || client.authorizedDomains.length === 0) && (
                                                <span className="text-sm text-slate-400 italic">None</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {['AUTO', 'GL', 'WC', 'UMBRELLA'].map(type => {
                                                const hasPolicy = client.policies?.some((p: any) => p.fileType === type);
                                                return (
                                                    <Badge
                                                        key={type}
                                                        variant="outline"
                                                        className={`text-[10px] px-1 py-0 ${hasPolicy ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-300 border-slate-100'}`}
                                                    >
                                                        {type}
                                                    </Badge>
                                                )
                                            })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-600 font-medium">
                                        {client.agentId 
                                            ? team.find(t => t.uid === client.agentId)?.displayName || 'Unknown Agent'
                                            : <span className="text-slate-400 italic">Unassigned</span>}
                                    </TableCell>
                                    <TableCell className="text-slate-500">
                                        {new Date(client.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                                                    Policies
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    setEditingClient(client);
                                                    setIsEditSheetOpen(true);
                                                }}>
                                                    Edit Client
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {user?.role === 'broker_admin' && (
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                                        onClick={() => handleDeleteClient(client.id, client.name)}
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <EditClientSheet
                client={editingClient}
                isOpen={isEditSheetOpen}
                onOpenChange={setIsEditSheetOpen}
                onSuccess={fetchClients}
            />
        </div>
    );
}
