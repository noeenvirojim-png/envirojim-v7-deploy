import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"
import { MobileNav } from "@/components/dashboard/MobileNav"
import { getCurrentUserFromSession } from "@/lib/auth-bridge"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUserFromSession();
    if (!user) redirect("/login");

    return (
        <div className="flex h-screen titan-bg overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <Sidebar
                userRole={user.role}
                userName={user.full_name || user.email}
                userEmail={user.email}
                organizationName={user.organization_name}
            />

            {/* Mobile Navigation (Only visible on small screens to prevent layout leakage) */}
            <div className="md:hidden">
                <MobileNav userRole={user.role} />
            </div>

            <div className="flex flex-1 flex-col overflow-hidden relative">
                {/* Subtle Background Glows */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none -z-10" />

                {/* Header */}
                <Header />

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 text-slate-200">
                    <div className="max-w-7xl mx-auto space-y-8 animate-in-up">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
