import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle, AlertOctagon, Clock } from "lucide-react"

type MachineStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE' | 'REPAIR_NEEDED'

interface MachineStatusBadgeProps {
    status: string
}

export function MachineStatusBadge({ status }: MachineStatusBadgeProps) {
    const normalizedStatus = status.toUpperCase() as MachineStatus

    switch (normalizedStatus) {
        case 'OPERATIONAL':
            return (
                <Badge variant="success" className="gap-1.5 pl-1.5 pr-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Operational
                </Badge>
            )
        case 'MAINTENANCE':
            return (
                <Badge variant="warning" className="gap-1.5 pl-1.5 pr-2.5">
                    <Clock className="w-3.5 h-3.5" />
                    Maintenance
                </Badge>
            )
        case 'REPAIR_NEEDED':
            return (
                <Badge variant="destructive" className="gap-1.5 pl-1.5 pr-2.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Repair Needed
                </Badge>
            )
        case 'OFFLINE':
            return (
                <Badge variant="secondary" className="gap-1.5 pl-1.5 pr-2.5 text-slate-500 bg-slate-200">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    Offline
                </Badge>
            )
        default:
            return (
                <Badge variant="outline" className="gap-1.5 pl-1.5 pr-2.5">
                    Unknown
                </Badge>
            )
    }
}
