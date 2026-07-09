import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        let poolTest = "not attempted";
        let queryError = null;

        try {
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
