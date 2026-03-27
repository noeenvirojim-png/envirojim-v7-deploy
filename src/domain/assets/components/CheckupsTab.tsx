import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, XCircle, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Checklist {
    id: string;
    status: string;
    is_compliant: boolean;
    created_at: string;
    technician_user_id: string; // Could be expanded to user object
}

interface CheckupsTabProps {
    checklists: Checklist[];
}

export function CheckupsTab({ checklists }: CheckupsTabProps) {
    if (!checklists || checklists.length === 0) {
        return (
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Daily Checkups</CardTitle>
                    <CardDescription>No checkups recorded yet for this machine.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                    Daily Checkup History
                </CardTitle>
                <CardDescription>
                    Automated daily reports (Morning/Evening)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {checklists.map((check) => {
                        const date = new Date(check.created_at).toLocaleDateString('en-CA', {
                            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        });

                        return (
                            <div key={check.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border hover:border-brand-primary/50 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "p-2 rounded-full",
                                        check.is_compliant ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                    )}>
                                        {check.is_compliant ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm">
                                            {check.is_compliant ? "Compliant - Morning Check" : "Issues Flagged - Morning Check"}
                                        </h4>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {date}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                Technician
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-xs font-bold uppercase",
                                        check.is_compliant ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                                    )}>
                                        {check.status}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
