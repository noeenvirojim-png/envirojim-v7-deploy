import { Skeleton } from "@/components/ui/skeleton";

export default function ListSkeleton() {
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card rounded-xl p-6 space-y-4">
                    <div className="flex justify-between">
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                </div>
            ))}
        </div>
    );
}
