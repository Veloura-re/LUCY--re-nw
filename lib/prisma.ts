import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// fix: Resilient Prisma client singleton with PG connection pool adapter
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
        return new PrismaClient({
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
