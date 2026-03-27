import Link from "next/link"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MachineStatusBadge } from "./MachineStatusBadge"
import { Wrench, FileText, Activity } from "lucide-react"
import { Machine } from "@/types/schema"

export function MachineCard({ machine }: { machine: any }) {
    // Derived name from make + model
    const machineName = `${machine.make} ${machine.model}`
    const serialNumber = machine.serialNumber

    return (
        <Card className="overflow-hidden group hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md border-slate-100">
            <div className="relative h-48 bg-slate-50 flex items-center justify-center overflow-hidden">
                <div className="bg-white p-6 rounded-full shadow-inner">
                    <Wrench className="h-12 w-12 text-slate-200 group-hover:text-primary/20 transition-colors" />
                </div>
                <div className="absolute top-3 right-3">
                    {/* Simplified status badge for now */}
                    <div className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-100">
                        Operational
                    </div>
                </div>
            </div>

            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <Link href={`/dashboard/machines/${machine.id}`} className="group-hover:opacity-80 transition-opacity">
                        <h3 className="font-bold text-lg text-primary tracking-tight group-hover:text-primary/70 transition-colors">
                            {machineName}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5 uppercase tracking-wider">
                            SN: {serialNumber}
                        </p>
                    </Link>
                </div>
            </CardHeader>

            <CardContent className="pb-4">
                <div className="grid grid-cols-2 gap-2 text-[11px] uppercase tracking-wider font-semibold">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Activity className="w-3.5 h-3.5 text-slate-300" />
                        <span>{machine.currentHours || 0} h</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                        <FileText className="w-3.5 h-3.5 text-slate-300" />
                        <span>{machine.documents?.length || 0} Docs</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-0 bg-slate-50/30 border-t border-slate-50 p-4 flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1 w-full rounded-lg border-slate-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all font-semibold text-xs">
                    <Link href={`/dashboard/machines/${machine.id}`}>
                        Voir Détails
                    </Link>
                </Button>
                <Button size="sm" variant="ghost" className="px-3 rounded-lg hover:bg-primary/5 hover:text-primary">
                    <Wrench className="w-4 h-4" />
                </Button>
            </CardFooter>
        </Card>
    )
}
