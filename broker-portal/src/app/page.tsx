"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Prevent redirecting the callback route while Firebase is generating the user session
    if (typeof window !== "undefined" && window.location.pathname === "/login/callback") {
      return;
    }

    if (!loading) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-pulse flex items-center gap-3">
        <ShieldCheck className="h-10 w-10 text-blue-600" />
        <span className="text-2xl font-bold tracking-tight text-slate-900">InsureAssist</span>
      </div>
    </div>
  );
}
