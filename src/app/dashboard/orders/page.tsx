import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { OrderManagementTable } from '@/domain/orders/components/OrderManagementTable';
import { OrderCreatorWrapper } from '@/domain/orders/components/OrderCreatorWrapper';
import { PartOrder } from '@/types/schema';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Parts Request Hub | EnviroJim',
    description: 'Gestion centralisée des pièces et commandes.',
};

export default async function OrdersDashboard() {
    const user = await getCurrentUserFromSession();
    if (!user) redirect('/login');

    const supabase = createClient();
    
    // Fetch orders with machine details
    const { data: orders } = await supabase.from('part_orders')
        .select('*, machine:machines(*)')
        .order('created_at', { ascending: false });

    const isAdmin = ['SUPER_ADMIN', 'ENVIROJIM_ADMIN'].includes(user.role);

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                        Orders <span className="text-brand-primary">&</span> Parts
                    </h1>
                    <p className="text-slate-500 font-medium">Internal Procurement & Logistics Management</p>
                </div>
                <OrderCreatorWrapper isAdmin={isAdmin} />
            </div>

            <OrderManagementTable orders={(orders as any) || []} isAdmin={isAdmin} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-200/50">
                    <h3 className="font-black uppercase tracking-widest text-xs opacity-70 mb-2">Pending Orders</h3>
                    <p className="text-4xl font-black">{(orders?.filter(o => o.internal_status === 'REQUEST_ENTRY').length) || 0}</p>
                </div>
                <div className="p-6 rounded-3xl bg-brand-primary text-white shadow-xl shadow-emerald-200/50">
                    <h3 className="font-black uppercase tracking-widest text-xs opacity-70 mb-2">Internal Receipt</h3>
                    <p className="text-4xl font-black">{(orders?.filter(o => o.internal_status === 'INTERNAL_RECEIVED').length) || 0}</p>
                </div>
                <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-200/50">
                    <h3 className="font-black uppercase tracking-widest text-xs opacity-70 mb-2">Client Confirmed</h3>
                    <p className="text-4xl font-black">{(orders?.filter(o => o.client_status === 'CONFIRMED').length) || 0}</p>
                </div>
            </div>
        </div>
    );
}
