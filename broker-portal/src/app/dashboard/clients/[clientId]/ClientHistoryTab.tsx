"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, AlertTriangle, Clock, Mail, RefreshCw, Loader2 } from "lucide-react";

interface ClientHistoryTabProps {
    clientId: string;
    clientEmail?: string;
    clientName?: string;
}

export function ClientHistoryTab({ clientId, clientEmail, clientName }: ClientHistoryTabProps) {
    const { token } = useAuth();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const fetchHistory = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/clients/${clientId}/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to load history");
            const data = await res.json();
            setHistory(data.coiRequests || []);
            setCurrentPage(1); // Reset on load
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        // Expose a global event listener so CoiRequestManager can trigger a refresh
        const handleRefresh = () => fetchHistory();
        window.addEventListener('refresh-history', handleRefresh);
        return () => window.removeEventListener('refresh-history', handleRefresh);
    }, [clientId, token]);

    const handleDownload = async (id: string, fileName: string) => {
        if (!token) return;
        setDownloadingId(id);
        try {
            const res = await fetch(`/api/coi-requests/${id}/download`, {
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
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
        } catch (err: any) {
            alert(err.message || "Failed to download file");
        } finally {
            setDownloadingId(null);
        }
    };

    const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
    const paginatedHistory = history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <>
            <CardHeader className="flex flex-row items-center justify-between pb-6">
                <div className="space-y-1.5">
                    <CardTitle className="text-lg">Communication History</CardTitle>
                    <CardDescription>Log of all generated ACORD COI Requests and dispatched emails for this client.</CardDescription>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchHistory()} 
                    disabled={loading}
                    className="flex items-center gap-2 m-0"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading && history.length === 0 ? (
                    <div className="text-slate-500 text-sm italic">Loading history...</div>
                ) : error ? (
                    <div className="text-red-500 text-sm">Failed to load history: {error}</div>
                ) : history.length === 0 ? (
                    <div className="text-center text-slate-500 py-6">
                        No COI requests or communications found for this client yet.
                    </div>
                ) : (
                    <>
                        {paginatedHistory.map((req: any) => {
                            const isPassed = req.status === "PASSED";
                            return (
                                <Card key={req.id} className="overflow-hidden shadow-sm">
                                    <CardHeader className="bg-slate-50/50 border-b pb-4 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                <span className="font-semibold text-slate-700">
                                                    {new Date(req.createdAt).toLocaleString()}
                                                </span>
                                                {isPassed ?
                                                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none ml-2"><CheckCircle2 className="w-3 h-3 mr-1" /> Passed</Badge> :
                                                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none ml-2"><AlertTriangle className="w-3 h-3 mr-1" /> Failed</Badge>
                                                }
                                            </div>
                                            <CardDescription>Source: {req.source}</CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            {req.generatedPdfUri && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        const formattedName = clientName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Client';
                                                        const reqDate = new Date(req.createdAt).toISOString().split('T')[0];
                                                        handleDownload(req.id, `${formattedName}_COI_${reqDate}.pdf`);
                                                    }}
                                                    disabled={downloadingId === req.id}
                                                >
                                                    {downloadingId === req.id ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Download className="w-4 h-4 mr-2" />
                                                    )}
                                                    Download Document
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="space-y-4">
                                            {req.reviewReport && req.reviewReport !== "[]" && req.reviewReport !== "null" && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">AI Review Context</h4>
                                                    <div className="bg-slate-50 p-4 rounded-md border text-sm text-slate-600">
                                                        {(() => {
                                                            if (!req.reviewReport) return <span className="italic">No report found.</span>;
                                                            try {
                                                                const reviews = JSON.parse(req.reviewReport);
                                                                if (Array.isArray(reviews)) {
                                                                    return reviews.map((rev: any, idx) => (
                                                                        <div key={idx} className="mb-3 last:mb-0">
                                                                            <strong className="text-slate-800">{rev.policy_type}</strong> - {rev.status}
                                                                            <ul className="list-disc pl-5 mt-1 text-slate-500">
                                                                                {Array.isArray(rev.comments) ? rev.comments.map((c: string, cidx: number) => <li key={cidx}>{c}</li>) : <li>{rev.comments}</li>}
                                                                            </ul>
                                                                        </div>
                                                                    ));
                                                                }
                                                            } catch (e) {
                                                                return <div className="whitespace-pre-wrap">{req.reviewReport}</div>;
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            {req.communicationLogs && req.communicationLogs.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Dispatched Emails</h4>
                                                    <div className="space-y-2">
                                                        {req.communicationLogs.map((log: any) => (
                                                            <div key={log.id} className="text-xs flex items-center gap-2 p-2 bg-blue-50/50 border border-blue-100 rounded-md">
                                                                <Mail className="w-3 h-3 text-blue-500" />
                                                                <span>Sent to <strong>{log.to}</strong> at {new Date(log.createdAt).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 pb-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-slate-500 flex font-medium">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </>
    );
}
