"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MobileNavProps {
    userRole?: string
}

export function MobileNav({ userRole = 'admin' }: MobileNavProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const pathname = usePathname()

    const allRoutes = [
        { href: "/dashboard", label: "Dashboard", roles: ['SUPER_ADMIN', 'ENVIROJIM_ADMIN', 'DEALER_ADMIN', 'SERVICE_PROVIDER_ADMIN', 'CLIENT_ADMIN', 'TECHNICIAN', 'OPERATOR', 'ADMIN'] },
        { href: "/dashboard/machines", label: "Machines", roles: ['SUPER_ADMIN', 'ENVIROJIM_ADMIN', 'DEALER_ADMIN', 'SERVICE_PROVIDER_ADMIN', 'CLIENT_ADMIN', 'TECHNICIAN', 'ADMIN'] },
        { href: "/dashboard/inventory", label: "Parts & Inventory", roles: ['SUPER_ADMIN', 'ENVIROJIM_ADMIN', 'DEALER_ADMIN', 'SERVICE_PROVIDER_ADMIN', 'TECHNICIAN', 'ADMIN'] },
    ]

    const normalizedRole = userRole?.toUpperCase() || 'OPERATOR';
    const routes = allRoutes.filter(route => 
        route.roles.includes(normalizedRole) || 
        (normalizedRole === 'ADMIN' && (route.roles.includes('SUPER_ADMIN') || route.roles.includes('ENVIROJIM_ADMIN')))
    )

    return (
        <div className="md:hidden flex items-center p-4 titan-glass m-2 rounded-2xl border-white/5 shadow-xl">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
            </Button>
            <span className="ml-4 font-outfit font-black text-white uppercase tracking-tighter">
                ENVIRO<span className="text-primary">JIM</span>
            </span>

            {isOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto titan-bg p-8 shadow-2xl sm:max-w-sm border-r border-white/5 animate-in slide-in-from-left duration-500">
                        <div className="flex items-center justify-between mb-12">
                            <span className="font-outfit font-black text-2xl text-white uppercase tracking-tighter">
                                MENU<span className="text-primary italic ml-1 opacity-50 underline underline-offset-8">V8</span>
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                                <X className="h-6 w-6" />
                                <span className="sr-only">Close menu</span>
                            </Button>
                        </div>
                        <nav className="flex flex-col space-y-3">
                            {routes.map((route) => (
                                <Link
                                    key={route.href}
                                    href={route.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center px-6 py-4 rounded-2xl text-lg font-bold transition-all duration-300",
                                        pathname === route.href 
                                            ? "bg-primary text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
                                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    {route.label}
                                </Link>
                            ))}
                            <div className="pt-12 mt-12 border-t border-white/5">
                                <Button variant="destructive" className="w-full justify-start h-12 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-red-900/20">
                                    Sign Out
                                </Button>
                            </div>
                        </nav>
                        <div className="absolute bottom-8 left-8">
                            <p className="text-[10px] font-black tracking-[0.3em] text-slate-600 uppercase">Industrial Intelligence</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
