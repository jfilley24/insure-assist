"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Mail } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const { loginWithMagicLink } = useAuth();

    useEffect(() => {
        // If the user happens to hit the login page but is already authenticated, send them to dashboard
        if (!loading && user) {
            router.push("/dashboard");
        }
    }, [user, loading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsSubmitting(true);
        try {
            await loginWithMagicLink(email);
            setSuccess(true);
        } catch (err: unknown) {
            console.error("Magic link error:", err);
            alert("Failed to send magic link. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="absolute top-8 left-8 flex items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-slate-900 tracking-tight">InsureAssist</span>
            </div>

            <Card className="w-full max-w-md shadow-xl border-slate-200">
                <CardHeader className="space-y-1 text-center pb-8">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                        Broker Access Portal
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        Secure, passwordless entry to your active directory.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!success ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700">Enterprise Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="broker@agency.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-white"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors" disabled={isSubmitting}>
                                {isSubmitting ? "Generating Link..." : "Send Magic Link"}
                            </Button>
                        </form>
                    ) : (
                        <div className="flex flex-col flex-1 justify-center items-center py-6 text-center space-y-4">
                            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <Mail className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">Check your inbox</h3>
                            <p className="text-sm text-slate-500 max-w-[250px]">
                                We just sent a secure, one-time login link to <span className="font-medium text-slate-900">{email}</span>.
                            </p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col border-t px-6 py-4 bg-slate-50/50">
                    <p className="text-xs text-center text-slate-500">
                        By authenticating, you verify that you are an authorized representative utilizing this platform solely for approved ACORD processing and policy governance.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
