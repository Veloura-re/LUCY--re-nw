import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        if (prisma && prisma.securityReport) {
            const reports = await prisma.securityReport.findMany({
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json({ reports });
        }

        return NextResponse.json({ reports: [] });
    } catch (error: any) {
        console.error("[Get Security Reports Error]:", error);
        return NextResponse.json({ reports: [] });
    }
}
