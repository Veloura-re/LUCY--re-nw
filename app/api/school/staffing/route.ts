import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';

// POST: Assign a teacher to a subject in a class
export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const { classId, subjectId, teacherId, periodsPerWeek = 5 } = (await request.json()) as any;

        // Sequential lookups for isolation and stability on Cloudflare Edge
        const targetClass = await prisma.class.findUnique({ where: { id: classId }, select: { grade: { select: { schoolId: true } } } });
        const targetSubject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { schoolId: true } });
        const targetTeacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { schoolId: true, role: true } });

        if (dbUser.role !== 'SUPERADMIN') {
            if (targetClass?.grade.schoolId !== dbUser.schoolId ||
                targetSubject?.schoolId !== dbUser.schoolId ||
                targetTeacher?.schoolId !== dbUser.schoolId) {
                return NextResponse.json({ error: 'Forbidden: Cross-tenant assignment attempted' }, { status: 403 });
            }
        }

        // Check if assignment already exists
        const existing = await prisma.teacherAssignment.findFirst({
            where: {
                classId,
                subjectId,
            }
        });

        if (existing) {
            // Update existing assignment
            const updated = await prisma.teacherAssignment.update({
                where: { id: existing.id },
                data: { teacherId, periodsPerWeek: parseInt(periodsPerWeek) } as any
            });
            
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'staffing', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ assignment: updated });
        } else {
            // Create new assignment
            const assignment = await prisma.teacherAssignment.create({
                data: {
                    classId,
                    subjectId,
                    teacherId,
                    periodsPerWeek: parseInt(periodsPerWeek)
                } as any
            });
            return NextResponse.json({ assignment });
        }
    } catch (e) {
        return handleApiError(e);
    }
}

// GET: Fetch assignments for a specific class
export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId');

        if (!classId) return NextResponse.json({ error: 'Class ID required' }, { status: 400 });

        const assignments = await prisma.teacherAssignment.findMany({
            where: {
                classId,
                class: { grade: { schoolId: dbUser.schoolId } } // Tenant Isolation
            },
            include: {
                teacher: { select: { id: true, name: true, email: true } },
                subject: true
            }
        });
        return NextResponse.json({ assignments });
    } catch (e) {
        return handleApiError(e);
    }
}
