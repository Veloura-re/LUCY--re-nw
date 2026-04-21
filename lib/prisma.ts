import { PrismaClient } from '@prisma/client';

// We'll use a type-safe way to handle the Edge/Node split
const prismaClientSingleton = () => {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL or DIRECT_URL must be defined');
    }

    // Determine if we are running in the Edge runtime
    // In Next.js, this is set during the build and at runtime.
    const isEdge = process.env.NEXT_RUNTIME === 'edge';

    if (isEdge) {
        // In the Edge runtime, we MUST use the worker adapter.
        // We use the global objects that are expected to be present or 
        // provided by the Cloudflare environment/OpenNext.
        try {
            // @ts-ignore - These are available in the Edge environment
            const { PrismaPg } = require('@prisma/adapter-pg-worker');
            // @ts-ignore
            const { Pool } = require('@prisma/pg-worker');

            console.log('[Prisma] Initializing client for Edge runtime...');
            const pool = new Pool({ 
                connectionString,
                ssl: { rejectUnauthorized: false },
                max: 10,
                connectionTimeoutMillis: 15000,
            });

            const adapter = new PrismaPg(pool);
            return new PrismaClient({ 
                adapter,
                log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
            });
        } catch (e) {
            console.error('[Prisma] Failed to initialize Edge adapter, falling back to standard client:', e);
            return new PrismaClient({
                log: ['error'],
            });
        }
    } else {
        // Node.js runtime (Local development, etc.)
        console.log('[Prisma] Initializing client for Node.js runtime...');
        return new PrismaClient({
            datasources: {
                db: {
                    url: connectionString,
                },
            },
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    }
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export { prisma };
export default prisma;
