import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole } from '@/lib/security';

export async function GET() {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);

        const school = await prisma.school.findUnique({
            where: { id: user.schoolId! },
            include: {
                _count: {
                    select: { students: true, users: true, grades: true }
                }
            }
        });

        return NextResponse.json({ school });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);
        const { name, schoolCode, logoUrl, address, locations, communicationsConfig, termStructure, termStructureLocked, defaultBillingCycle } = await request.json();

        const currentSchool = await prisma.school.findUnique({ where: { id: user.schoolId! } });
        if (currentSchool?.termStructureLocked && termStructure && termStructure !== currentSchool.termStructure) {
            return NextResponse.json({ error: "Term Structure is locked and cannot be changed" }, { status: 400 });
        }

        const school = await prisma.school.update({
            where: { id: user.schoolId! },
            data: {
                name,
                schoolCode,
                logoUrl,
                address,
                locations,
                communicationsConfig,
                ...(termStructure && { termStructure }),
                ...(typeof termStructureLocked === 'boolean' && { termStructureLocked }),
                ...(defaultBillingCycle && { defaultBillingCycle })
            }
        });

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE_SETTINGS', resourceType: 'settings', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ school });
    } catch (e) {
        return handleApiError(e);
    }
}
