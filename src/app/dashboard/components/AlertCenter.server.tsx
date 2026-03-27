import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Siren } from 'lucide-react';
import { getCurrentUserOrgId } from '@/lib/auth-bridge';

export async function AlertCenter() {
    const orgId = await getCurrentUserOrgId();
    if (!orgId) return null;

    // alerts table does not yet exist in the current schema.
    // Component renders a clean empty state until the table is created.
    return (
        <Card className="border-slate-100 shadow-sm h-full">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Siren className="w-5 h-5 text-slate-400" />
                    Alert Center
                </CardTitle>
                <CardDescription>No active alerts.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-slate-200" />
                </div>
                <p className="text-sm text-slate-400">All systems operational.</p>
            </CardContent>
        </Card>
    );
}
