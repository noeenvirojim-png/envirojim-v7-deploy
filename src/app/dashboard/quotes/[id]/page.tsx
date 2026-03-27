import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Mail, AlertTriangle } from 'lucide-react';
import { getCurrentUserId } from '@/lib/auth-bridge';
// @ts-ignore approveQuote export issue
import { getPartRequest, updatePartRequestStatus, approveQuote } from '@/domain/procurement/actions/parts';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

async function getQuote(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('part_requests')
        .select(`
            *,
            machine:machines(make, model, serial_number),
            requester:users(full_name, email),
            items:part_request_items(
                quantity,
                final_price_cad,
                part:parts_catalog(part_number, name)
            )
        `)
        .eq('id', id)
        .single();
    if (error) return null;
    return data;
}

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
    const userId = await getCurrentUserId();
    const quote = await getQuote(params.id);

    if (!quote) notFound();

    // Calculate Totals
    const items = quote.items || [];
    const subtotal = items.reduce((acc: number, item: any) => acc + (item.final_price_cad || 0) * item.quantity, 0);
    const tax = subtotal * 0.14975; // Quebec tax approx
    const total = subtotal + tax;

    const canApprove = quote.status === 'QUOTE_READY' || quote.status === 'SENT';
    // Assuming 'SENT' might also be approvable if auto-priced, but 'QUOTE_READY' is safer.
    // Let's assume EnviroJim admins move it to QUOTE_READY when prices are final.

    return (
        <div className="space-y-8 animate-in fade-in py-6 max-w-4xl mx-auto">
            <Link href="/dashboard/quotes">
                <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Workflow
                </Button>
            </Link>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Request #{quote.id.slice(0, 8)}</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-slate-500">{quote.machine.make} {quote.machine.model} ({quote.machine.serial_number})</span>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                             ${quote.status === 'WAITING_PO' ? 'bg-amber-100 text-amber-700' :
                                quote.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                            {quote.status.replace('_', ' ')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Items & Parts</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                                    <tr>
                                        <th className="p-4 font-medium">Part Number</th>
                                        <th className="p-4 font-medium">Description</th>
                                        <th className="p-4 font-medium text-right">Qty</th>
                                        <th className="p-4 font-medium text-right">Unit Price</th>
                                        <th className="p-4 font-medium text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.map((item: any) => (
                                        <tr key={item.part.part_number}>
                                            <td className="p-4 font-mono">{item.part.part_number}</td>
                                            <td className="p-4">{item.part.name}</td>
                                            <td className="p-4 text-right">{item.quantity}</td>
                                            <td className="p-4 text-right">
                                                {item.final_price_cad ? `$${item.final_price_cad.toFixed(2)}` : 'Pending'}
                                            </td>
                                            <td className="p-4 text-right font-medium">
                                                {item.final_price_cad ? `$${(item.final_price_cad * item.quantity).toFixed(2)}` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Tax (Est.)</span>
                                <span>${tax.toFixed(2)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-3">
                            {canApprove ? (
                                <form action={approveQuote.bind(null, quote.id)} className="w-full">
                                    <Button className="w-full bg-brand-success hover:bg-brand-success/90" size="lg">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        VALIDER
                                    </Button>
                                    <p className="text-[10px] text-center text-slate-400 mt-2">
                                        Automated trace generated.
                                    </p>
                                </form>
                            ) : quote.status === 'WAITING_PO' ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm w-full">
                                    <div className="flex items-center gap-2 font-bold mb-2">
                                        <Mail className="w-4 h-4" />
                                        Final Step Required
                                    </div>
                                    <p>
                                        Validation recorded. To finalize this order, you <strong>MUST send a confirmation email</strong> to <a href="mailto:orders@envirojim.com" className="underline">orders@envirojim.com</a>.
                                    </p>
                                    <p className="mt-2 text-xs opacity-80">
                                        This is an extra verification step outside the app.
                                    </p>
                                </div>
                            ) : (
                                <Button disabled className="w-full" variant="outline">
                                    {quote.status.replace('_', ' ')}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>

                    {quote.status === 'APPROVED' || quote.status === 'WAITING_PO' ? null : (
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border text-xs text-slate-500">
                            Prices are subject to availability.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
