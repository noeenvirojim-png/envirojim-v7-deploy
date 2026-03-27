export default function HeartbeatPage() {
    return (
        <div style={{ padding: 100, background: 'black', color: 'lime' }}>
            <h1>HEARTBEAT OK</h1>
            <p>Timestamp: {new Date().toISOString()}</p>
        </div>
    );
}
