"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

export type JobType = "POLICY_UPLOAD" | "COI_REQUEST";
export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Job {
    id: string;
    type: JobType;
    status: JobStatus;
    title: string;
    subtitle?: string;
    step: string;
    clientId: string;
    targetTab?: string;
    progress?: number;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
    resultData?: any;
}

interface JobQueueContextType {
    jobs: Job[];
    enqueuePolicyUpload: (file: File, clientId: string, policyType: string, token: string) => void;
    enqueueCoiRequest: (file: File, clientId: string, token: string, clientName: string) => void;
    enqueueManualCoiRequest: (certificateHolderName: string, descriptionOfOperations: string, clientId: string, token: string, clientName: string) => void;
    dismissJob: (jobId: string) => void;
    dismissAllCompleted: () => void;
}

const JobQueueContext = createContext<JobQueueContextType | undefined>(undefined);

export function JobQueueProvider({ children }: { children: ReactNode }) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initial load from localStorage
    useEffect(() => {
        const stored = localStorage.getItem("job_queue");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Convert string dates back to Date objects
                const hydrated = parsed.map((j: any) => ({
                    ...j,
                    createdAt: new Date(j.createdAt),
                    completedAt: j.completedAt ? new Date(j.completedAt) : undefined
                }));     
                // Filter out jobs older than 24 hours to prevent endless buildup
                const filtered = hydrated.filter((j: Job) => {
                    const age = new Date().getTime() - j.createdAt.getTime();
                    return age < 24 * 60 * 60 * 1000;
                });
                setJobs(filtered);
            } catch (err) {
                console.error("Failed to parse jobs from local storage");
            }
        }
        setIsInitialized(true);
    }, []);

    // Save to localStorage whenever jobs change
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem("job_queue", JSON.stringify(jobs));
        }
    }, [jobs, isInitialized]);

    const addJob = (job: Omit<Job, "id" | "createdAt" | "status" | "step">) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newJob: Job = {
            ...job,
            id,
            status: "PENDING",
            step: "Initializing...",
            createdAt: new Date()
        };
        setJobs(prev => [...prev, newJob]);
        return id;
    };

    const updateJob = (id: string, updates: Partial<Job>) => {
        setJobs(prev => prev.map(job => job.id === id ? { ...job, ...updates } : job));
    };

    const dismissJob = (id: string) => {
        setJobs(prev => prev.filter(job => job.id !== id));
    };

    const dismissAllCompleted = () => {
        setJobs(prev => prev.filter(job => job.status !== "COMPLETED" && job.status !== "FAILED"));
    };

    const enqueuePolicyUpload = async (file: File, clientId: string, policyType: string, token: string) => {
        const jobId = addJob({
            type: "POLICY_UPLOAD",
            title: `Extracting ${policyType} Policy`,
            subtitle: file.name,
            clientId,
            targetTab: "policies"
        });

        toast("Policy Validation Started", {
            description: `Now extracting data for ${file.name}`
        });

        updateJob(jobId, { status: "PROCESSING", step: "Requesting secure upload link..." });

        try {
            // Trim PDF logic if needed here, omitted for brevity but should be added
            let uploadFile = file;

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

            if (!urlRes.ok) throw new Error((await urlRes.json()).error || "Failed to get upload URL");
            const { uploadUrl, gcsUri } = await urlRes.json();

            // 2. Upload to GCS
            updateJob(jobId, { step: "Uploading document to secure server..." });
            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": uploadFile.type },
                body: uploadFile
            });

            if (!uploadRes.ok) throw new Error("Failed to upload the file to cloud storage.");

            // 3. Trigger Vertex AI Extraction (Streaming)
            updateJob(jobId, { step: "Connecting to AI Engine..." });
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

            if (!extractRes.ok) throw new Error("AI Data Extraction Failed");
            if (!extractRes.body) throw new Error("No response body from extraction route");

            const reader = extractRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            let completed = false;
            while (!completed) {
                const { value, done } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                
                // Keep the last partial line in the buffer
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.error) {
                                throw new Error(data.error);
                            } else if (data.update) {
                                updateJob(jobId, { step: data.update });
                            } else if (data.result) {
                                updateJob(jobId, { status: "COMPLETED", step: "Extraction Successful!", completedAt: new Date() });

                                toast.success("Policy Extracted Successfully", {
                                    description: `Finished processing ${file.name}`
                                });

                                // Auto-refresh history if the user is currently viewing the client
                                if (typeof window !== "undefined") {
                                    window.dispatchEvent(new Event("refresh-history"));
                                }
                                completed = true;
                            }
                        } catch (e: any) {
                            if (e.message && !e.message.includes("Unexpected token")) {
                                // Re-throw actual API errors
                                throw e;
                            }
                            console.error("Error parsing SSE chunk:", e);
                        }
                    }
                }
            }

        } catch (err: any) {
            console.error("Policy Upload Job Failed", err);
            updateJob(jobId, { status: "FAILED", step: "Failed", error: err.message || "An unexpected error occurred." });
            
            toast.error("Policy Extraction Failed", {
                description: err.message || "An unexpected error occurred."
            });
        }
    };

    const enqueueCoiRequest = async (file: File, clientId: string, token: string, clientName: string) => {
        const jobId = addJob({
            type: "COI_REQUEST",
            title: "Generating COI",
            subtitle: `${file.name} (For ${clientName})`,
            clientId,
            targetTab: "requests"
        });

        toast("COI Generation Started", {
            description: `Now drafting Certificate of Insurance for ${clientName}`
        });

        updateJob(jobId, { status: "PROCESSING", step: "Uploading request to secure server..." });

        try {
            // 1. Get Signed URL
            const urlRes = await fetch(`/api/clients/${clientId}/signed-url`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ policyType: "REQUEST", contentType: file.type })
            });

            if (!urlRes.ok) throw new Error(await urlRes.text());
            const { uploadUrl, gcsUri } = await urlRes.json();

            // 2. Direct PUT to GCS
            const uploadRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
            if (!uploadRes.ok) throw new Error("Failed to upload to Google Cloud Storage.");

            // 3. Trigger ACORD Generation Backend
            updateJob(jobId, { step: "Generating COI via AI Engine..." });
            const generateRes = await fetch(`/api/clients/${clientId}/coi-requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ gcsUri, source: "PORTAL", requestedBy: "Broker Portal Agent" })
            });

            if (!generateRes.ok) throw new Error((await generateRes.json()).error || "Generation engine failed.");

            const data = await generateRes.json();

            updateJob(jobId, { status: "COMPLETED", step: "COI Generated!", resultData: data, completedAt: new Date() });

            toast.success("COI Generated Successfully", {
                description: `Finished drafting COI for ${clientName}`
            });

            // Auto-refresh history if the user is currently viewing the client
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("refresh-history"));
            }

        } catch (err: any) {
            console.error("COI Request Job Failed", err);
            updateJob(jobId, { status: "FAILED", step: "Failed", error: err.message || "An unexpected error occurred." });
            
            toast.error("COI Generation Failed", {
                description: err.message || "An unexpected error occurred."
            });
        }
    };

    const enqueueManualCoiRequest = async (certificateHolderName: string, descriptionOfOperations: string, clientId: string, token: string, clientName: string) => {
        const jobId = addJob({
            type: "COI_REQUEST",
            title: "Generating COI (Manual)",
            subtitle: `Cert Holder: ${certificateHolderName} (For ${clientName})`,
            clientId,
            targetTab: "requests"
        });

        toast("Manual COI Generation Started", {
            description: `Now drafting Certificate of Insurance for ${clientName}`
        });

        updateJob(jobId, { status: "PROCESSING", step: "Generating COI via AI Engine..." });

        try {
            // Trigger ACORD Generation Backend Directly
            const generateRes = await fetch(`/api/clients/${clientId}/coi-requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ 
                    isManual: true, 
                    certificateHolderName, 
                    descriptionOfOperations,
                    source: "PORTAL", 
                })
            });

            if (!generateRes.ok) throw new Error((await generateRes.json()).error || "Generation engine failed.");

            const data = await generateRes.json();

            updateJob(jobId, { status: "COMPLETED", step: "COI Generated!", resultData: data, completedAt: new Date() });

            toast.success("COI Generated Successfully", {
                description: `Finished drafting COI for ${clientName}`
            });

            // Auto-refresh history if the user is currently viewing the client
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("refresh-history"));
            }

        } catch (err: any) {
            console.error("Manual COI Request Job Failed", err);
            updateJob(jobId, { status: "FAILED", step: "Failed", error: err.message || "An unexpected error occurred." });
            
            toast.error("Manual COI Generation Failed", {
                description: err.message || "An unexpected error occurred."
            });
        }
    };

    return (
        <JobQueueContext.Provider value={{ jobs, enqueuePolicyUpload, enqueueCoiRequest, enqueueManualCoiRequest, dismissJob, dismissAllCompleted }}>
            {children}
            {/* The JobQueueList component will be rendered here or globally in layout.tsx consuming this context */}
        </JobQueueContext.Provider>
    );
}

export function useJobQueue() {
    const context = useContext(JobQueueContext);
    if (context === undefined) {
        throw new Error("useJobQueue must be used within a JobQueueProvider");
    }
    return context;
}
