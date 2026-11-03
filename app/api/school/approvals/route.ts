import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSchoolLinked, publicErrorMessage, handleApiError, clientDataError } from '@/lib/security';
import { reportServerError } from '@/lib/error-capture';

export async function GET(request: Request) {
    try {
        const user = await requireSchoolLinked();
        
        // Ensure only OWNER and SUPERADMIN can view approvals
        if (user.role !== 'OWNER' && user.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const requests = await prisma.actionRequest.findMany({
            where: { 
                schoolId: user.schoolId,
                status: 'PENDING'
            },
            include: {
                requester: { select: { name: true, email: true, role: true } },
                targetUser: { select: { name: true, email: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ requests });

    } catch (e: any) {
        { const bad = clientDataError(e); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((e as any)?.message))) return handleApiError(e);
        void reportServerError(e, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(e, "Failed to fetch approvals") }, { status: 500 });
    }
}
