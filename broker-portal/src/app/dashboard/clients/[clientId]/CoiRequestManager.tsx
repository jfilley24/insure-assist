"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, Loader2, AlertTriangle, CheckCircle2, Mail, Download, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useJobQueue } from "@/contexts/JobQueueContext";

interface CoiRequestManagerProps {
    clientId: string;
    client: any; // Full client object to get name and policies
    clientEmail?: string;
    onHistoryRefresh?: () => void;
}

export function CoiRequestManager({ clientId, client, clientEmail, onHistoryRefresh }: CoiRequestManagerProps) {
    const { token } = useAuth();
    const { enqueueCoiRequest } = useJobQueue();
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [result, setResult] = useState<any>(null); // holds the response from the coi-requests API
    const [isEmailing, setIsEmailing] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

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

    const handleDownload = async () => {
        if (!result?.id || !token) return;
        setIsDownloading(true);
        try {
            const res = await fetch(`/api/coi-requests/${result.id}/download`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                // Determine if error is JSON or text
                let errMsg = "Failed to download proxy file";
                try {
                    const errData = await res.json();
                    errMsg = errData.error || errMsg;
                } catch {
                    errMsg = await res.text() || errMsg;
                }
                throw new Error(errMsg);
            }

            // Because we stripped the GCS Signed URL out of the backend due to security policies,
            // we must extract the raw binary stream now.
            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            // Create a virtual anchor to trigger the download
            const a = document.createElement('a');
            a.href = downloadUrl;

            const filename = `${client?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Client'}_COI_${new Date().toISOString().split('T')[0]}.pdf`;
            a.download = filename;

            document.body.appendChild(a);
            a.click();

            // Clean up memory
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

        } catch (err: any) {
            alert(`Error preparing download: ${err.message}`);
        } finally {
            setIsDownloading(false);
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
                            {result.generatedPdfUri && (
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
                    <div className={`p-4 xl:p-6 rounded-lg border ${isPassed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                        <h4 className={`font-semibold mb-4 text-lg ${isPassed ? 'text-emerald-900' : 'text-amber-900'}`}>AI Reviewer Summary</h4>
                        <div className="space-y-6">
                            {(() => {
                                if (!result.reviewReport) return <p className="text-slate-600">No summary provided.</p>;

                                try {
                                    // Handle the new strict JSON payload
                                    const reviews = JSON.parse(result.reviewReport);
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
                                    // Fallback for older requests
                                    return (
                                        <div className="p-4 text-slate-700 whitespace-pre-wrap">
                                            {result.reviewReport}
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                    {!result.generatedPdfUri && (
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

    return (
        <Card className="w-full shadow-sm border-blue-100">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-lg text-slate-800">Submit New COI Request</CardTitle>
                <CardDescription className="text-slate-600">
                    We will synthesize it against <strong>{client?.name || "this client"}</strong>'s active policies.
                </CardDescription>

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
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="pt-6">
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
                        <p className="text-sm text-slate-500 max-w-sm">
                            Supported formats: Standard PDF. Processing runs in the background.
                        </p>
                    </div>
                </div>
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm font-medium">
                        {error}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
