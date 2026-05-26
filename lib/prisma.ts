/**
 * Prisma Singleton for LUCY
 * 
 * On Cloudflare Workers (Edge), we use the pg-worker adapter.
 * On Node.js (build/dev), we use the standard PrismaClient.
 * 
 * Detection: We try the Edge client first. If it fails (e.g. missing adapter
 * or we're in Node.js), we fall back to the standard client.
 * The exported `prisma` will be null if BOTH fail — callers should use
 * Supabase REST in that case.
 */

let prismaInstance: any = null;

try {
    // Try Edge-native client first (works on Cloudflare Workers)
    const { PrismaClient } = require('@prisma/client/edge');
    const { PrismaPg } = require('@prisma/adapter-pg-worker');
    const { Pool } = require('@prisma/pg-worker');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);

    prismaInstance = new PrismaClient({
        adapter,
        log: ['error', 'warn']
    });
    console.log('[Prisma] Edge-native client initialized successfully');
} catch (edgeErr: any) {
    console.log('[Prisma] Edge client unavailable, trying Node.js client...', edgeErr?.message?.slice(0, 60));
    
    // Fall back to standard Node.js PrismaClient
    try {
        if (!(global as any).__prismaNode) {
            const { PrismaClient } = require('@prisma/client');
            (global as any).__prismaNode = new PrismaClient();
            console.log('[Prisma] Node.js client initialized');
        }
        prismaInstance = (global as any).__prismaNode;
    } catch (nodeErr: any) {
        console.error('[Prisma] BOTH clients failed. Falling back to Supabase REST.', nodeErr?.message?.slice(0, 60));
        prismaInstance = null;
    }
}

export const prisma = prismaInstance;
