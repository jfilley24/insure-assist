"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Building2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BrokerSettings {
    name: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    phoneNumber: string;
    faxNumber: string;
}

export default function SettingsPage() {
    const { user, customClaims } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [formData, setFormData] = useState<BrokerSettings>({
        name: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        phoneNumber: "",
        faxNumber: ""
    });

    const formatPhoneNumber = (value: string) => {
        const digits = value.replace(/\D/g, "");
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    };

    const fetchBroker = async () => {
        try {
            const token = await user?.getIdToken();
            if (!token) return;

            const res = await fetch("/api/brokers/me", {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    name: data.name || "",
                    addressLine1: data.addressLine1 || "",
                    addressLine2: data.addressLine2 || "",
                    city: data.city || "",
                    state: data.state || "",
                    postalCode: data.postalCode || "",
                    phoneNumber: data.phoneNumber || "",
                    faxNumber: data.faxNumber || ""
                });
            } else {
                setError("Failed to load broker settings.");
            }
        } catch (error) {
            console.error("Failed to fetch broker settings:", error);
            setError("Failed to load broker settings.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchBroker();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError("");
        setSuccessMessage("");

        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/brokers/me", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to save settings");
            }

            setSuccessMessage("Broker settings saved successfully.");
            fetchBroker();
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsSaving(false);
            setTimeout(() => setSuccessMessage(""), 5000);
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center text-slate-500 animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p>Loading settings...</p>
                </div>
            </div>
        );
    }

    const isAdmin = customClaims?.role === 'broker_admin';

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
                <p className="text-slate-500 mt-1">Manage your brokerage information and system preferences.</p>
            </header>

            <div className="space-y-6">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-500" />
                            Brokerage Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {successMessage && (
                                <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    <AlertDescription>{successMessage}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Brokerage Name</Label>
                                    <Input 
                                        id="name" 
                                        required 
                                        value={formData.name} 
                                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                        disabled={!isAdmin}
                                    />
                                </div>
                                
                                <h3 className="text-sm font-semibold text-slate-800 pt-2 border-t border-slate-100">Contact Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phoneNumber">Phone Number</Label>
                                        <Input 
                                            id="phoneNumber" 
                                            value={formData.phoneNumber} 
                                            onChange={e => setFormData({ ...formData, phoneNumber: formatPhoneNumber(e.target.value) })} 
                                            placeholder="e.g. (555) 123-4567"
                                            maxLength={14}
                                            disabled={!isAdmin}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="faxNumber">Fax Number</Label>
                                        <Input 
                                            id="faxNumber" 
                                            value={formData.faxNumber} 
                                            onChange={e => setFormData({ ...formData, faxNumber: formatPhoneNumber(e.target.value) })} 
                                            placeholder="e.g. (555) 987-6543"
                                            maxLength={14}
                                            disabled={!isAdmin}
                                        />
                                    </div>
                                </div>

                                <h3 className="text-sm font-semibold text-slate-800 pt-2 border-t border-slate-100">Mailing Address (For ACORD 25 Producer Field)</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="addressLine1">Address Line 1</Label>
                                        <Input 
                                            id="addressLine1" 
                                            value={formData.addressLine1} 
                                            onChange={e => setFormData({ ...formData, addressLine1: e.target.value })} 
                                            disabled={!isAdmin}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                                        <Input 
                                            id="addressLine2" 
                                            value={formData.addressLine2} 
                                            onChange={e => setFormData({ ...formData, addressLine2: e.target.value })} 
                                            disabled={!isAdmin}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-2 sm:col-span-1">
                                            <Label htmlFor="city">City</Label>
                                            <Input 
                                                id="city" 
                                                value={formData.city} 
                                                onChange={e => setFormData({ ...formData, city: e.target.value })} 
                                                disabled={!isAdmin}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="state">State</Label>
                                            <Input 
                                                id="state" 
                                                maxLength={2} 
                                                placeholder="CA"
                                                value={formData.state} 
                                                onChange={e => setFormData({ ...formData, state: e.target.value })} 
                                                disabled={!isAdmin}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="postalCode">Zip Code</Label>
                                            <Input 
                                                id="postalCode" 
                                                value={formData.postalCode} 
                                                onChange={e => setFormData({ ...formData, postalCode: e.target.value })} 
                                                disabled={!isAdmin}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="pt-4 flex justify-end">
                                    <Button type="submit" disabled={isSaving || !formData.name} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </div>
                            )}
                            {!isAdmin && (
                                <div className="pt-4">
                                    <p className="text-sm text-slate-500 italic">Only Broker Admins can update these settings.</p>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
