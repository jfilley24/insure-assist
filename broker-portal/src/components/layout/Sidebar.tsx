"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
    LayoutDashboard,
    CopyPlus,
    Users,
    Settings,
    LogOut,
    Shield,
    Menu,
    X
} from "lucide-react";
import { useState } from "react";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Clients", href: "/dashboard/clients", icon: Users },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile Menu Toggle */}
            <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-white border-b border-slate-200 z-50 flex items-center px-4 justify-between transition-all">
                <div className="flex items-center gap-2">
                    <Shield className="h-6 w-6 text-blue-600" />
                    <span className="font-bold text-slate-900 tracking-tight">Insure Assist AI</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(!isMobileOpen)}>
                    {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>

            {/* Sidebar Container */}
            <aside
                className={`
                    fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col 
                    transition-transform duration-300 ease-in-out
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                <div className="p-6 border-b border-slate-100 hidden md:flex items-center gap-2">
                    <Shield className="h-6 w-6 text-blue-600" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Insure Assist AI</h2>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 tracking-wider uppercase">Broker Portal</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-16 md:mt-0 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link key={item.name} href={item.href} onClick={() => setIsMobileOpen(false)}>
                                <Button
                                    variant="ghost"
                                    className={`w-full justify-start ${isActive ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                                >
                                    <Icon className="mr-3 h-5 w-5" />
                                    {item.name}
                                </Button>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="mb-4 px-3 py-2 bg-slate-50 rounded-lg">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Signed in as</p>
                        <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={logout}
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
}
