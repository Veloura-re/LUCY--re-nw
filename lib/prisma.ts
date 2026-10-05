import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Bypass TLS verification only in local development for self-signed Postgres certificates
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Sanitizes connection strings to ensure compatibility with driver adapter and transaction pooler.
 * Automatically upgrades Supabase session pooler (port 5432) to transaction pooler (port 6543)
 * to prevent EMAXCONNSESSION starvation in serverless environments.
 */
function getSanitizedDbUrl(url?: string): string | undefined {
    if (!url) return undefined;
    try {
        const parsed = new URL(url);

        // Supabase Transaction Pooler Auto-Upgrade:
        // Port 5432 on pooler.supabase.com is Session Mode (hard-capped at pool_size: 15).
        // Port 6543 is Transaction Mode (PgBouncer/Supavisor), multiplexing queries across thousands of requests.
        if (parsed.hostname.includes('pooler.supabase.com') && (parsed.port === '5432' || !parsed.port)) {
            parsed.port = '6543';
            parsed.searchParams.set('pgbouncer', 'true');
        }

        // Ensure sslmode doesn't enforce strict CA rejection on self-signed pooler certs
        if (parsed.searchParams.get('sslmode') === 'require' || parsed.searchParams.get('sslmode') === 'verify-full') {
            parsed.searchParams.set('sslmode', 'no-verify');
        }
        return parsed.toString();
    } catch {
        return url;
    }
}

// Resilient Prisma client singleton with PG connection pool adapter
const prismaClientSingleton = () => {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) {
        return new PrismaClient();
    }

    try {
        const safeUrl = getSanitizedDbUrl(rawUrl) || rawUrl;
        const isServerless = typeof process !== 'undefined' && 
            (Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) || process.env.NODE_ENV === 'production');
        
        // Severless instances should keep pool small (2-3) to avoid exhausting server connection limits
        const maxConnections = isServerless ? 3 : 5;

        const pool = new Pool({
            connectionString: safeUrl,
            ssl: { rejectUnauthorized: false },
            max: maxConnections,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 10000,
            keepAlive: true,
            keepAliveInitialDelayMillis: 5000,
        });

        // Catch idle connection drops cleanly to prevent uncaughtException crash
        pool.on('error', (err) => {
            console.warn('[PostgreSQL Pool Notice] Connection event:', err.message);
        });

        const adapter = new PrismaPg(pool);
        return new PrismaClient({ 
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        });
    } catch (err) {
        console.warn("[Prisma Init Fallback] Falling back to default native client:", err);
        const safeUrl = getSanitizedDbUrl(rawUrl);
        return new PrismaClient({
            datasources: safeUrl ? { db: { url: safeUrl } } : undefined,
            log: ['error'],
        });
    }
};

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
} & typeof global;

// Singleton pattern prevents multiple PrismaClient connection pools across hot-reloads and container reuse
export const prisma = (typeof window === 'undefined') 
    ? (globalThis.prismaGlobal ?? (globalThis.prismaGlobal = prismaClientSingleton()))
    : (null as unknown as PrismaClient);

if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma;
}

/**
 * Resilient query wrapper that transparently retries transient connection resets,
 * timeouts, or cold-start pool initialization delays.
 */
export async function withPrismaRetry<T>(
    fn: () => Promise<T>,
    retries = 2,
    delayMs = 250
): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const msg = err?.message || String(err);
            const isTransient = 
                msg.includes('Connection terminated') ||
                msg.includes('ECONNRESET') ||
                msg.includes('connection reset') ||
                msg.includes('ETIMEDOUT') ||
                msg.includes('timeout') ||
                msg.includes('EMAXCONNSESSION') ||
                msg.includes('Connection busy') ||
                msg.includes('PrismaClientInitializationError') ||
                msg.includes('Can\'t reach database server');

            if (!isTransient || attempt === retries) {
                throw err;
            }
            await new Promise((res) => setTimeout(res, delayMs * (attempt + 1)));
        }
    }
    throw lastError;
}

