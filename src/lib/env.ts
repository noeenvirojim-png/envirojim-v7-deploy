/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at startup to fail fast
 */

const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const optionalEnvVars = [
    'POSTGRES_URL',
    'DATABASE_URL',
    'GEMINI_API_KEY',
] as const;

export interface EnvConfig {
    supabaseUrl: string;
    supabaseAnonKey: string;
    postgresUrl?: string;
    geminiApiKey?: string;
}

/**
 * Validate environment variables
 * Throws error if required vars are missing in production
 */
export function validateEnv(): void {
    // Skip validation in development build
    if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
        return;
    }

    const missing = requiredEnvVars.filter(key => !process.env[key]);

    if (missing.length > 0) {
        const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
        console.error(errorMsg);

        // Only throw in production to prevent build failures
        if (process.env.NODE_ENV === 'production') {
            throw new Error(errorMsg);
        }
    }
}

/**
 * Get validated environment configuration
 */
export function getEnvConfig(): EnvConfig {
    return {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        postgresUrl: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        geminiApiKey: process.env.GEMINI_API_KEY,
    };
}

/**
 * Check if a specific environment variable is set
 */
export function hasEnvVar(key: string): boolean {
    return !!process.env[key];
}

/**
 * Check if Gemini AI is configured
 */
export function isGeminiConfigured(): boolean {
    return hasEnvVar('GEMINI_API_KEY');
}

// Validate on module load (only in production)
if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    validateEnv();
}
