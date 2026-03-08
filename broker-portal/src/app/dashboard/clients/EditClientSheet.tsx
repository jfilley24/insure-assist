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

interface EditClientSheetProps {
    client: any;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditClientSheet({ client, isOpen, onOpenChange, onSuccess }: EditClientSheetProps) {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState(client?.name || "");
    const [domainsInput, setDomainsInput] = useState(client?.authorizedDomains?.join(", ") || "");

    // Handle updates when the client object changes
    useEffect(() => {
        if (client) {
            setName(client.name || "");
            setDomainsInput(client.authorizedDomains?.join(", ") || "");
            setError(null);
        }
    }, [client, isOpen]);

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
                    authorizedDomains
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
