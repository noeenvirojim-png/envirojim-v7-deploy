import { redirect } from "next/navigation"

import { Logo } from '@/components/ui/Logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Zap, Database } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="border-b bg-white/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Logo size={32} />
                    <Link href="/login">
                        <Button variant="outline" size="sm">Login</Button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative py-20 lg:py-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-3xl">
                        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6">
                            Next-Gen Industrial <span className="text-brand-primary">SaaS Platform</span>
                        </h1>
                        <p className="text-xl text-slate-500 mb-10 leading-relaxed">
                            EnviroJim V7.2-DEV delivers machine-centric intelligence, AI-guided diagnostics, and seamless parts management for the modern enterprise.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/login">
                                <Button size="lg" className="w-full sm:w-auto gap-2">
                                    Get Started <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="w-full sm:w-auto">
                                View Demo
                            </Button>
                        </div>
                    </div>
                </div>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50 -skew-x-12 translate-x-1/4 -z-10" />
            </header>

            {/* Features Grid */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                                <Shield className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Enterprise Stability</h3>
                            <p className="text-slate-500">Zero-crash architecture with RLS-locked data isolation. Built for reliability.</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6 text-amber-600">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">AI Diagnostics</h3>
                            <p className="text-slate-500">Machine-centric PDF analysis and real-time diagnostic suggestions driven by Gemini.</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
                                <Database className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Smart Procurement</h3>
                            <p className="text-slate-500">Auto-filtering parts database with intelligent machine grouping and tracking.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400 text-sm">
                    &copy; 2026 EnviroJim Industries V7.2-DEV. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
