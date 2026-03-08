"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type Role = "broker_admin" | "agent" | "assistant" | "csr";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, customClaims, loading, logout, token } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.replace("/login");
            return;
        }

        const verifyBrokerStatus = async () => {
            try {
                if (!token) {
                    await logout();
                    router.replace("/login");
                    return;
                }

                const res = await fetch("/api/brokers/me", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    await logout();
                    router.replace("/inactive");
                    return;
                }

                const data = await res.json();
                if (!data.isActive) {
                    await logout();
                    router.replace("/inactive");
                    return;
                }

                // If no specific roles required, just being authenticated and active is enough
                if (!allowedRoles || allowedRoles.length === 0) {
                    // eslint-disable-next-line
                    setIsAuthorized(true);
                    return;
                }

                // Enforce Role Based Access Control via passed customClaims
                const userRole = customClaims?.role as Role | undefined;

                if (userRole && allowedRoles.includes(userRole)) {
                    // eslint-disable-next-line
                    setIsAuthorized(true);
                } else {
                    // Send to unauthorized access page
                    console.warn("User lacks required role for this route");
                    router.replace("/unauthorized");
                }
            } catch (error) {
                console.error("Error verifying broker status", error);
                await logout();
                router.replace("/inactive");
            }
        };

        verifyBrokerStatus();
    }, [user, customClaims, loading, router, allowedRoles, logout, token]);

    if (loading || isAuthorized === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm text-slate-500 font-medium">Verifying Session...</p>
                </div>
            </div>
        );
    }

    return isAuthorized ? <>{children}</> : null;
}
