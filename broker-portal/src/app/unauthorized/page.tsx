"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ShieldAlert, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-red-100">
                <CardHeader className="space-y-1 text-center pb-6">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center">
                            <ShieldAlert className="h-8 w-8 text-red-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                        Access Restricted
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        You do not have the required permissions to view this domain.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-sm text-slate-600">
                        Your identity has been verified as <span className="font-bold text-slate-900">{user?.email || "Authenticated User"}</span>,
                        however, your account has not been granted an active role by your Agency Administrator.
                    </p>
                    <p className="text-sm text-slate-500">
                        Please contact your IT department or an InsureAssist representative to provision your access limits.
                    </p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                    <Button
                        variant="default"
                        onClick={handleLogout}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out and Continue
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
