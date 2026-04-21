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

<<<<<<< HEAD
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
=======
    // Detect environment
    const isCloudflare = process.env.IS_CLOUDFLARE === 'true' || (typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers');
    const isEdge = process.env.NEXT_RUNTIME === 'edge' || isCloudflare;
    const isDev = process.env.NODE_ENV === 'development';

    if (isEdge) {
        let connectionUrl = url;
        
        // Ensure pooler compatibility
        if (connectionUrl.includes('pooler.supabase.com') || connectionUrl.includes(':6543')) {
            if (!connectionUrl.includes('pgbouncer=true')) {
                connectionUrl += (connectionUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
            }
        }

        try {
            // In local development, the 'Edge' runtime might not support native TCP well
            // We only use the Wasm adapter if we are reasonably sure we're in a worker-like environment
            if (isCloudflare || !isDev) {
                const pool = new Pool({ 
                    connectionString: connectionUrl,
                    ssl: connectionUrl.includes('sslmode=no-verify') ? { rejectUnauthorized: false } : undefined
                });
                const adapter = new PrismaPg(pool);
                return new WasmPrismaClient({ adapter }) as unknown as PrismaClient;
            }
        } catch (e: any) {
            console.warn('[Prisma] Could not initialize Edge adapter, falling back to standard client:', e.message);
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
        }
    }

    // Standard Node.js environment fallback
    return new PrismaClient();
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
