"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
    const pathname = usePathname();

    const navigation = [
        { name: "Brokerages", href: "/", icon: Building2 },
    ];

    return (
        <div className="flex h-full w-64 flex-col border-r bg-slate-900 text-slate-300">
            <div className="flex h-16 items-center px-6 border-b border-slate-800">
                <ShieldAlert className="h-6 w-6 text-blue-500 mr-2" />
                <h1 className="text-lg font-bold text-white tracking-tight">Insure Assist AI</h1>
            </div>

            <div className="px-6 py-4">
                <Badge variant="outline" className="bg-slate-800 text-blue-400 border-slate-700 w-full justify-center">
                    Super Admin Vault
                </Badge>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${isActive
                                ? "bg-slate-800 text-white"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <item.icon
                                className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                                    }`}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="text-xs text-slate-500 flex items-center justify-center">
                    Secure Local Mode Active
                </div>
            </div>
        </div>
    );
}
