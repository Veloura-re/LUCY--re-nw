import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        if (prisma && prisma.wantsAccess) {
            const requests = await prisma.wantsAccess.findMany({
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json({ requests });
        }

        return NextResponse.json({ requests: [] });
    } catch (error: any) {
        console.error("[Get Wants Access Error]:", error);
        return NextResponse.json({ requests: [] });
    }
}
