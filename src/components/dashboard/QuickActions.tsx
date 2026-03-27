import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileUp, ClipboardList, PenTool } from "lucide-react"

export function QuickActions({ userRole }: { userRole?: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <Button asChild className="w-full justify-start gap-2" variant="outline">
                    <Link href="/dashboard/machines/new">
                        <PlusCircle className="w-4 h-4" />
                        Register Machine
                    </Link>
                </Button>
                <Button asChild className="w-full justify-start gap-2" variant="outline">
                    <Link href="/dashboard/parts">
                        <ClipboardList className="w-4 h-4" />
                        Request Parts
                    </Link>
                </Button>
                <Button asChild className="w-full justify-start gap-2" variant="outline">
                    <Link href="/dashboard/machines">
                        <FileUp className="w-4 h-4" />
                        Upload Manual
                    </Link>
                </Button>
                {userRole === 'technician' && (
                    <Button asChild className="w-full justify-start gap-2" variant="outline">
                        <Link href="/dashboard/diagnostics">
                            <PenTool className="w-4 h-4" />
                            Start Diagnosis
                        </Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
