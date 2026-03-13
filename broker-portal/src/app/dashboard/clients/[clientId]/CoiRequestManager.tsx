"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, Loader2, AlertTriangle, CheckCircle2, Mail, Download, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const isFieldConfirmedEmpty = (val: any) => {
    return String(val).trim() === "N/A (Confirmed)";
};

const isFieldEmpty = (val: any) => {
    if (isFieldConfirmedEmpty(val)) return false;
    const strVal = String(val).trim().toLowerCase();
    return val === null || val === undefined || val === "" || strVal === "null" || strVal === "none" || strVal === "n/a";
};

import { useJobQueue } from "@/contexts/JobQueueContext";

interface CoiRequestManagerProps {
    clientId: string;
    client: any; // Full client object to get name and policies
    clientEmail?: string;
    onHistoryRefresh?: () => void;
}

export function CoiRequestManager({ clientId, client, clientEmail, onHistoryRefresh }: CoiRequestManagerProps) {
    const { token } = useAuth();
    const { enqueueCoiRequest, enqueueManualCoiRequest } = useJobQueue();
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [manualCertHolder, setManualCertHolder] = useState("");
    const [manualDescription, setManualDescription] = useState("");

    const [result, setResult] = useState<any>(null); // holds the response from the coi-requests API
    const [isEmailing, setIsEmailing] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) await processFile(files[0]);
    };
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) await processFile(e.target.files[0]);
    };

    const processFile = async (file: File) => {
        setError(null);
        setResult(null);
        setEmailSuccess(false);

        if (!token) {
            setError("Authentication token not found.");
            return;
        }
        if (file.type !== "application/pdf") {
            setError("Error: Only .pdf files are allowed for Request Documents.");
            return;
        }

        const blocked = expiredPolicies.length > 0 || incompletePolicies.length > 0;
        if (blocked) {
            setError("Cannot generate COIs until all expired or incomplete policies are resolved.");
            return;
        }

        try {
            // Push job to global queue
            enqueueCoiRequest(file, clientId, token, client?.name || "Client");
            
            // Optionally, we could show a success message here, but the queue will handle it.
            // if (onHistoryRefresh) onHistoryRefresh();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleManualSubmit = async () => {
        setError(null);
        setResult(null);
        setEmailSuccess(false);

        if (!token) {
            setError("Authentication token not found.");
            return;
        }

        if (!manualCertHolder.trim()) {
            setError("Certificate Holder Name is required for manual generation.");
            return;
        }

        try {
            enqueueManualCoiRequest(
                manualCertHolder, 
                manualDescription, 
                clientId, 
                token, 
                client?.name || "Client"
            );
            
            // Clear inputs after enqueue
            setManualCertHolder("");
            setManualDescription("");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An unexpected error occurred.");
        }
    };

    const handleSendEmail = async () => {
        if (!result?.id || !token) return;
        setIsEmailing(true);
        try {
            const res = await fetch(`/api/coi-requests/${result.id}/send-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    to: clientEmail || "client@example.com",
                    subject: "Your Auto-Generated Certificate of Insurance",
                    message: "Attached is the Certificate of Insurance per your request."
                })
            });
            if (!res.ok) throw new Error("Failed to send email");
            setEmailSuccess(true);
            if (onHistoryRefresh) onHistoryRefresh();
        } catch (err) {
            alert("Error sending email");
        } finally {
            setIsEmailing(false);
        }
    };

    // Generic unauthenticated download for raw base64 (Manual) or API streams (GCS)
    const handleDownload = async () => {
        if (!result) return;
        setIsDownloading(true);
        try {
            if (result.pdfBase64) {
                // If we have the Base64 in state (from the immediate manual generation), download directly without hitting the API
                const byteCharacters = atob(result.pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: "application/pdf" });
                const downloadUrl = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = downloadUrl;
                const filename = `${client?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Client'}_COI_${new Date().toISOString().split('T')[0]}.pdf`;
                a.download = filename;

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);
                return;
            }

            if (!result.id || !token) throw new Error("No PDF available to download");

            const res = await fetch(`/api/coi-requests/${result.id}/download`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                let errMsg = "Failed to download proxy file";
                try {
                    const errData = await res.json();
                    errMsg = errData.error || errMsg;
                } catch {
                    errMsg = await res.text() || errMsg;
                }
                throw new Error(errMsg);
            }

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = downloadUrl;

            const filename = `${client?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Client'}_COI_${new Date().toISOString().split('T')[0]}.pdf`;
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

        } catch (err: any) {
            alert(`Error preparing download: ${err.message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePreviewBlank = async () => {
        if (!token) return;
        setIsPreviewing(true);
        try {
            // 1. Generate empty manual COI
            const generateRes = await fetch(`/api/clients/${clientId}/coi-requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ 
                    isManual: true, 
                    certificateHolderName: "PREVIEW BLANK", 
                    descriptionOfOperations: "",
                    source: "PORTAL_PREVIEW", 
                })
            });

            if (!generateRes.ok) throw new Error((await generateRes.json()).error || "Generation engine failed.");
            const data = await generateRes.json();

            if (!data.pdf_base64) {
                throw new Error("No PDF generated.");
            }

            // 2. Decode base64 to blob directly without second API call
            const byteCharacters = atob(data.pdf_base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blobFile = new Blob([byteArray], { type: "application/pdf" });

            // 3. Open via hidden anchor to bypass popup blockers
            const previewUrl = window.URL.createObjectURL(blobFile);
            const a = document.createElement('a');
            a.href = previewUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            // We don't use 'download' attribute so it still opens in the browser if possible, 
            // but simulating a user click prevents popup blockers.
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up the URL slightly later so the tab has time to load the blob
            setTimeout(() => window.URL.revokeObjectURL(previewUrl), 1000);

        } catch (err: any) {
            alert(`Error generating preview: ${err.message}`);
        } finally {
            setIsPreviewing(false);
        }
    };

    if (result) {
        const isPassed = result.status === "PASSED";
        return (
            <Card className="w-full bg-white border-2 border-blue-100 shadow-sm">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start md:gap-4 gap-6">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                COI Generation Result
                                {isPassed ?
                                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Passed</Badge> :
                                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none"><AlertTriangle className="w-3 h-3 mr-1" /> Needs Attention</Badge>
                                }
                            </CardTitle>
                            <CardDescription className="mt-1">Generated {new Date(result.createdAt).toLocaleString()}</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {(result.generatedPdfUri || result.pdfBase64) && (
                                <Button
                                    size="sm"
                                    className="bg-slate-900 hover:bg-slate-800"
                                    disabled={isDownloading}
                                    onClick={handleDownload}
                                >
                                    {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                    Download COI
                                </Button>
                            )}
                            {isPassed && result.generatedPdfUri && (
                                <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    disabled={isEmailing || emailSuccess}
                                    onClick={handleSendEmail}
                                >
                                    {isEmailing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                                    {emailSuccess ? "Email Sent!" : "Email COI to Client"}
                                </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setResult(null)}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Start New Request
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {result.reviewReport && result.reviewReport.length > 0 && result.reviewReport !== "[]" && (
                        <div className={`p-4 xl:p-6 rounded-lg border ${isPassed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                            <h4 className={`font-semibold mb-4 text-lg ${isPassed ? 'text-emerald-900' : 'text-amber-900'}`}>AI Reviewer Summary</h4>
                            <div className="space-y-6">
                                {(() => {
                                    try {
                                        const reviews = JSON.parse(result.reviewReport as string);
                                        if (Array.isArray(reviews)) {
                                            return reviews.map((rev: any, idx) => (
                                                <div key={idx} className="border-b border-slate-200 last:border-0 pb-4 last:pb-0">
                                                    <h3 className="text-lg font-bold text-slate-800 mb-2">{rev.policy_type || "Policy"}</h3>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="font-semibold text-slate-700">Status:</span>
                                                        {rev.status === "PASSED" && <Badge className="bg-emerald-100 text-emerald-800 border-none">✅ PASSED</Badge>}
                                                        {rev.status === "FAILED" && <Badge className="bg-rose-100 text-rose-800 border-none">❌ FAILED</Badge>}
                                                        {rev.status !== "PASSED" && rev.status !== "FAILED" && <Badge className="bg-amber-100 text-amber-800 border-none">⚠️ {rev.status}</Badge>}
                                                    </div>
                                                    <div className="font-semibold text-slate-700 mb-1">Comments:</div>
                                                    <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                                                        {Array.isArray(rev.comments) ? rev.comments.map((c: string, cidx: number) => <li key={cidx}>{c}</li>) : <li>{rev.comments}</li>}
                                                    </ul>
                                                </div>
                                            ));
                                        }
                                    } catch (e) {
                                        return (
                                            <div className="p-4 text-slate-700 whitespace-pre-wrap">
                                                {result.reviewReport}
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    )}
                    {!result.generatedPdfUri && !result.pdfBase64 && (
                        <div className="mt-4 p-3 text-center text-sm text-slate-500 border border-slate-200 rounded-md bg-slate-50">
                            No PDF generated due to critical missing values.
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // Get the active (latest) policy for each type, assuming array is sorted new->old
    const activePolicies = (client?.policies || []).reduce((acc: any[], policy: any) => {
        if (!acc.find(p => p.fileType === policy.fileType)) {
            acc.push(policy);
        }
        return acc;
    }, []);

    const expiredPolicies = activePolicies.filter((p: any) => {
        if (!p.expirationDate) return false;
        const expDate = new Date(p.expirationDate);
        expDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expDate.getTime() < today.getTime();
    });

    const incompletePolicies = activePolicies.filter((p: any) => {
        if (!p.acord_fields_json) return true; // It's incomplete if it hasn't been extracted
        try {
            const parsed = JSON.parse(p.acord_fields_json);
            for (const val of Object.values(parsed)) {
                if (isFieldEmpty(val)) {
                    return true;
                }
            }
            return false;
        } catch {
            return true;
        }
    });

    const isBlocked = expiredPolicies.length > 0 || incompletePolicies.length > 0;

    return (
        <Card className="w-full shadow-sm border-blue-100">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                        <CardTitle className="text-lg text-slate-800">Submit New COI Request</CardTitle>
                        <CardDescription className="text-slate-600">
                            We will synthesize it against <strong>{client?.name || "this client"}</strong>'s active policies.
                        </CardDescription>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="shrink-0 bg-white"
                        onClick={handlePreviewBlank}
                        disabled={isPreviewing || isBlocked}
                    >
                        {isPreviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                        Preview COI
                    </Button>
                </div>

                {expiredPolicies.length > 0 && (
                    <div className="mt-3 bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-md flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
                        <div>
                            <span className="font-semibold block mb-0.5">Warning: Expired Policies Detected</span>
                            The following policies have passed their expiration date:
                            <ul className="list-disc pl-5 mt-1 text-red-700/90 text-xs">
                                {expiredPolicies.map((p: any) => (
                                    <li key={p.id}>{p.fileType} ({new Date(p.expirationDate).toLocaleDateString()})</li>
                                ))}
                            </ul>
                            <p className="mt-1 font-medium text-xs">COI generation is disabled until this is resolved.</p>
                        </div>
                    </div>
                )}

                {incompletePolicies.length > 0 && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-md flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                        <div>
                            <span className="font-semibold block mb-0.5">Warning: Incomplete Policies Detected</span>
                            The following policies have empty or missing fields:
                            <ul className="list-disc pl-5 mt-1 text-amber-700/90 text-xs">
                                {incompletePolicies.map((p: any) => (
                                    <li key={p.id}>{p.fileType}</li>
                                ))}
                            </ul>
                            <p className="mt-1 font-medium text-xs">Go to the Policies tab and click "Review Fields" to resolve them. COI generation is disabled until all fields are complete.</p>
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="pt-6">
                <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="manual">Manual Entry (Direct Generation)</TabsTrigger>
                        <TabsTrigger value="upload">Upload Request (AI Analysis)</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upload">
                        <div
                            className={`border-2 border-dashed rounded-lg p-6 md:p-10 text-center transition-colors break-words w-full overflow-hidden ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:bg-slate-50"}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => { if (fileInputRef.current) fileInputRef.current.click(); }}
                        >
                            <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileSelect} />

                            <div className="flex flex-col items-center cursor-pointer">
                                <div className="bg-slate-100 p-4 rounded-full shadow-sm mb-4">
                                    <FileText className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1">Click or drag Request PDF to upload</h3>
                                {isBlocked ? (
                                    <p className="text-sm text-red-600 font-medium max-w-sm mt-1">
                                        Upload disabled until policy issues are resolved.
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-500 max-w-sm">
                                        Supported formats: Standard PDF. Processing runs in the background.
                                    </p>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="manual">
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="certHolder">Requester Name & Address (Certificate Holder) *</Label>
                                    <Textarea 
                                        id="certHolder" 
                                        placeholder="e.g. City of Los Angeles\n123 Main St\nLos Angeles, CA 90001" 
                                        className="min-h-[120px]"
                                        value={manualCertHolder}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualCertHolder(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500">Include the full name and address for the certificate holder box.</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="descOps">Description of Operations (Optional)</Label>
                                    <Textarea 
                                        id="descOps" 
                                        placeholder="Any specific project language goes here..." 
                                        className="min-h-[120px]"
                                        value={manualDescription}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualDescription(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500">This will be printed directly in the Description of Operations box.</p>
                                </div>
                            </div>

                            <Button 
                                onClick={handleManualSubmit} 
                                className="w-full mt-4" 
                                disabled={!manualCertHolder.trim() || isBlocked}
                            >
                                Generate COI Note
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
                
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm font-medium">
                        {error}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
