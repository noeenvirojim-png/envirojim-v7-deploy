import { Sidebar } from "@/components/layout/Sidebar"

interface DashboardLayoutProps {
    children: React.ReactNode
    userRole?: string
}

export default function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <Sidebar userRole={userRole} />
            <main className="flex-1 overflow-y-auto relative">
                {children}
            </main>
        </div>
    )
}
