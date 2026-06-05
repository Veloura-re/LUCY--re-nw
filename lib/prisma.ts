import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | undefined = undefined;

if (typeof window === 'undefined') {
    if (process.env.NODE_ENV === 'production') {
        prismaInstance = new PrismaClient();
    } else {
        if (!(global as any).prisma) {
            (global as any).prisma = new PrismaClient();
        }
        prismaInstance = (global as any).prisma;
    }
}

export const prisma = prismaInstance as PrismaClient;
