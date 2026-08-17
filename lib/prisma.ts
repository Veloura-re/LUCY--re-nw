import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Bypass TLS verification only in local development for self-signed Postgres certificates
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Sanitizes connection strings to ensure compatibility with both driver adapter and native engine
 */
function getSanitizedDbUrl(url?: string): string | undefined {
    if (!url) return undefined;
    try {
        const parsed = new URL(url);
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
        const pool = new Pool({
            connectionString: rawUrl,
            ssl: { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 8000,
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

