import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { Sparkline } from "./Sparkline"

interface StatCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    description?: string
    trend?: {
        value: number
        label: string
        positive?: boolean
        data?: number[] // Array for sparkline
    }
}

export function StatCard({ title, value, icon: Icon, description, trend }: StatCardProps) {
    return (
        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-x-4">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                            <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">{title}</p>
                    </div>
                    {trend && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {trend.positive ? '+' : ''}{trend.value}%
                        </span>
                    )}
                </div>

                <div className="mt-4 flex items-end justify-between">
                    <div>
                        <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                            {value}
                        </div>
                        {description && (
                            <p className="text-xs text-slate-400 mt-1">{description}</p>
                        )}
                    </div>

                    {trend?.data && (
                        <div className="mb-1 text-slate-900/20">
                            <Sparkline
                                data={trend.data}
                                width={80}
                                height={32}
                                color={trend.positive ? '#10b981' : '#ef4444'}
                            />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
