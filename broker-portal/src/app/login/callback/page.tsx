"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

export default function LoginCallbackPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const isExecuting = useRef(false);

    useEffect(() => {
        const completeLogin = async () => {
            if (isExecuting.current) return;

            if (isSignInWithEmailLink(auth, window.location.href)) {
                isExecuting.current = true;
                // Get the email if available. This should be available if the user completes
                // the flow on the same device where they started it.
                let email = window.localStorage.getItem("emailForSignIn");
                if (!email) {
                    // User opened the link on a different device or in a privacy-strict browser
                    // that scrubbed the localStorage cross-origin.
                    // Instead of an ugly Javascript prompt that loops, we abort cleanly.
                    setError("Since you opened this link in a new browser/device, we need you to restart the login process for security.");
                    return;
                }

                try {
                    // The client SDK will parse the code from the link for you.
                    const result = await signInWithEmailLink(auth, email, window.location.href);

                    // Clear email from storage.
                    window.localStorage.removeItem("emailForSignIn");

                    // Successfully signed in! Route to dashboard.
                    router.push("/dashboard");
                } catch (err: any) {
                    console.error("Error signing in with magic link:", err);
                    setError("The magic link has expired or is invalid. Please request a new one.");
                }
            } else {
                setError("Invalid magic link detected.");
            }
        };

        completeLogin();
    }, [router]);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-xl border border-red-200 shadow-sm max-w-md text-center">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Error</h2>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <button
                        onClick={() => router.push("/login")}
                        className="w-full py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-slate-500">Checking credentials and unpacking token...</p>
            </div>
        </div>
    );
}
