import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole } from '@/lib/security';

export async function GET() {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);

        // Handle case where user is a global SuperAdmin without a fixed schoolId
        if (!user.schoolId) {
            if (user.role === 'SUPERADMIN') {
                const firstSchool = await prisma.school.findFirst({
                    include: {
                        _count: {
                            select: { students: true, users: true, grades: true }
                        }
                    }
                });
                return NextResponse.json({ school: firstSchool, isSuperadmin: true });
            }
            return NextResponse.json({ school: null, error: "No school associated with this account." });
        }

        const school = await prisma.school.findUnique({
            where: { id: user.schoolId },
            include: {
                _count: {
                    select: { students: true, users: true, grades: true }
                }
            }
        });

        if (!school) {
            return NextResponse.json({ school: null, error: "School record not found." }, { status: 404 });
        }

        return NextResponse.json({ school });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);
        const targetSchoolId = user.schoolId || (user.role === 'SUPERADMIN' ? (await prisma.school.findFirst({ select: { id: true } }))?.id : null);
        
        if (!targetSchoolId) {
            return NextResponse.json({ error: "No school associated with this account." }, { status: 400 });
        }

        const body: any = await request.json();
        const { 
            name, 
            schoolCode, 
            logoUrl, 
            address, 
            locations, 
            communicationsConfig, 
            termStructure, 
            termStructureLocked, 
            defaultBillingCycle 
        } = body || {};

        const currentSchool = await prisma.school.findUnique({ where: { id: targetSchoolId } });
        if (!currentSchool) {
            return NextResponse.json({ error: "School record not found." }, { status: 404 });
        }

        if (currentSchool.termStructureLocked && termStructure && termStructure !== currentSchool.termStructure) {
            return NextResponse.json({ error: "Term Structure is locked and cannot be changed" }, { status: 400 });
        }

        const VALID_TERM_STRUCTURES = ['SEMESTERS', 'QUARTERS', 'TRIMESTERS', 'CUSTOM'];
        const VALID_BILLING_CYCLES = ['ONCE', 'MONTHLY', 'TERM', 'QUARTERLY', 'SEMESTERLY', 'ANNUAL'];

        if (termStructure && !VALID_TERM_STRUCTURES.includes(termStructure)) {
            return NextResponse.json({ error: `Invalid term structure: ${termStructure}` }, { status: 400 });
        }

        if (defaultBillingCycle && !VALID_BILLING_CYCLES.includes(defaultBillingCycle)) {
            return NextResponse.json({ error: `Invalid billing cycle: ${defaultBillingCycle}` }, { status: 400 });
        }

        const updateData: any = {};
        if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
        if (typeof schoolCode === 'string' && schoolCode.trim()) updateData.schoolCode = schoolCode.trim();
        if (typeof logoUrl === 'string') updateData.logoUrl = logoUrl;
        if (typeof address === 'string') updateData.address = address;
        if (locations !== undefined) updateData.locations = locations;
        if (communicationsConfig !== undefined) updateData.communicationsConfig = communicationsConfig;
        if (termStructure) updateData.termStructure = termStructure;
        if (typeof termStructureLocked === 'boolean') updateData.termStructureLocked = termStructureLocked;
        if (defaultBillingCycle) updateData.defaultBillingCycle = defaultBillingCycle;

        const school = await prisma.school.update({
            where: { id: targetSchoolId },
            data: updateData
        });

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || undefined) : undefined;
            const _userId = user?.id;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE_SETTINGS', resourceType: 'settings', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ school });
    } catch (e: any) {
        console.error("PATCH /api/school/settings error:", e);
        return handleApiError(e);
    }
}
