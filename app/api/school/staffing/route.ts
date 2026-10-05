import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';

// POST: Assign a teacher to a subject in a class
export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const { classId, subjectId, teacherId, periodsPerWeek = 5 } = (await request.json()) as any;

        // Lookups for tenant isolation and stability
        const targetClass = await prisma.class.findUnique({
            where: { id: classId },
            select: { id: true, schoolId: true, grade: { select: { schoolId: true } } }
        });
        const targetSubject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, schoolId: true } });
        let targetTeacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { id: true, schoolId: true, role: true } });

        // Auto-heal invited teachers if they were referenced by invite ID or email
        if (!targetTeacher) {
            const invite = await prisma.inviteToken.findFirst({
                where: {
                    OR: [
                        { id: teacherId },
                        { email: teacherId }
                    ],
                    schoolId: dbUser.schoolId
                }
            });
            if (invite) {
                let userByEmail = await prisma.user.findUnique({ where: { email: invite.email } });
                if (!userByEmail) {
                    userByEmail = await prisma.user.create({
                        data: {
                            email: invite.email,
                            name: invite.email.split('@')[0],
                            role: invite.role as any || 'TEACHER',
                            schoolId: dbUser.schoolId,
                            verified: false,
                            teacherCode: `TCH-${globalThis.crypto.randomUUID().split('-')[0].substring(0, 4).toUpperCase()}`
                        }
                    });
                }
                targetTeacher = userByEmail;
            }
        }

        const classSchoolId = targetClass?.schoolId || targetClass?.grade?.schoolId;

        if (dbUser.role !== 'SUPERADMIN') {
            if (!classSchoolId || classSchoolId !== dbUser.schoolId ||
                targetSubject?.schoolId !== dbUser.schoolId ||
                targetTeacher?.schoolId !== dbUser.schoolId) {
                return NextResponse.json({ error: 'Forbidden: Cross-tenant assignment attempted' }, { status: 403 });
            }
        }

        // Backfill class schoolId if null
        if (targetClass && !targetClass.schoolId && classSchoolId) {
            prisma.class.update({ where: { id: targetClass.id }, data: { schoolId: classSchoolId } }).catch(() => {});
        }

        const resolvedTeacherId = targetTeacher!.id;

        // Check if assignment already exists
        const existing = await prisma.teacherAssignment.findFirst({
            where: {
                classId,
                subjectId,
            }
        });

        let resultAssignment = null;
        if (existing) {
            // Update existing assignment
            resultAssignment = await prisma.teacherAssignment.update({
                where: { id: existing.id },
                data: { teacherId: resolvedTeacherId, periodsPerWeek: parseInt(periodsPerWeek) } as any
            });
        } else {
            // Create new assignment
            resultAssignment = await prisma.teacherAssignment.create({
                data: {
                    classId,
                    subjectId,
                    teacherId: resolvedTeacherId,
                    periodsPerWeek: parseInt(periodsPerWeek)
                } as any
            });
        }

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, schoolId: dbUser.schoolId!, action: 'CREATE', resourceType: 'staffing', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ assignment: resultAssignment });
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
