import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export async function GET() {
    try {
        let poolTest = "not attempted";
        let queryError = null;

        try {
            // ✅ GOOD: Use environment variables instead of hardcoded secrets
            const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
            if (!connectionString) {
                throw new Error("Database connection string not configured");
            }

            const pool = new Pool({ 
                connectionString,
                ssl: { rejectUnauthorized: false }
            });
            const adapter = new PrismaPg(pool);
            const prisma = new PrismaClient({ adapter });
            
            await prisma.$queryRaw`SELECT 1`;
            poolTest = "success";
        } catch (e: any) {
            // ✅ GOOD: Don't leak specific error details in response
            console.error("Database connection failed:", e);
            queryError = "Database connection failed";
        }

        return NextResponse.json({ 
            poolTest,
            queryError,
            time: new Date().toISOString()
        });
    } catch (e: any) {
        console.error("Test DB route error:", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
