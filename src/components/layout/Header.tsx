"use client"

import { Bell, Search, User, SearchIcon } from "lucide-react"
import { Logo } from "@/components/ui/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
    return (
        <header className="sticky top-4 z-[40] w-[calc(100%-2rem)] mx-4 mt-4 rounded-2xl titan-glass overflow-hidden border-white/5 shadow-2xl">
            <div className="container flex h-16 items-center px-6">
                <div className="mr-8 hidden md:flex items-center gap-3 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
                    <span className="text-[10px] font-black text-primary underline decoration-primary/30 underline-offset-4 uppercase tracking-[0.25em]">Command Center</span>
                </div>

                <div className="flex flex-1 items-center justify-between space-x-4 md:justify-end">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                        <div className="relative group">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-all duration-300" />
                            <Input
                                placeholder="Search the industrial matrix..."
                                className="pl-11 h-11 bg-slate-950/40 border-white/5 focus-visible:ring-primary/40 focus-visible:bg-slate-950/60 transition-all duration-300 rounded-xl md:w-[350px] lg:w-[450px] text-sm text-slate-200"
                            />
                        </div>
                    </div>
                    <nav className="flex items-center space-x-3">
                        <Button variant="ghost" size="icon" className="relative group h-11 w-11 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/5 transition-all duration-300">
                            <Bell className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                            <span className="absolute top-3 right-3 h-2 w-2 bg-primary rounded-full border-2 border-[#0f172a] shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                        </Button>
                        <Button variant="ghost" size="icon" className="group h-11 w-11 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/5 transition-all duration-300">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-all">
                                <User className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                            </div>
                        </Button>
                    </nav>
                </div>
            </div>
        </header>
    )
}
