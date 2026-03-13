"use client";

import { useState } from "react";
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
    SheetTrigger,
} from "@/components/ui/sheet";
import { Plus, X } from "lucide-react";

interface AddClientSheetProps {
    onSuccess: () => void;
}

export function AddClientSheet({ onSuccess }: AddClientSheetProps) {
    const { token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [domainsInput, setDomainsInput] = useState("");
    const [primaryEmail, setPrimaryEmail] = useState("");
    
    // Policy Management Settings
    const [managedAuto, setManagedAuto] = useState(true);
    const [managedGL, setManagedGL] = useState(true);
    const [managedUmb, setManagedUmb] = useState(true);
    const [managedWC, setManagedWC] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !name) return;

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
            const res = await fetch("/api/clients", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    authorizedDomains,
                    primaryEmail: primaryEmail ? primaryEmail.trim() : null,
                    managedAuto,
                    managedGL,
                    managedUmb,
                    managedWC,
                    // TODO: Replace with dynamic multi-tenant ID mapping later
                    brokerId: "test-broker-123"
                })
            });

            if (res.ok) {
                setIsOpen(false);
                setName("");
                setDomainsInput("");
                setPrimaryEmail("");
                setManagedAuto(true);
                setManagedGL(true);
                setManagedUmb(true);
                setManagedWC(true);
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
                console.error("Failed to create client:", errorMsg);
                setError(errorMsg);
            }
        } catch (err: any) {
            console.error("Error submitting client", err);
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Plus className="h-4 w-4 mr-2" /> Add Client
                </Button>
            </SheetTrigger>
            <SheetContent className="bg-white sm:max-w-md w-full border-l border-slate-200 p-0 flex flex-col">
                <SheetHeader className="p-6 border-b border-slate-100 bg-slate-50">
                    <SheetTitle className="text-xl font-bold text-slate-800">Add New Client</SheetTitle>
                    <SheetDescription className="text-slate-500">
                        Create a commercial entity to organize policy documents and ACORD rules.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
                                Client Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. City of Long Beach"
                                className="border-slate-300 focus-visible:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="domains" className="text-sm font-semibold text-slate-700">
                                Authorized Domains
                            </Label>
                            <Input
                                id="domains"
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
                            <Label htmlFor="primaryEmail" className="text-sm font-semibold text-slate-700">
                                Primary Email
                            </Label>
                            <Input
                                id="primaryEmail"
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
                                onClick={() => setIsOpen(false)}
                                className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading || !name}
                                className="bg-slate-900 border-none text-white hover:bg-slate-800 disabled:bg-slate-300"
                            >
                                {isLoading ? "Saving..." : "Save Client"}
                            </Button>
                        </div>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
