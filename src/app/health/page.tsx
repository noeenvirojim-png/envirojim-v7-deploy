
export default function HealthPage() {
    return (
        <div className="p-20 font-mono">
            <h1 className="text-2xl font-bold text-green-600">CANARY_HEALTH_OK</h1>
            <p className="mt-4 text-slate-500">Timestamp: {new Date().toISOString()}</p>
            <hr className="my-4" />
            <div className="space-y-2">
                <p>Environment: {process.env.NODE_ENV}</p>
                <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'CONFIGURED' : 'MISSING'}</p>
            </div>
        </div>
    );
}
