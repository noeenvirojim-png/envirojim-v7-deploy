import { useState, useEffect } from 'react';

export interface HealthStatus {
    status: 'ok' | 'degraded' | 'error';
    total: number;
    valid: number;
    invalid: number;
    message?: string;
}

export function useRuntimeValidation() {
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch('/api/health/tickets');
                if (!res.ok) throw new Error('Health probe failed');
                const data = await res.json();
                setHealth(data);

                if (data.status !== 'ok') {
                    console.warn(`[RUNTIME VALIDATION] Tickets page integrity: ${data.status.toUpperCase()}`, data);
                }
            } catch (err) {
                console.error('[RUNTIME VALIDATION] Integrity probe failed', err);
                setHealth({
                    status: 'error',
                    total: 0,
                    valid: 0,
                    invalid: 0,
                    message: 'Runtime integrity check failed to execute.'
                });
            } finally {
                setLoading(false);
            }
        };

        checkHealth();
    }, []);

    return { health, loading };
}
