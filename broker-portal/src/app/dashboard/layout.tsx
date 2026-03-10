import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";

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
                <div className="flex-1 w-full pt-16 md:pt-0 pb-12">
                    {children}
                </div>
            </div>
        </ProtectedRoute>
    );
}
