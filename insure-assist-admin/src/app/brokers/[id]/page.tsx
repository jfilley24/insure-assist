"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Pencil, Trash2, PowerOff, Power, Users, ChevronLeft, Mail } from "lucide-react";
import Link from "next/link";

/* 
 * Dedicated Brokerage Management Page 
 * Displays and Edits single-tenant configurations including User Authorization links
*/

type Broker = {
    id: string;
    name: string;
    ingestionDomain: string;
    isActive: boolean;
};

type BrokerUser = {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    createdAt: string;
};

export default function BrokerageDetails() {
    const { id } = useParams() as { id: string };
    const router = useRouter();

    const [broker, setBroker] = useState<Broker | null>(null);
    const [users, setUsers] = useState<BrokerUser[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit Mode state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDomain, setEditDomain] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Invite User state
    const [isInviting, setIsInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteFirstName, setInviteFirstName] = useState("");
    const [inviteLastName, setInviteLastName] = useState("");
    // Roles are fixed to broker_admin for the Super Admin module
    const inviteRole = "broker_admin";
    const [inviteLoading, setInviteLoading] = useState(false);

    // User Row Editing State
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editUserEmail, setEditUserEmail] = useState("");
    const [editUserFirstName, setEditUserFirstName] = useState("");
    const [editUserLastName, setEditUserLastName] = useState("");
    const [userActionLoading, setUserActionLoading] = useState<string | null>(null);

    // Initial load
    const fetchDetail = async () => {
        try {
            const [resBroker, resUsers] = await Promise.all([
                fetch(`/api/brokers`),
                fetch(`/api/brokers/${id}/users`)
            ]);

            if (resBroker.ok) {
                const payload = await resBroker.json();
                const found = payload.brokers.find((b: Broker) => b.id === id);
                if (found) {
                    setBroker(found);
                    setEditName(found.name);
                    setEditDomain(found.ingestionDomain);
                } else {
                    router.push('/');
                    return;
                }
            }

            if (resUsers.ok) {
                const usersPayload = await resUsers.json();
                setUsers(usersPayload.users || []);
            }

        } catch {
            //
        } finally {
            setLoading(false);
            setUserActionLoading(null);
        }
    };

    useEffect(() => {
        fetchDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/brokers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName, ingestionDomain: editDomain })
            });
            if (!res.ok) throw new Error(await res.text());
            setIsEditing(false);
            fetchDetail();
        } catch (e: any) {
            alert("Save failed: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const setStatus = async (targetActive: boolean) => {
        try {
            const res = await fetch(`/api/brokers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: targetActive })
            });
            if (!res.ok) throw new Error(await res.text());
            fetchDetail();
        } catch (e: any) {
            alert("Status update failed: " + e.message);
        }
    };

    const deleteBroker = async () => {
        if (broker?.isActive) return;
        if (!confirm(`Are you absolutely sure you want to delete ${broker?.name}? All policies, clients, and data will be wiped permanently.`)) return;

        try {
            const res = await fetch(`/api/brokers/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error(await res.text());
            router.push('/');
        } catch (e: any) {
            alert("Delete failed: " + e.message);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);
        try {
            const displayName = `${inviteFirstName.trim()} ${inviteLastName.trim()}`.trim();
            const res = await fetch("/api/users/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail, displayName, role: inviteRole, brokerId: id })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to invite");
            }

            await fetchDetail();
            setIsInviting(false);
            setInviteEmail("");
            setInviteFirstName("");
            setInviteLastName("");
        } catch (err: any) {
            alert("Failed to invite: " + err.message);
        } finally {
            setInviteLoading(false);
        }
    };

    const handleUpdateUser = async (uid: string) => {
        setUserActionLoading(uid);
        try {
            const displayName = `${editUserFirstName.trim()} ${editUserLastName.trim()}`.trim();
            const res = await fetch(`/api/users/${uid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: editUserEmail, displayName })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || await res.text());
            }
            setEditingUserId(null);
            fetchDetail();
        } catch (err: any) {
            alert("Failed to update user: " + err.message);
            setUserActionLoading(null);
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (!confirm("Are you sure you want to completely delete this user from the system?")) return;
        setUserActionLoading(uid);
        try {
            const res = await fetch(`/api/users/${uid}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || await res.text());
            }
            fetchDetail();
        } catch (err: any) {
            alert("Failed to delete user: " + err.message);
            setUserActionLoading(null);
        }
    };

    if (loading) return <div className="text-slate-500">Loading Configuration...</div>;
    if (!broker) return <div className="text-red-500">Brokerage Not Found.</div>;

    return (
        <div className="space-y-6 max-w-[1000px] mb-20">

            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end border-b pb-4">
                <div>
                    <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-2">
                        <ChevronLeft className="h-4 w-4" /> Back to Brokerages
                    </Link>
                    <div className="flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-slate-300" />
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">{broker.name}</h2>
                        <Badge variant={broker.isActive ? 'default' : 'secondary'} className={broker.isActive ? "bg-emerald-500 hover:bg-emerald-600 ml-2" : "ml-2"}>
                            {broker.isActive ? "Active Tenant" : "Suspended"}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">

                {/* PLATFORM CONFIGURATION */}
                <Card>
                    <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Platform Configuration</CardTitle>
                            <CardDescription>Primary identification and identity routing parameters.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {!isEditing && (
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit Parameters
                                </Button>
                            )}
                            {broker.isActive && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    title="Suspend Access"
                                    className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                    onClick={() => setStatus(false)}
                                >
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Suspend Access
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Organization / Legal Name</label>
                                {isEditing ? (
                                    <input
                                        className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                ) : (
                                    <div className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 items-center">
                                        {broker.name}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Email Ingestion Domain Lookup</label>
                                {isEditing ? (
                                    <input
                                        className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm font-mono"
                                        value={editDomain}
                                        onChange={(e) => setEditDomain(e.target.value)}
                                    />
                                ) : (
                                    <div className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-600 items-center">
                                        {broker.ingestionDomain}
                                    </div>
                                )}
                            </div>
                        </div>

                        {isEditing && (
                            <div className="flex gap-2 justify-end pt-4 border-t">
                                <Button variant="ghost" onClick={() => {
                                    setIsEditing(false);
                                    setEditName(broker.name);
                                    setEditDomain(broker.ingestionDomain);
                                }}>Cancel</Button>
                                <Button className="bg-slate-900 text-white" onClick={saveSettings} disabled={isSaving}>Save Changes</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* LIFECYCLE (ONLY IF SUSPENDED) */}
                {!broker.isActive && (
                    <Card className="border-red-100 bg-red-50/20">
                        <CardHeader>
                            <CardTitle className="text-slate-900 flex items-center gap-2">
                                <PowerOff className="h-5 w-5 text-red-500" />
                                Suspended Operations
                            </CardTitle>
                            <CardDescription>This tenant is currently suspended and blocked from login. You can reactivate access or permanently obliterate the firm.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col md:flex-row gap-4">
                            <Button
                                variant="outline"
                                className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                                onClick={() => setStatus(true)}
                            >
                                <Power className="h-4 w-4 mr-2" />
                                Re-activate Access
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={deleteBroker}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hard Delete Tenant
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* USER MANAGEMENT */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" /> Authorized Identity Matrix
                            </CardTitle>
                            <CardDescription>Firebase users possessing JWT claims mapped directly to this tenant.</CardDescription>
                        </div>
                        {!isInviting && (
                            <Button size="sm" className="bg-slate-900 text-white" onClick={() => setIsInviting(true)}>
                                + Provision User
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isInviting && (
                            <form onSubmit={handleInvite} className="mb-6 p-4 border rounded-md bg-slate-50 flex flex-col items-end gap-4 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">First Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={inviteFirstName}
                                            onChange={e => setInviteFirstName(e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Last Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={inviteLastName}
                                            onChange={e => setInviteLastName(e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                                            placeholder="Doe"
                                        />
                                    </div>
                                    <div className="space-y-2 lg:col-span-2">
                                        <label className="text-sm font-medium">User Email Address</label>
                                        <input
                                            required
                                            type="email"
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                                            placeholder="agent@brokerage.com"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between items-end w-full">
                                    <div className="space-y-2 w-48">
                                        <label className="text-sm font-medium">Role Assignment</label>
                                        <div className="flex h-9 w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-1 text-sm shadow-sm items-center text-slate-500 cursor-not-allowed">
                                            Broker Admin
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="ghost" onClick={() => setIsInviting(false)}>Cancel</Button>
                                        <Button type="submit" disabled={inviteLoading} className="bg-slate-900 text-white hover:bg-slate-800">
                                            {inviteLoading ? "Hooking..." : "Send Secure Invite"}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {users.length > 0 ? (
                            <div className="border rounded-md overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Identity</th>
                                            <th className="px-4 py-3 font-medium">RBAC Claim</th>
                                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {users.map(u => (
                                            <tr key={u.uid} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 min-w-[300px]">
                                                    {editingUserId === u.uid ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                className="flex h-8 w-1/3 rounded-md border border-input px-2 py-1 text-sm bg-white"
                                                                type="text"
                                                                placeholder="First"
                                                                value={editUserFirstName}
                                                                onChange={(e) => setEditUserFirstName(e.target.value)}
                                                                autoFocus
                                                            />
                                                            <input
                                                                className="flex h-8 w-1/3 rounded-md border border-input px-2 py-1 text-sm bg-white"
                                                                type="text"
                                                                placeholder="Last"
                                                                value={editUserLastName}
                                                                onChange={(e) => setEditUserLastName(e.target.value)}
                                                            />
                                                            <input
                                                                className="flex h-8 w-1/3 rounded-md border border-input px-2 py-1 text-sm bg-white"
                                                                type="email"
                                                                placeholder="Email"
                                                                value={editUserEmail}
                                                                onChange={(e) => setEditUserEmail(e.target.value)}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="h-4 w-4 text-slate-400" />
                                                                <span className="font-medium text-slate-900">{u.email}</span>
                                                            </div>
                                                            {u.displayName && <div className="text-xs text-slate-500 mt-0.5 ml-6">{u.displayName}</div>}
                                                        </>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="bg-white">
                                                        {u.role === 'broker_admin' ? 'Broker Admin' : u.role}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {editingUserId === u.uid ? (
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="sm" variant="ghost" onClick={() => setEditingUserId(null)} disabled={userActionLoading === u.uid}>Cancel</Button>
                                                            <Button size="sm" className="bg-slate-900 text-white" onClick={() => handleUpdateUser(u.uid)} disabled={userActionLoading === u.uid}>
                                                                {userActionLoading === u.uid ? "Saving..." : "Save"}
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit User" onClick={() => {
                                                                setEditingUserId(u.uid);
                                                                setEditUserEmail(u.email);
                                                                const names = (u.displayName || "").split(" ");
                                                                setEditUserFirstName(names[0] || "");
                                                                setEditUserLastName(names.slice(1).join(" ") || "");
                                                            }} disabled={userActionLoading === u.uid}>
                                                                <Pencil className="h-4 w-4 text-slate-500" />
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500" title="Delete User" onClick={() => handleDeleteUser(u.uid)} disabled={userActionLoading === u.uid}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-sm text-slate-500 border rounded-md border-dashed bg-slate-50">
                                <Users className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                                <p>No active identities mapped to this organization.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
