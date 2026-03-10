"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UsersIcon, UserPlusIcon, Shield, Mail, Loader2, AlertCircle } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AppUser {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

export default function SettingsPage() {
    const { user, customClaims } = useAuth();
    const [team, setTeam] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviting, setIsInviting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [inviteError, setInviteError] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'agent'
    });

    const fetchTeam = async () => {
        try {
            const token = await user?.getIdToken();
            if (!token) return;

            const res = await fetch("/api/team", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTeam(data);
            }
        } catch (error) {
            console.error("Failed to fetch team:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchTeam();
    }, [user]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsInviting(true);
        setInviteError("");

        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/team/invite", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to invite user");
            }

            // Success
            setIsOpen(false);
            setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'agent' });
            fetchTeam(); // reload team
        } catch (error: any) {
            setInviteError(error.message);
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Team</h1>
                    <p className="text-slate-500 mt-1">Manage your agents, assistants, and their access levels.</p>
                </div>

                {customClaims?.role === 'broker_admin' && (
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                <UserPlusIcon className="h-4 w-4 mr-2" /> Add Team Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Invite new team member</DialogTitle>
                                <DialogDescription>
                                    Create an account for a new agent. They will receive access immediately.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleInvite} className="space-y-4 py-4">
                                {inviteError && (
                                    <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{inviteError}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First name</Label>
                                        <Input id="firstName" required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last name</Label>
                                        <Input id="lastName" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Initial Password</Label>
                                    <Input id="password" type="password" required minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select value={formData.role} onValueChange={value => setFormData({ ...formData, role: value })}>
                                        <SelectTrigger id="role">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="broker_admin">Broker Admin (Full Access)</SelectItem>
                                            <SelectItem value="agent">Agent</SelectItem>
                                            <SelectItem value="assistant">Assistant</SelectItem>
                                            <SelectItem value="csr">Customer Service Rep (CSR)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter className="pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={isInviting}>
                                        {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Account
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </header>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <UsersIcon className="h-5 w-5 text-blue-500" />
                        Active Members
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500 animate-pulse">Loading team directory...</div>
                    ) : team.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No team members found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {team.map((member) => (
                                    <TableRow key={member.id} className="hover:bg-slate-50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase text-sm">
                                                    {member.firstName.charAt(0)}{member.lastName?.charAt(0) || ''}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{member.firstName} {member.lastName}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Mail className="h-3 w-3" /> {member.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`font-mono text-xs ${member.role === 'broker_admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-700'}`}>
                                                {member.role === 'broker_admin' ? <Shield className="h-3 w-3 mr-1" /> : null}
                                                {member.role.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {member.isActive ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-medium text-xs">Active</Badge>
                                            ) : (
                                                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none font-medium text-xs">Suspended</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm">
                                            {new Date(member.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {customClaims?.role === 'broker_admin' && member.id !== user?.uid && (
                                                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
                                                    Manage
                                                </Button>
                                            )}
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
