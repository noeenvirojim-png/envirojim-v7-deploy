import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateQuotePage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">New Parts Request</h1>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Machine</Label>
                        <Input placeholder="Select Machine..." />
                    </div>
                    <div className="bg-amber-50 p-4 rounded text-amber-800 text-sm">
                        This feature is currently under maintenance. Please use the Voice Diagnosis to order parts in the meantime.
                    </div>
                    <Button disabled>Create Request</Button>
                </CardContent>
            </Card>
        </div>
    );
}
