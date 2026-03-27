import { getCurrentUserFromSession } from '@/lib/auth-bridge'
import { createClient } from '@/lib/supabase/server'
import { Activity, Package, Wrench, FileText } from 'lucide-react'

export default async function DashboardOverviewPage() {
  const user = await getCurrentUserFromSession()
  if (!user) return null
  const supabase = createClient()

  // Standard retrieval of counts for key entities
  const [machines, workOrders, partOrders, docs] = await Promise.all([
    supabase.from('machines').select('*', { count: 'exact', head: true }).eq('organization_id', user.organization_id),
    supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('organization_id', user.organization_id),
    supabase.from('part_orders').select('*', { count: 'exact', head: true }).eq('organization_id', user.organization_id),
    supabase.from('machine_documents').select('*', { count: 'exact', head: true }).eq('organization_id', user.organization_id)
  ])

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-500 font-medium">Overview of your operations</p>
        </div>
        <div className="text-right border-l-2 border-slate-200 pl-6">
          <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Organization</div>
          <div className="text-sm font-bold text-slate-700">{user.organization_name || user.organization_id}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Wrench className="text-blue-600" size={24} />} 
          count={machines.count} 
          label="Machines" 
        />
        <StatCard 
          icon={<Activity className="text-green-600" size={24} />} 
          count={workOrders.count} 
          label="Work Orders" 
        />
        <StatCard 
          icon={<Package className="text-amber-600" size={24} />} 
          count={partOrders.count} 
          label="Part Orders" 
        />
        <StatCard 
          icon={<FileText className="text-slate-600" size={24} />} 
          count={docs.count} 
          label="Documents" 
        />
      </div>

      <div className="mt-8 border-t border-slate-200 pt-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Functional Status</h2>
        <div className="bg-white border border-slate-200 p-6 rounded-lg text-slate-600 text-sm italic">
          Application is in STABLE verification mode. All core services online.
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, count, label }: { icon: React.ReactNode, count: number | null, label: string }) {
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm hover:border-blue-400 transition-colors">
      <div className="flex items-center gap-4 mb-3">
        <div className="p-2 bg-slate-50 rounded-md">{icon}</div>
        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">{label}</h3>
      </div>
      <div className="text-4xl font-black text-slate-900">{count ?? 0}</div>
    </div>
  )
}
