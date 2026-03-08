"use client";

import { useState, useEffect } from "react";
import { PolicyUploadDropzone } from "./PolicyUploadDropzone";
import { Button } from "@/components/ui/button";
import { FileCheck, Calendar, FilePenLine, RefreshCw, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";

interface PolicyManagerProps {
    policyType: "AUTO" | "GL" | "WC" | "UMBRELLA";
    clientId: string;
    existingPolicy: any | null;
    onRefresh: () => void;
}

const isFieldConfirmedEmpty = (val: any) => {
    return String(val).trim() === "N/A (Confirmed)";
};

const isFieldEmpty = (val: any) => {
    if (isFieldConfirmedEmpty(val)) return false;
    const strVal = String(val).trim().toLowerCase();
    return val === null || val === undefined || val === "" || strVal === "null" || strVal === "none" || strVal === "n/a";
};

export function PolicyManager({ policyType, clientId, existingPolicy, onRefresh }: PolicyManagerProps) {
    const [isReplacing, setIsReplacing] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Calculate missing fields to warn the user
    const missingFieldsCount = (() => {
        if (!existingPolicy?.acord_fields_json) return 0;
        try {
            const parsed = JSON.parse(existingPolicy.acord_fields_json);
            let count = 0;
            for (const val of Object.values(parsed)) {
                if (isFieldEmpty(val)) {
                    count++;
                }
            }
            return count;
        } catch {
            return 0;
        }
    })();

    // Check policy expiration status recursively
    const expirationInfo = (() => {
        if (!existingPolicy?.expirationDate) return { isExpired: false, isExpiringSoon: false, daysUntil: null };
        try {
            const expDate = new Date(existingPolicy.expirationDate);
            expDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                isExpired: diffDays < 0,
                isExpiringSoon: diffDays >= 0 && diffDays <= 30,
                daysUntil: diffDays
            };
        } catch {
            return { isExpired: false, isExpiringSoon: false, daysUntil: null };
        }
    })();

    // If there is no policy uploaded, OR the user clicked "Replace", show the dropzone.
    if (!existingPolicy || isReplacing) {
        return (
            <div className="relative">
                <PolicyUploadDropzone
                    policyType={policyType}
                    clientId={clientId}
                    onUploadSuccess={() => {
                        setIsReplacing(false);
                        onRefresh();
                    }}
                />
                {isReplacing && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-10 right-2 text-slate-500"
                        onClick={() => setIsReplacing(false)}
                    >
                        Cancel Replace
                    </Button>
                )}
            </div>
        );
    }

    // Otherwise, show the Managed State
    return (
        <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-b-lg flex flex-col gap-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-full">
                        <FileCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-emerald-900 truncate max-w-[280px]" title={existingPolicy.filename}>
                                {existingPolicy.filename}
                            </h4>
                            {expirationInfo.isExpired && (
                                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center border border-red-200">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    EXPIRED
                                </span>
                            )}
                            {expirationInfo.isExpiringSoon && (
                                <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center border border-yellow-200">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    RENEW
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between w-full mt-0.5">
                            <p className={`text-xs flex items-center gap-1 ${expirationInfo.isExpired ? 'text-red-600' :
                                expirationInfo.isExpiringSoon ? 'text-yellow-600' :
                                    'text-emerald-600'
                                }`}>
                                <Calendar className="w-3 h-3" />
                                Exp: {existingPolicy.expirationDate ? new Date(existingPolicy.expirationDate).toLocaleDateString() : 'Unknown'}
                                {expirationInfo.daysUntil !== null && (
                                    <span className="ml-1 opacity-80">
                                        ({expirationInfo.daysUntil < 0 ? `${Math.abs(expirationInfo.daysUntil)} days ago` : `in ${expirationInfo.daysUntil} days`})
                                    </span>
                                )}
                            </p>
                            {existingPolicy.uploadedAt && (
                                <p className="text-[10px] text-emerald-600/70 font-medium ml-4">
                                    Uploaded: {new Date(existingPolicy.uploadedAt).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {missingFieldsCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-md flex items-start gap-2 mt-2">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                    <p>
                        <strong>{missingFieldsCount} empty field{missingFieldsCount === 1 ? '' : 's'} detected.</strong><br />
                        Please click "Review Fields" to verify if they are truly missing from the policy or if they need manual entry.
                    </p>
                </div>
            )}

            <div className="flex items-center gap-2 mt-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setIsSheetOpen(true)}
                >
                    <FilePenLine className="w-4 h-4 mr-2" />
                    Review Fields
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-slate-600"
                    title="Replace Document"
                    onClick={() => setIsReplacing(true)}
                >
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* The Editor Sheet */}
            <PolicyEditorSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                policy={existingPolicy}
                onRefresh={onRefresh}
            />
        </div>
    );
}

// Internal Sheet Component for Edit Logic
function PolicyEditorSheet({ isOpen, onClose, policy, onRefresh }: { isOpen: boolean, onClose: () => void, policy: any, onRefresh: () => void }) {
    const { token } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    // Safely parse LLM JSON which might occasionally include markdown blocks
    const parseAIJson = (raw: string | null | undefined) => {
        if (!raw) return {};
        try {
            let clean = raw.trim();
            if (clean.startsWith('```')) {
                clean = clean.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '').trim();
            }
            return JSON.parse(clean);
        } catch (err) {
            console.error("Failed to parse AI JSON:", err);
            return {};
        }
    };

    const [formData, setFormData] = useState<Record<string, any>>(() => parseAIJson(policy?.acord_fields_json));

    // Make absolutely sure we re-parse if the active policy changes from a background upload
    useEffect(() => {
        setFormData(parseAIJson(policy?.acord_fields_json));
    }, [policy?.acord_fields_json]);

    const handleChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/clients/${policy.clientId}/policies/${policy.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    acord_fields_json: JSON.stringify(formData)
                })
            });

            if (!res.ok) throw new Error("Failed to save changes");

            onRefresh();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error saving data.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-[400px] sm:w-[700px] sm:max-w-none overflow-y-auto p-6 sm:p-8">
                <SheetHeader className="p-0 mb-6">
                    <SheetTitle>Review AI Extraction</SheetTitle>
                    <SheetDescription>
                        Vertex AI automatically extracted these values from the PDF. Correct any mistakes before ACORD generation.
                    </SheetDescription>
                </SheetHeader>
                <Tabs defaultValue="fields" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="fields">Editable Fields</TabsTrigger>
                        <TabsTrigger value="raw">Raw AI JSON Dump</TabsTrigger>
                    </TabsList>

                    <TabsContent value="fields" className="space-y-4">
                        {Object.keys(formData).length === 0 ? (
                            <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                                No editable fields found. This JSON may not be structured correctly.
                            </div>
                        ) : (
                            Object.entries(formData).map(([key, value]) => {
                                const isEmpty = isFieldEmpty(value);
                                return (
                                    <div key={key} className="space-y-1">
                                        <Label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                            {key.replace(/_/g, ' ')}
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    value={value?.toString() || ""}
                                                    onChange={(e) => handleChange(key, e.target.value)}
                                                    className={
                                                        isEmpty ? "bg-amber-50/50 border-amber-300 pr-10 focus-visible:ring-amber-500" :
                                                            isFieldConfirmedEmpty(value) ? "bg-emerald-50/50 border-emerald-300 pr-10 text-emerald-700 focus-visible:ring-emerald-500 font-medium" : ""
                                                    }
                                                />
                                                {isEmpty && (
                                                    <div
                                                        className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
                                                        title="This data point was not found in the uploaded document. Please review and provide a value."
                                                    >
                                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                    </div>
                                                )}
                                                {isFieldConfirmedEmpty(value) && (
                                                    <div
                                                        className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
                                                        title="Confirmed as manually verified empty."
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    </div>
                                                )}
                                            </div>
                                            {isEmpty && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="shrink-0 border-amber-200 text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                                                    onClick={() => handleChange(key, "N/A (Confirmed)")}
                                                    title="Click to confirm this field is intentionally missing."
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </TabsContent>

                    <TabsContent value="raw">
                        <div className="bg-slate-950 p-4 rounded-lg overflow-x-auto border border-slate-800">
                            <pre className="text-xs text-emerald-400 font-mono">
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(policy?.free_form_json || "{}"), null, 2);
                                    } catch {
                                        return policy?.free_form_json || "No raw JSON data extracted.";
                                    }
                                })()}
                            </pre>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-3 pb-4">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Save Changes
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
