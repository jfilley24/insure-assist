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

        let uploadFile = file;
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        if (uploadFile.size > MAX_FILE_SIZE) {
            setIsUploading(true);
            setUploadStep("Large file detected. Trimming to first 50 pages...");
            try {
                const { PDFDocument } = await import('pdf-lib');
                const arrayBuffer = await uploadFile.arrayBuffer();
                // Load while ignoring encryption in case of password-protected reading scopes
                const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                const pageCount = pdfDoc.getPageCount();

                if (pageCount > 50) {
                    const newPdfDoc = await PDFDocument.create();
                    // Extract exactly pages 0 to 49
                    const pagesToCopy = Array.from({ length: 50 }, (_, i) => i);
                    const copiedPages = await newPdfDoc.copyPages(pdfDoc, pagesToCopy);
                    for (const page of copiedPages) {
                        newPdfDoc.addPage(page);
                    }
                    const trimmedPdfBytes = await newPdfDoc.save();
                    uploadFile = new File([new Blob([trimmedPdfBytes])], uploadFile.name, { type: uploadFile.type });

                    if (uploadFile.size > MAX_FILE_SIZE) {
                        setError("Error: Even after trimming to 50 pages, the file size exceeds the 50MB limit. Please compress manually.");
                        setIsUploading(false);
                        return;
                    }
                } else {
                    setError("Error: File size exceeds the 50MB limit, but has fewer than 50 pages so it cannot be trimmed safely. Please compress manually.");
                    setIsUploading(false);
                    return;
                }
            } catch (trimErr: any) {
                console.error("Failed to trim PDF:", trimErr);
                setError("Error: Failed to process large PDF automatically. Please compress or split manually.");
                setIsUploading(false);
                return;
            }
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
                    contentType: uploadFile.type
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
                    "Content-Type": uploadFile.type
                },
                body: uploadFile
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
                    filename: uploadFile.name,
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
            setSuccessMsg(`${uploadFile.name} successfully uploaded and ingested by AI.`);

        } catch (err: any) {
            console.error("Upload failed", err);
            // Just show the clean message from the API, don't dump the raw browser stack trace into the UI
            setError(err.message || "Failed to upload policy document.");
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
