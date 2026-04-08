import { PrismaClient } from '@prisma/client'
import { PrismaClient as WasmPrismaClient } from '@prisma/client/wasm'
import { Pool } from '@prisma/pg-worker'
import { PrismaPg } from '@prisma/adapter-pg-worker'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
    const url = process.env.DATABASE_URL;

    if (!url) {
        console.error('[Prisma] DATABASE_URL is not defined.');
        return new PrismaClient();
    }

    // Detect Cloudflare/Edge natively without relying on manual user ENV vars
    const isEdge = process.env.NEXT_RUNTIME === 'edge' || process.env.IS_CLOUDFLARE === 'true' || typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

    if (isEdge) {
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

        const adapter = new PrismaPg(pool);

        try {
            return new WasmPrismaClient({ adapter }) as unknown as PrismaClient;
        } catch (e: any) {
            console.error('[Prisma] Error initializing Cloudflare Wasm adapter:', e.message);
        }
    }

    // Standard Node.js environment fallback
    return new PrismaClient();
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
