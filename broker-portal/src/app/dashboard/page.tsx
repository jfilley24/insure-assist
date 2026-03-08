"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CopyPlus, Clock, ShieldCheck, Files } from "lucide-react";

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-slate-500 mt-1">Manage policies, clients, and generate ACORD certificates.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-white">
                        <Clock className="h-4 w-4 mr-2" /> Recent Activity
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <CopyPlus className="h-4 w-4 mr-2" /> New COI
                    </Button>
                </div>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Active Policies</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">142</div>
                        <p className="text-xs text-slate-500 mt-1">+12 this month</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Clients</CardTitle>
                        <UsersIcon className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">89</div>
                        <p className="text-xs text-slate-500 mt-1">+3 this week</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">ACORDs Generated</CardTitle>
                        <Files className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">2,405</div>
                        <p className="text-xs text-slate-500 mt-1">Lifetime total</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Pending Requests</CardTitle>
                        <InboxIcon className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">3</div>
                        <p className="text-xs text-slate-500 mt-1 text-amber-600">Needs review</p>
                    </CardContent>
                </Card>
            </div>


        </div>
    );
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}

function InboxIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
    )
}
