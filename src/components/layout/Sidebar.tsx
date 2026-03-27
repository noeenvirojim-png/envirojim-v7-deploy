'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/Logo'
import {
    LayoutDashboard,
    Wrench,
    Settings,
    LogOut,
    Menu,
    ChevronLeft,
    ClipboardList,
    GraduationCap,
    PackageSearch,
    Hotel,
    Building2,
    Briefcase,
    ShoppingCart,
    FileText,
    Stethoscope,
    HardHat,
    MapPin,
    Store,
} from 'lucide-react'

interface SidebarProps {
    userRole?: string
    userName?: string
    userEmail?: string
    organizationName?: string | null
}

export function Sidebar({ userRole = 'admin', userName, userEmail, organizationName }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const pathname = usePathname()

    const navItems = [
        { title: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { title: 'Machines', href: '/dashboard/machines', icon: Wrench },
        { title: 'Tickets', href: '/dashboard/tickets', icon: ClipboardList },
        { title: 'Work Orders', href: '/dashboard/work-orders', icon: FileText },
        { title: 'Interventions', href: '/dashboard/interventions', icon: HardHat },
        { title: 'Diagnosis', href: '/dashboard/diagnosis', icon: Stethoscope },
        { title: 'Inventory', href: '/dashboard/inventory', icon: PackageSearch },
        { title: 'Procurement', href: '/dashboard/procurement', icon: ShoppingCart },
        { title: 'Orders', href: '/dashboard/orders', icon: Briefcase },
        { title: 'Quotes', href: '/dashboard/quotes', icon: Briefcase },
        { title: 'Technicians', href: '/dashboard/technicians', icon: GraduationCap },
        { title: 'Clients', href: '/dashboard/clients', icon: Hotel },
        { title: 'Sites', href: '/dashboard/sites', icon: MapPin },
        { title: 'Dealers', href: '/dashboard/dealers', icon: Store },
        { title: 'Settings', href: '/dashboard/settings', icon: Settings },
    ]

    const displayName = userName || userEmail || 'User'
    const initials = displayName
        .split(/[\s@]+/)
        .slice(0, 2)
        .map(s => s[0]?.toUpperCase() || '')
        .join('')

    return (
        <aside
            className={cn(
                "h-[calc(100vh-2rem)] m-4 rounded-3xl bg-slate-900 text-slate-100 flex flex-col transition-all duration-500 shadow-2xl relative z-50 overflow-hidden",
                collapsed ? "w-20" : "w-72"
            )}
        >
            {/* Header with Logo */}
            <div className="h-20 flex items-center px-6 border-b border-white/5 justify-between bg-white/5">
                <div className={cn("transition-all duration-300", collapsed ? "opacity-100" : "opacity-100")}>
                    <Logo size={collapsed ? 32 : 40} showText={!collapsed} />
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
                >
                    {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto scrollbar-none">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                                    isActive
                                        ? "bg-primary text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110", isActive ? "text-white" : "group-hover:text-primary")} />
                                {!collapsed && <span className="text-sm tracking-tight">{item.title}</span>}

                                {isActive && (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-l-full" />
                                )}

                                {collapsed && (
                                    <div className="absolute left-16 bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 border border-white/10 shadow-2xl z-[100] translate-x-2 group-hover:translate-x-0">
                                        {item.title}
                                    </div>
                                )}
                            </div>
                        </Link>
                    )
                })}
            </nav>

            {/* User & Logout */}
            <div className="p-4 border-t border-white/5 bg-white/5">
                <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 p-[1px] shadow-lg flex-shrink-0">
                        <div className="h-full w-full bg-slate-900 rounded-[14px] flex items-center justify-center text-xs font-black text-white">
                            {initials}
                        </div>
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-white truncate uppercase tracking-tight">{displayName}</p>
                            <p className="text-[9px] text-primary font-bold truncate uppercase tracking-widest opacity-80">
                                {organizationName || 'Organization'}
                            </p>
                        </div>
                    )}
                    {!collapsed && (
                        <form action="/auth/signout" method="post">
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl">
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </aside>
    )
}
