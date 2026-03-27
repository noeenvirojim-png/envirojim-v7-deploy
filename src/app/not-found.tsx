import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex h-screen flex-col items-center justify-center bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
            <div className="flex flex-col items-center space-y-4 text-center">
                <div className="rounded-full bg-slate-100 p-6 dark:bg-slate-800">
                    <FileQuestion className="h-12 w-12 text-slate-500" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Page Not Found</h2>
                <p className="text-slate-500 dark:text-slate-400">
                    Sorry, we couldn&apos;t find the page you&apos;re looking for.
                </p>
                <Link href="/dashboard">
                    <Button variant="industrial">Return to Dashboard</Button>
                </Link>
            </div>
        </div>
    );
}
