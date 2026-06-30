import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const requests = await (prisma as any).wantsAccess.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ requests });
    } catch (error: any) {
        console.error("[Get Wants Access Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
