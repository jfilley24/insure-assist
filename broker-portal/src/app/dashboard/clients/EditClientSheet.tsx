"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface EditClientSheetProps {
    client: any;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditClientSheet({ client, isOpen, onOpenChange, onSuccess }: EditClientSheetProps) {
    const { token, user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState(client?.name || "");
    const [domainsInput, setDomainsInput] = useState(client?.authorizedDomains?.join(", ") || "");
    const [primaryEmail, setPrimaryEmail] = useState(client?.primaryEmail || "");
    
    // Address fields
    const [addressLine1, setAddressLine1] = useState(client?.addressLine1 || "");
    const [addressLine2, setAddressLine2] = useState(client?.addressLine2 || "");
    const [city, setCity] = useState(client?.city || "");
    const [state, setState] = useState(client?.state || "");
    const [postalCode, setPostalCode] = useState(client?.postalCode || "");

    // Policy Management Settings
    const [managedAuto, setManagedAuto] = useState(client?.managedAuto ?? true);
    const [managedGL, setManagedGL] = useState(client?.managedGL ?? true);
    const [managedUmb, setManagedUmb] = useState(client?.managedUmb ?? true);
    const [managedWC, setManagedWC] = useState(client?.managedWC ?? true);

    const [agentId, setAgentId] = useState<string>(client?.agentId || "");
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
                console.error("Failed to fetch team for assignment", err);
            }
        };
        fetchTeam();
    }, [token]);

    // Handle updates when the client object changes
    useEffect(() => {
        if (client) {
            setName(client.name || "");
            setDomainsInput(client.authorizedDomains?.join(", ") || "");
            setPrimaryEmail(client.primaryEmail || "");
            setAddressLine1(client.addressLine1 || "");
            setAddressLine2(client.addressLine2 || "");
            setCity(client.city || "");
            setState(client.state || "");
            setPostalCode(client.postalCode || "");
            setManagedAuto(client.managedAuto ?? true);
            setManagedGL(client.managedGL ?? true);
            setManagedUmb(client.managedUmb ?? true);
            setManagedWC(client.managedWC ?? true);
            setAgentId(client.agentId || user?.uid || "");
            setError(null);
        }
    }, [client, isOpen, user?.uid]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !name || !client) return;

        setIsLoading(true);
        setError(null);

        const rawDomains = domainsInput
            .split(',')
            .map((d: string) => d.trim().toLowerCase())
            .filter((d: string) => d.length > 0);

        // Domain validation regex (e.g. example.com, city.ca.us)
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;

        const invalidDomains = rawDomains.filter((d: string) => !domainRegex.test(d));
        if (invalidDomains.length > 0) {
            setIsLoading(false);
            setError(`Invalid domain format(s): ${invalidDomains.join(', ')}. Please use formats like "example.com".`);
            return;
        }

        const authorizedDomains = rawDomains;

        try {
            const res = await fetch(`/api/clients/${client.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    authorizedDomains,
                    primaryEmail: primaryEmail ? primaryEmail.trim() : null,
                    addressLine1: addressLine1 ? addressLine1.trim() : null,
                    addressLine2: addressLine2 ? addressLine2.trim() : null,
                    city: city ? city.trim() : null,
                    state: state ? state.trim() : null,
                    postalCode: postalCode ? postalCode.trim() : null,
                    managedAuto,
                    managedGL,
                    managedUmb,
                    managedWC,
                    agentId: agentId || user?.uid || null
                })
            });

            if (res.ok) {
                onOpenChange(false);
                setError(null);
                onSuccess(); // Triggers parent table refresh
            } else {
                let errorMsg = "Unknown error";
                try {
                    const err = await res.json();
                    errorMsg = err.error || JSON.stringify(err);
                } catch {
                    errorMsg = await res.text();
                }
                console.error("Failed to update client:", errorMsg);
                setError(errorMsg);
            }
        } catch (err: any) {
            console.error("Error updating client", err);
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="bg-white sm:max-w-md w-full border-l border-slate-200 p-0 flex flex-col">
                <SheetHeader className="p-6 border-b border-slate-100 bg-slate-50">
                    <SheetTitle className="text-xl font-bold text-slate-800">Edit Client</SheetTitle>
                    <SheetDescription className="text-slate-500">
                        Update {client?.name}'s information and configuration rules.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name" className="text-sm font-semibold text-slate-700">
                                Client Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="edit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. City of Long Beach"
                                className="border-slate-300 focus-visible:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-agent" className="text-sm font-semibold text-slate-700">
                                Assigned Agent
                            </Label>
                            <Select value={agentId} onValueChange={setAgentId}>
                                <SelectTrigger className="border-slate-300 focus:ring-blue-500 w-full">
                                    <SelectValue placeholder="Select an agent..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {team.map((member) => (
                                        <SelectItem key={member.id} value={member.id}>
                                            {member.firstName} {member.lastName || ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-slate-500 font-medium">
                                The agent of record on COIs generated for this client.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-domains" className="text-sm font-semibold text-slate-700">
                                Authorized Domains
                            </Label>
                            <Input
                                id="edit-domains"
                                value={domainsInput}
                                onChange={(e) => setDomainsInput(e.target.value)}
                                placeholder="e.g. longbeach.gov, city.ca.us"
                                className="border-slate-300 focus-visible:ring-blue-500"
                            />
                            <p className="text-[11px] text-slate-500 font-medium">
                                Comma-separated domains. We use these to automatically route inbound ACORD requests to this specific client's policy stack.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-primaryEmail" className="text-sm font-semibold text-slate-700">
                                Primary Email
                            </Label>
                            <Input
                                id="edit-primaryEmail"
                                type="email"
                                value={primaryEmail}
                                onChange={(e) => setPrimaryEmail(e.target.value)}
                                placeholder="e.g. contact@client.com"
                                className="border-slate-300 focus-visible:ring-blue-500"
                            />
                            <p className="text-[11px] text-slate-500 font-medium">
                                We will automatically email the generated Certificate of Insurance to this address.
                            </p>
                        </div>
                        
                        {/* Address Fields */}
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                            <h3 className="text-sm font-semibold text-slate-800">Mailing Address (For ACORD 25)</h3>
                            <div className="space-y-2">
                                <Label htmlFor="edit-address1" className="text-xs font-semibold text-slate-600">Address Line 1</Label>
                                <Input id="edit-address1" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="123 Main St" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-address2" className="text-xs font-semibold text-slate-600">Address Line 2</Label>
                                <Input id="edit-address2" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} placeholder="Suite 100" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-city" className="text-xs font-semibold text-slate-600">City</Label>
                                    <Input id="edit-city" value={city} onChange={e => setCity(e.target.value)} placeholder="Long Beach" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-state" className="text-xs font-semibold text-slate-600">State</Label>
                                        <Input id="edit-state" value={state} onChange={e => setState(e.target.value)} placeholder="CA" maxLength={2} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-zip" className="text-xs font-semibold text-slate-600">Zip</Label>
                                        <Input id="edit-zip" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="90802" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Managed Policies */}
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">Managed Policies</h3>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    Uncheck coverages that are handled by another broker. The COI generator will leave these blank.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                                    <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" checked={managedAuto} onChange={(e) => setManagedAuto(e.target.checked)} />
                                    Commercial Auto
                                </Label>
                                <Label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                                    <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" checked={managedGL} onChange={(e) => setManagedGL(e.target.checked)} />
                                    General Liability
                                </Label>
                                <Label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                                    <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" checked={managedUmb} onChange={(e) => setManagedUmb(e.target.checked)} />
                                    Umbrella / Excess
                                </Label>
                                <Label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                                    <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" checked={managedWC} onChange={(e) => setManagedWC(e.target.checked)} />
                                    Workers Comp
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex flex-col gap-3 mt-auto">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-md text-sm">
                                {error}
                            </div>
                        )}
                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading || !name}
                                className="bg-slate-900 border-none text-white hover:bg-slate-800 disabled:bg-slate-300"
                            >
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
