import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Explicitly load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const LIVE_SCHEMA_PATH = path.join(process.cwd(), 'db_schema_live.ts');
const CHECKED_IN_SCHEMA_PATH = path.join(process.cwd(), 'src', 'types', 'schema.ts');

function normalizeSchema(content: string): string {
    return content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractDatabaseInterface(content: string): string | null {
    const startIdx = content.indexOf('export interface Database {');
    if (startIdx === -1) return null;

    let braceCount = 0;
    let endIdx = -1;
    for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') braceCount--;
        if (braceCount === 0 && endIdx === -1 && i > startIdx) {
            endIdx = i;
            break;
        }
    }

    return endIdx !== -1 ? content.substring(startIdx, endIdx + 1) : null;
}

function runValidation() {
    try {
        const dbUrl = process.env.POSTGRES_URL;

        if (!dbUrl) {
            console.error('Error: POSTGRES_URL missing in environment (loaded from .env.local)');
            process.exit(1);
        }

        console.log('Generating live DB schema from remote...');
        try {
            execSync(`npx supabase gen types typescript --db-url "${dbUrl}" > ${LIVE_SCHEMA_PATH}`, {
                stdio: 'inherit',
                env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' }
            });
        } catch (genErr) {
            console.warn('Failed with --db-url, trying --url...');
            execSync(`npx supabase gen types typescript --url "${dbUrl}" > ${LIVE_SCHEMA_PATH}`, {
                stdio: 'inherit',
                env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' }
            });
        }

        if (!fs.existsSync(LIVE_SCHEMA_PATH)) {
            console.error('Error: Failed to create db_schema_live.ts');
            process.exit(1);
        }

        const liveSchemaContent = fs.readFileSync(LIVE_SCHEMA_PATH, 'utf-8');
        const checkedInSchemaContent = fs.readFileSync(CHECKED_IN_SCHEMA_PATH, 'utf-8');

        const liveDbInterface = extractDatabaseInterface(liveSchemaContent);
        const checkedInDbInterface = extractDatabaseInterface(checkedInSchemaContent);

        if (!liveDbInterface) {
            console.error('Error: Could not extract Database interface from live schema.');
            process.exit(1);
        }

        if (!checkedInDbInterface) {
            console.error('Error: Could not extract Database interface from src/types/schema.ts.');
            process.exit(1);
        }

        const normalizedLive = normalizeSchema(liveDbInterface);
        const normalizedCheckedIn = normalizeSchema(checkedInDbInterface);

        if (normalizedLive !== normalizedCheckedIn) {
            console.error('\n🛑 SCHEMA DRIFT DETECTED!');
            console.error(`Normalized Characters -> Live: ${normalizedLive.length}, Checked-In: ${normalizedCheckedIn.length}`);
            process.exit(1);
        }

        console.log('✅ Schema validation passed.');
        process.exit(0);

    } catch (error: any) {
        console.error('Schema validation failed:', error.message);
        process.exit(1);
    }
}

runValidation();
