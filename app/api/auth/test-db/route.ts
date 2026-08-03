import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: "Endpoint disabled in production." }, { status: 403 });
    }

    try {
        const startTime = Date.now();
        // fix: Use centralized singleton prisma instance to prevent connection socket leaks
        const result = await prisma.$queryRaw<Array<{ db_test: number }>>`SELECT 1 as db_test`;
        const latencyMs = Date.now() - startTime;

        return NextResponse.json({ 
            status: "connected",
            queryResult: result,
            latencyMs,
            time: new Date().toISOString()
        });
    } catch (e: any) {
        console.error("[Test-DB Error]:", e);
        return NextResponse.json({ 
            status: "error", 
            error: e.message, 
            code: e.code 
        }, { status: 500 });
    }
}
