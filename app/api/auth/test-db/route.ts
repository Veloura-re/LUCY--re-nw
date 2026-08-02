import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: "Endpoint disabled in production." }, { status: 403 });
    }

    try {
        let poolTest = "not attempted";
        let queryError = null;

        try {
            const pool = new Pool({ 
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            const adapter = new PrismaPg(pool);
            const prisma = new PrismaClient({ adapter });
            
            await prisma.$queryRaw`SELECT 1`;
            poolTest = "success";
        } catch (e: any) {
            queryError = e.message;
        }

        return NextResponse.json({ 
            poolTest,
            queryError,
            time: new Date().toISOString()
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
