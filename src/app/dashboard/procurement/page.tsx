import { getPartOrders } from '@/domain/procurement/actions/parts'
import { Badge } from '@/components/ui/badge'

export default async function ProcurementPage() {
  const orders = await getPartOrders()

  return (
    <div className="p-12 space-y-12">
      <header className="border-b-8 border-slate-900 pb-6 flex justify-between items-end">
        <h1 className="text-8xl font-black uppercase tracking-tighter leading-none">Procurement</h1>
        <button className="bg-slate-900 text-white px-10 py-4 font-black uppercase text-xl shadow-[10px_10px_0px_0px_rgba(59,130,246,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">New Order</button>
      </header>

      <div className="space-y-6">
        {orders.map((order: any) => (
          <div key={order.id} className="p-8 border-4 border-slate-900 bg-white grid grid-cols-4 items-center gap-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-colors">
            <div>
              <div className="text-xs font-bold opacity-50 uppercase tracking-widest">Order ID</div>
              <div className="font-mono text-sm font-bold">{order.id.split('-')[0]}</div>
            </div>
            <div>
              <div className="text-xs font-bold opacity-50 uppercase tracking-widest">Date</div>
              <div className="font-bold">{new Date(order.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs font-bold opacity-50 uppercase tracking-widest">Items</div>
              <div className="font-bold text-2xl">{order.items?.length || 0}</div>
            </div>
            <div className="flex justify-end">
              <Badge className="text-lg px-6 py-2 font-black uppercase bg-slate-900 text-white border-none">{order.status}</Badge>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="p-20 border-4 border-dashed border-slate-400 text-center opacity-40">
            <h2 className="text-4xl font-black uppercase">No active orders</h2>
          </div>
        )}
      </div>
    </div>
  )
}
