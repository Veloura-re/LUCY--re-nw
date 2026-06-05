import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export async function GET() {
    try {
        let poolTest = "not attempted";
        let queryError = null;

        try {
            const pool = new Pool({ 
                user: 'postgres.caeeusbhwrkelnffbbub',
                password: 'Amsocookd2133#',
                host: 'aws-1-eu-west-1.pooler.supabase.com',
                port: 5432,
                database: 'postgres',
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
