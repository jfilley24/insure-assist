import React from "react";
import { Sidebar } from "./Sidebar";
import { Badge } from "@/components/ui/badge";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-6">
                    <h1 className="text-lg font-semibold text-slate-800">Workspace</h1>
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                            Super Admin Privilege
                        </Badge>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
