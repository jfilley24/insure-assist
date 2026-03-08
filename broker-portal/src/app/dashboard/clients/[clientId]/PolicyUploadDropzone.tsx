"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

interface PolicyUploadDropzoneProps {
    policyType: "AUTO" | "GL" | "WC" | "UMBRELLA";
    clientId: string;
    onUploadSuccess?: () => void;
}

export function PolicyUploadDropzone({ policyType, clientId, onUploadSuccess }: PolicyUploadDropzoneProps) {
    const { token } = useAuth();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStep, setUploadStep] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Live timer for the extraction phase
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isUploading && uploadStep === "Extracting document via LLM...") {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [isUploading, uploadStep]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await processFile(files[0]);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await processFile(e.target.files[0]);
        }
    };

    const processFile = async (file: File) => {
        setError(null);
        setSuccessMsg(null);

        if (!token) {
            setError("Authentication token not found.");
            return;
        }

        if (file.type !== "application/pdf") {
            setError("Error: Only .pdf files are allowed for Policy Documents.");
            return;
        }

        setIsUploading(true);
        setUploadStep("Requesting secure upload link...");
        try {

            // 1. Ask Backend for a Signed URL
            const urlRes = await fetch(`/api/clients/${clientId}/signed-url`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    policyType,
                    contentType: file.type
                })
            });

            if (!urlRes.ok) {
                const errData = await urlRes.json();
                throw new Error(errData.error || "Failed to get upload URL");
            }

            const { uploadUrl, gcsUri } = await urlRes.json();

            // 2. Native zero-bottleneck PUT directly from Browser to GCS
            setUploadStep("Uploading document to secure server...");
            console.log("Uploading directly to Google Cloud Storage...");
            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type
                },
                body: file
            });

            if (!uploadRes.ok) {
                throw new Error("Failed to upload the file to cloud storage.");
            }

            // 3. Trigger backend Vertex AI extraction process asynchronously
            setUploadStep("Extracting document via LLM...");
            console.log("Upload complete. Triggering AI Extraction...");
            const extractRes = await fetch(`/api/clients/${clientId}/policies`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    gcsUri,
                    filename: file.name,
                    policyType
                })
            });

            if (!extractRes.ok) {
                const errData = await extractRes.json();
                throw new Error(errData.error || "AI Data Extraction Failed");
            }

            if (onUploadSuccess) {
                onUploadSuccess();
            }
            setSuccessMsg(`${file.name} successfully uploaded and ingested by AI.`);

        } catch (err: any) {
            console.error("Upload failed", err);
            // Show the raw stack trace if the API returned it so we can fix the 500 error
            const displayError = err.stack ? `${err.message}\n${err.stack}` : (err.message || "Failed to upload policy document.");
            setError(displayError);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ""; // Reset input
            }
        }
    };

    return (
        <div
            className={`border-2 border-dashed rounded-lg p-4 md:p-8 text-center transition-colors break-words w-full overflow-hidden ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:bg-slate-50"
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
                if (!isUploading && fileInputRef.current) {
                    fileInputRef.current.click();
                }
            }}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleFileSelect}
            />

            {isUploading ? (
                <div className="flex flex-col items-center text-blue-600">
                    <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                    <span className="font-medium text-sm">{uploadStep || "Processing..."}</span>
                    {uploadStep === "Extracting document via LLM..." && (
                        <span className="text-xs text-blue-500 mt-1 font-mono">
                            Time elapsed: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')} (Approx 3-4 mins)
                        </span>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center text-slate-500">
                    <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                        <UploadCloud className="w-6 h-6 text-blue-500" />
                    </div>
                    <span className="font-medium text-slate-700">Click or drag PDF to upload</span>
                    <span className="text-xs mt-1">Strictly .pdf files only</span>
                </div>
            )}

            {error && (
                <div className="absolute bottom-2 inset-x-0 w-full px-4 text-center">
                    <p className="text-xs font-semibold text-red-600 bg-red-50 p-1 rounded border border-red-100">{error}</p>
                </div>
            )}
            {successMsg && !isUploading && (
                <div className="absolute bottom-2 inset-x-0 w-full px-4 text-center">
                    <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-1 rounded border border-emerald-100">{successMsg}</p>
                </div>
            )}
        </div>
    );
}
