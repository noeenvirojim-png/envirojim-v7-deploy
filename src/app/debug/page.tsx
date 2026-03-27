export default function DebugPage() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET';
    
    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>EnviroJim Forensic Diagnostic (V7.2)</h1>
            <hr />
            <p>Status: REACHABLE</p>
            <p>Supabase URL: {supabaseUrl}</p>
            <p>Anon Key Status: {anonKey}</p>
            <p>Timestamp: {new Date().toISOString()}</p>
            <hr />
            <p>If you see this, the domain and base Vercel routing are working.</p>
        </div>
    );
}
