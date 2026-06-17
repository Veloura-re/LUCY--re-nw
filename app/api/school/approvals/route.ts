import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSchoolLinked } from '@/lib/security';

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
        return NextResponse.json({ error: e.message || "Failed to fetch approvals" }, { status: 500 });
    }
}
