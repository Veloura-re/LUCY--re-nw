import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

function getSanitizedDbUrl(url?: string): string | undefined {
    if (!url) return undefined;
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('pooler.supabase.com') && (parsed.port === '5432' || !parsed.port)) {
            parsed.port = '6543';
            parsed.searchParams.set('pgbouncer', 'true');
        }
        return parsed.toString();
    } catch {
        return url;
    }
}

const prismaClientSingleton = () => {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) {
        return new PrismaClient();
    }

    try {
        const safeUrl = getSanitizedDbUrl(rawUrl) || rawUrl;
        const pool = new Pool({
            connectionString: safeUrl,
            ssl: { rejectUnauthorized: false },
            max: 3,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 10000,
            statement_timeout: 10000,
            query_timeout: 10000,
        });

        pool.on('error', (err) => {
            console.warn('[PostgreSQL Pool Notice]', err.message);
        });

        const adapter = new PrismaPg(pool);
        return new PrismaClient({ adapter, log: ['error'] });
    } catch (err) {
        return new PrismaClient({ log: ['error'] });
    }
};

declare const globalThis: {
    adminPrismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
} & typeof global;

export const prisma =
    globalThis.adminPrismaGlobal ?? (globalThis.adminPrismaGlobal = prismaClientSingleton());

if (process.env.NODE_ENV !== 'production') {
    globalThis.adminPrismaGlobal = prisma;
}
