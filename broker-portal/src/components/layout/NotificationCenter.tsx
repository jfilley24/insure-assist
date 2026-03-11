"use client";

import { useJobQueue } from "@/contexts/JobQueueContext";
import { Loader2, CheckCircle2, XCircle, X, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState, useEffect } from "react";

export function NotificationCenter() {
    const { jobs, dismissJob, dismissAllCompleted } = useJobQueue();
    const [isOpen, setIsOpen] = useState(false);
    
    // We consider a job "unread" if it's currently processing OR if it's new (in this simple implementation,
    // we just use the total length of jobs as the badge, and clearing them removes the badge).
    const unreadCount = jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PENDING').length 
                        + jobs.filter(j => j.status === 'COMPLETED' || j.status === 'FAILED').length;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group">
                    <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                    {unreadCount > 0 && (
                        <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full border-2 border-white"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md bg-slate-50 p-0 flex flex-col border-l">
                <div className="p-6 pb-4 bg-white border-b flex justify-between items-center">
                    <SheetHeader className="text-left space-y-1">
                        <SheetTitle className="text-lg font-bold">Activity Center</SheetTitle>
                        <SheetDescription className="text-xs">
                            Monitor background AI tasks and file processing
                        </SheetDescription>
                    </SheetHeader>
                    {jobs.some(j => j.status === 'COMPLETED' || j.status === 'FAILED') && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={dismissAllCompleted}
                            className="text-xs h-8 text-slate-500"
                        >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Clear Finished
                        </Button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {jobs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-3">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                <Bell className="h-5 w-5 text-slate-300" />
                            </div>
                            <p className="text-sm">You have no active or recent notifications.</p>
                        </div>
                    ) : (
                        jobs.map(job => (
                            <div 
                                key={job.id} 
                                className={`bg-white rounded-lg p-4 border relative transition-all
                                    ${job.status === 'FAILED' ? 'border-red-200 shadow-sm' : 
                                      job.status === 'COMPLETED' ? 'border-emerald-200 shadow-sm' : 
                                      'border-blue-200 shadow-md ring-1 ring-blue-50'}
                                `}
                            >
                                <button 
                                    onClick={() => dismissJob(job.id)}
                                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-full p-0.5"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                
                                <div className="flex items-start gap-3 w-[90%]">
                                    <div className="mt-0.5">
                                        {job.status === "PROCESSING" || job.status === "PENDING" ? (
                                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                        ) : job.status === "COMPLETED" ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="font-semibold text-sm text-slate-900 truncate">
                                            {job.title}
                                        </h4>
                                        {job.subtitle && (
                                            <p className="text-xs text-slate-500 truncate mt-0.5">{job.subtitle}</p>
                                        )}
                                        
                                        <div className="mt-2 text-xs font-medium">
                                            {job.status === "FAILED" ? (
                                                <span className="text-red-600 line-clamp-2">{job.error}</span>
                                            ) : job.status === "COMPLETED" ? (
                                                <span className="text-emerald-600">{job.step}</span>
                                            ) : (
                                                <span className="text-blue-600">{job.step}</span>
                                            )}
                                        </div>

                                        {(job.status === "PROCESSING" || job.status === "PENDING") && (
                                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                                                <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-full"></div>
                                            </div>
                                        )}

                                        {/* Action Link to the Context */}
                                        <div className="mt-3 flex items-center justify-between text-xs">
                                            <Link 
                                                href={`/dashboard/clients/${job.clientId}${job.targetTab ? `?tab=${job.targetTab}` : ''}`}
                                                className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                View Client →
                                            </Link>
                                            <div className="text-slate-400">
                                                {new Date(job.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                {job.status === "PROCESSING" && <JobTimer />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function JobTimer() {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <span className="ml-2 font-mono">
            ({Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')})
        </span>
    );
}
