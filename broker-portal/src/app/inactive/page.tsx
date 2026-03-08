"use client";

import { LogOut, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function InactivePage() {
    const { logout } = useAuth();

    // As a secondary precaution, ensure any lingering session state is wiped when they land here
    useEffect(() => {
        const nukeSession = async () => {
            try {
                await logout();
            } catch (e) {
                console.error("Failed to clear session on inactive page", e);
            }
        };
        nukeSession();
    }, [logout]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Account Inactive</h1>
                <p className="text-slate-600 mb-6">
                    Your brokerage account is currently inactive or suspended. Please contact your administrator or support for assistance.
                </p>
                <div className="flex flex-col gap-3">
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/login">
                            <LogOut className="mr-2 h-4 w-4" />
                            Return to Login
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
