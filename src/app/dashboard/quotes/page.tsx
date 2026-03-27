import { getPartRequests } from '@/domain/procurement/actions/parts';
import { RequestStatus } from '@/types/schema';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';
import ListSkeleton from '@/components/dashboard/ListSkeleton';

const STEPS: RequestStatus[] = [
    'DRAFT', 'PENDING', 'PENDING_APPROVAL', 'ORDERED',
    'SHIPPED', 'DELIVERED', 'CLOSED'
];

export default async function QuotesPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Parts Workflow Tracker</h1>
                <Link href="/dashboard/quotes/create">
                    <Button variant="action">+ New Request</Button>
                </Link>
            </div>

            <Suspense fallback={<ListSkeleton />}>
                <OrderList />
            </Suspense>
        </div>
    );
}

async function OrderList() {
    const orders = await getPartRequests();

    if (orders.length === 0) {
        return (
            <div className="glass-card rounded-xl p-12 text-center">
                <p className="text-slate-500 mb-4">No part requests yet</p>
                <Link href="/dashboard/quotes/create">
                    <Button variant="action">Create First Request</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {orders.map(order => {
                // Calculate total from items
                const items = (order as any).items || [];
                const total = items.reduce((sum: number, item: any) => {
                    return sum + (item.final_price_cad || 0) * item.quantity;
                }, 0);

                return (
                    <div key={order.id} className="glass-card rounded-xl p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">Request #{order.id.slice(0, 8)}</h3>
                                <span className="text-sm text-slate-500">
                                    {items.length} item{items.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="font-mono font-medium">
                                {total > 0 ? `$${total.toFixed(2)}` : '-'}
                            </div>
                        </div>

                        {/* Red/Green Dot visualizer */}
                        <div className="relative flex items-center justify-between">
                            {/* Progress Line */}
                            <div className="absolute left-0 top-1/2 h-1 w-full bg-slate-100 dark:bg-slate-800 -z-10" />

                            {STEPS.map((step, index) => {
                                const isCompleted = STEPS.indexOf(order.status as RequestStatus) >= index;
                                const isCurrent = order.status === step;

                                return (
                                    <div key={step} className="flex flex-col items-center gap-2">
                                        <div
                                            className={`h-4 w-4 rounded-full border-2 transition-all ${isCompleted
                                                ? 'bg-brand-success border-brand-success scale-110' // Green Dot
                                                : 'bg-white border-slate-300 dark:bg-slate-900'     // Empty Dot
                                                } ${isCurrent ? 'ring-4 ring-brand-success/20' : ''}`}
                                        />
                                        {/* Only show label for current or first/last to avoid clutter */}
                                        {(isCurrent || index === 0 || index === STEPS.length - 1) && (
                                            <span className="absolute mt-6 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                                                {step.replace(/_/g, ' ')}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

