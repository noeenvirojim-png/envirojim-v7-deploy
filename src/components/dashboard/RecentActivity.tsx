import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Activity, FileText, Wrench, ShoppingCart, User } from "lucide-react"

type ActivityType = 'MACHINE_CREATED' | 'DOCUMENT_UPLOADED' | 'PART_REQUESTED' | 'MAINTENANCE_LOGGED' | 'USER_LOGIN'

interface ActivityItem {
    id: string
    type: ActivityType
    title: string
    description: string
    timestamp: string
    user?: string
}

const getActivityIcon = (type: ActivityType) => {
    switch (type) {
        case 'MACHINE_CREATED': return Wrench
        case 'DOCUMENT_UPLOADED': return FileText
        case 'PART_REQUESTED': return ShoppingCart
        case 'MAINTENANCE_LOGGED': return Activity
        case 'USER_LOGIN': return User
        default: return Activity
    }
}

export function RecentActivity({ activities }: { activities: ActivityItem[] }) {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {activities.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">No recent activity found.</p>
                    ) : (
                        activities.map((activity) => {
                            const Icon = getActivityIcon(activity.type)
                            return (
                                <div key={activity.id} className="flex items-center">
                                    <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                        <Icon className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{activity.title}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {activity.user && <span className="font-semibold text-primary mr-1">{activity.user}</span>}
                                            {activity.description}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium text-xs text-muted-foreground">
                                        {activity.timestamp}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
