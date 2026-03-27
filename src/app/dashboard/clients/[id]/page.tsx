import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Wrench, Users, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

async function getClientDetails(id: string) {
    const supabase = createClient();

    // Fetch Organization
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

    if (orgError || !org) return null;

    // Fetch Machines
    const { data: machines } = await supabase
        .from('machines')
        .select('*')
        .eq('owner_org_id', id);

    // Fetch Users (Contacts)
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('org_id', id);

    return { org, machines: machines || [], users: users || [] };
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
    const data = await getClientDetails(params.id);

    if (!data) notFound();

    const { org, machines, users } = data;

    return (
        <div className="space-y-8 animate-in fade-in py-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/clients">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                        <Building2 className="w-3 h-3" />
                        <span>Client ID: {org.qb_customer_id || 'N/A'}</span>
                        <span className="text-slate-300">|</span>
                        <span>{machines.length} Machines</span>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: Fleet Overview */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="glass-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Wrench className="w-5 h-5 text-brand-primary" />
                                Machine Fleet
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                                    <tr>
                                        <th className="p-4 font-medium">Machine</th>
                                        <th className="p-4 font-medium">Serial</th>
                                        <th className="p-4 font-medium">Hours</th>
                                        <th className="p-4 font-medium">Location</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-slate-700 dark:text-slate-300">
                                    {machines.map((machine: any) => (
                                        <tr key={machine.id} className="hover:bg-slate-50/50">
                                            <td className="p-4 font-medium">
                                                {machine.make} {machine.model}
                                            </td>
                                            <td className="p-4 font-mono text-xs">{machine.serial_number}</td>
                                            <td className="p-4">{machine.current_hours} h</td>
                                            <td className="p-4 flex items-center gap-1 text-slate-500">
                                                <MapPin className="w-3 h-3" /> {machine.city}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Link href={`/dashboard/machines/${machine.id}`} className="text-brand-primary hover:underline font-medium">
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {machines.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                                No machines assigned to this client yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Contacts & Info */}
                <div className="space-y-6">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-brand-secondary" />
                                Key Contacts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {users.map((user: any) => (
                                <div key={user.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                                        {user.full_name.charAt(0)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.full_name}</p>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">{user.role}</p>
                                        <div className="flex flex-col gap-1 mt-2 text-xs text-slate-600">
                                            <div className="flex items-center gap-1">
                                                <Mail className="w-3 h-3 text-slate-400" />
                                                {user.email}
                                            </div>
                                            {user.phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-slate-400" />
                                                    {user.phone}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {users.length === 0 && (
                                <p className="text-sm text-slate-500 italic">No registered users.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="glass-card bg-slate-50 dark:bg-slate-900 border-none">
                        <CardContent className="p-6">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Internal Note</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Use this client ID ({org.qb_customer_id || 'MISSING'}) for all Quickbooks sync operations.
                                Ensure PO numbers are validated before verifying large orders.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
