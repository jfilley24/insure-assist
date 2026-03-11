import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Only allow users with actual roles to access the Dashboard shell 
    return (
        <ProtectedRoute allowedRoles={["broker_admin", "agent", "assistant", "csr"]}>
            <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
                <Sidebar />
                <div className="flex-1 w-full pt-16 md:pt-0 pb-12 flex flex-col h-screen overflow-hidden">
                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto w-full relative">
                        {children}
                    </div>
                </div>
                <Toaster position="bottom-right" richColors />
            </div>
        </ProtectedRoute>
    );
}
