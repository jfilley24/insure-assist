"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useJobQueue } from "@/contexts/JobQueueContext";

interface PolicyUploadDropzoneProps {
    policyType: "AUTO" | "GL" | "WC" | "UMBRELLA";
    clientId: string;
    onUploadSuccess?: () => void;
}

export function PolicyUploadDropzone({ policyType, clientId, onUploadSuccess }: PolicyUploadDropzoneProps) {
    const { token } = useAuth();
    const { enqueuePolicyUpload } = useJobQueue();
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            setError("Error: File size is over 50MB. Large file processing happens in the background, but this file is too big for the initial request. Please compress manually.");
            return;
        }

        try {
            // Push job to global queue
            enqueuePolicyUpload(uploadFile, clientId, policyType, token);
            
            if (onUploadSuccess) {
                onUploadSuccess();
            }
            // Temporarily flag success so the UI moves to "Manage" state, 
            // even if extraction is still pending in global queue
            setSuccessMsg(`Extraction started in background queue for ${uploadFile.name}`);

        } catch (err: any) {
            console.error("Upload failed", err);
            setError(err.message || "Failed to start upload job.");
        } finally {
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
                if (fileInputRef.current) {
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

            <div className="flex flex-col items-center text-slate-500">
                <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                    <UploadCloud className="w-6 h-6 text-blue-500" />
                </div>
                <span className="font-medium text-slate-700">Click or drag PDF to upload</span>
                <span className="text-xs mt-1">Strictly .pdf files only. Processing runs in background.</span>
            </div>

            {error && (
                <div className="absolute bottom-2 inset-x-0 w-full px-4 text-center">
                    <p className="text-xs font-semibold text-red-600 bg-red-50 p-1 rounded border border-red-100">{error}</p>
                </div>
            )}
            {successMsg && (
                <div className="absolute bottom-2 inset-x-0 w-full px-4 text-center">
                    <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-1 rounded border border-emerald-100">{successMsg}</p>
                </div>
            )}
        </div>
    );
}
