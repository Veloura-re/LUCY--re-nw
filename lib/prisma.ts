import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
    const url = process.env.DATABASE_URL;

    if (!url) {
        console.error('[Prisma] DATABASE_URL is not defined.');
        return new PrismaClient();
    }

    // Only use the pg adapter if we are specifically running on Cloudflare Workers
    if (process.env.IS_CLOUDFLARE === 'true') {
        const prismaAdapter = (url: string) => {
            const pgWorker = require('@prisma/pg-worker');
            const adapterPgWorker = require('@prisma/adapter-pg-worker');

            const Pool = pgWorker.Pool || pgWorker.default?.Pool || pgWorker.default;
            const PrismaPg = adapterPgWorker.PrismaPg || adapterPgWorker.default?.PrismaPg || adapterPgWorker.default;

            if (!Pool || !PrismaPg) {
                throw new Error(`[Prisma] Failed to load native drivers. Pool: ${typeof Pool}, PrismaPg: ${typeof PrismaPg}`);
            }

            let connectionUrl = url;
            if (
                (connectionUrl.includes('pooler.supabase.com') || connectionUrl.includes(':6543')) &&
                !connectionUrl.includes('pgbouncer=true')
            ) {
                connectionUrl += (connectionUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
            }

            const pool = new Pool({
                connectionString: connectionUrl,
            });

            return new PrismaPg(pool);
        };

        try {
            const adapter = prismaAdapter(url);
            // CRITICAL: Use the WASM client (NOT edge) when using driver adapters in Prisma 5.x
            const { PrismaClient: WasmClient } = require('@prisma/client/wasm');

            return new WasmClient({ adapter });
        } catch (e: any) {
            console.error('[Prisma] Error initializing adapter:', e.message);
            // Fallback
            return new PrismaClient();
        }
    }

    // Standard Node.js environment
    return new PrismaClient();
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
