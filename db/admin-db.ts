import { Pool, QueryResult, QueryResultRow } from 'pg';

/**
 * ⚠️ ADMIN DATABASE CONNECTION - DO NOT USE IN WEB APP ⚠️
 * 
 * This module uses a direct PostgreSQL connection which BYPASSES Row Level Security (RLS).
 * It acts as a SUPERUSER.
 * 
 * ALLOWED USAGE:
 * - Seeding scripts (seed.ts)
 * - Migration scripts
 * - Cron jobs requiring global access
 * 
 * FORBIDDEN USAGE:
 * - API Routes (use @supabase/ssr)
 * - Server Components (use @supabase/ssr)
 * - Client Components
 */

let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

        if (!connectionString) {
            // Allow build to proceed even if env vars are missing
            if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
                throw new Error('Database connection string not found.');
            }
            // Mock pool for build time if needed
            return new Pool();
        }

        pool = new Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        pool.on('error', (err) => {
            console.error('Unexpected error on idle database client', err);
        });
    }

    return pool;
}

export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<T[]> {
    const client = await getPool().connect();
    try {
        const result: QueryResult<T> = await client.query(text, params);
        return result.rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    } finally {
        client.release();
    }
}

export async function queryOne<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<T | null> {
    const rows = await query<T>(text, params);
    return rows.length > 0 ? rows[0] : null;
}

export async function transaction<T>(
    callback: (txQuery: <R extends QueryResultRow = any>(text: string, params?: any[]) => Promise<R[]>) => Promise<T>
): Promise<T> {
    const client = await getPool().connect();

    try {
        await client.query('BEGIN');

        const txQuery = async <R extends QueryResultRow = any>(
            text: string,
            params?: any[]
        ): Promise<R[]> => {
            const result: QueryResult<R> = await client.query(text, params);
            return result.rows;
        };

        const result = await callback(txQuery);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
