import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const reports = await (prisma as any).securityReport.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ reports });
    } catch (error: any) {
        console.error("[Get Security Reports Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
