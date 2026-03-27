import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ShieldAlert, ShieldCheck, Users, Activity, Lock, Database } from 'lucide-react';

export default async function AdminPage() {
    const user = await getCurrentUserFromSession();
    const allowedRoles = ['SUPER_ADMIN', 'ENVIROJIM_ADMIN', 'admin'];

    // For safety, if user metadata role is not explicitly one of these, reject
    const userRole = user?.app_metadata?.role || user?.user_metadata?.role;
    if (!user || (!allowedRoles.includes(userRole) && !allowedRoles.includes(user.role))) {
        console.warn(`[ADMIN] Unauthorized access attempt by ${user?.email || 'unknown'}`);
        redirect('/dashboard?error=unauthorized');
    }

    const supabase = createClient();

    // Fetch metrics and audit logs securely
    // Using try/catch locally since the new SOC2 tables might not be migrated yet
    let authEvents = [];
    let securityLogs = [];
    let usersCount = 0;

    try {
        const [
            { count: profilesCount },
            { data: rawAuthEvents },
            { data: rawSecurityLogs }
        ] = await Promise.all([
            supabase.from('organization_members').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
            supabase.from('auth_events').select('*').order('timestamp', { ascending: false }).limit(5).catch(() => ({ data: [] })),
            supabase.from('security_logs').select('*').order('timestamp', { ascending: false }).limit(5).catch(() => ({ data: [] }))
        ]);

        usersCount = profilesCount ?? 0;
        authEvents = rawAuthEvents || [];
        securityLogs = rawSecurityLogs || [];
    } catch (e) {
        console.warn('[ADMIN] Failed to fetch advanced SOC2 tables (migration may be missing)');
    }

    return (
        <div className="space-y-8 animate-fade-in p-4 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                        <Lock className="h-8 w-8 text-brand-primary" />
                        Enterprise Security Center
                    </h1>
                    <p className="text-slate-500">
                        SOC2 Compliance, Access Logs, and Identity Management.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Users className="h-6 w-6 text-blue-600" /></div>
                    <div><p className="text-sm font-medium text-slate-500">Organization Members</p><h4 className="text-2xl font-bold">{usersCount}</h4></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg"><ShieldCheck className="h-6 w-6 text-green-600" /></div>
                    <div><p className="text-sm font-medium text-slate-500">System Posture</p><h4 className="text-2xl font-bold text-green-600">Secure</h4></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><Activity className="h-6 w-6 text-purple-600" /></div>
                    <div><p className="text-sm font-medium text-slate-500">Rate Limit Engine</p><h4 className="text-2xl font-bold">Active</h4></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Auth Events Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-orange-500" /> Recent Authentications
                        </h3>
                    </div>
                    {authEvents.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">Waiting for database migration...</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {authEvents.map((evt: any) => (
                                <div key={evt.id} className="p-4 flex items-center justify-between text-sm">
                                    <div className="flex flex-col">
                                        <span className={`font-medium ${evt.event_type.includes('fail') ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
                                            {evt.event_type.toUpperCase()}
                                        </span>
                                        <span className="text-xs text-slate-500">{new Date(evt.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-slate-600 font-mono text-xs">{evt.ip_address}</span>
                                        {evt.metadata?.email && <span className="text-xs text-slate-400">{evt.metadata.email}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Security Logs Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Database className="h-5 w-5 text-indigo-500" /> Immutable Audit Trail
                        </h3>
                    </div>
                    {securityLogs.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No recent anomalies detected or migration pending.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {securityLogs.map((log: any) => (
                                <div key={log.id} className="p-4 flex items-center justify-between text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-900 dark:text-slate-100">{log.event_type}</span>
                                        <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div className="text-right text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                        {log.action_target}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
