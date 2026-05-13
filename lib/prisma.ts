/**
 * Prisma Singleton for LUCY
 * Dynamically switches between Edge (via @prisma/adapter-pg-worker)
 * and Node.js (standard) based on the current runtime.
 */

let prismaInstance: any = null;

const isEdge = process.env.NEXT_RUNTIME === 'edge';

if (isEdge) {
    console.log('[Prisma] Initializing Edge-native client...');
    try {
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
    } catch (e: any) {
        console.error('[Prisma] FAILED to initialize Edge client:', e.message);
        prismaInstance = null;
    }
} else {
    // Standard Node.js runtime (Build time or non-Edge routes)
    try {
        if (!(global as any).prisma) {
            console.log('[Prisma] Initializing standard Node.js client...');
            const { PrismaClient } = require('@prisma/client');
            (global as any).prisma = new PrismaClient();
        }
        prismaInstance = (global as any).prisma;
    } catch (e: any) {
        console.error('[Prisma] FAILED to initialize Standard client:', e.message);
        prismaInstance = null;
    }
}

export const prisma = prismaInstance;
