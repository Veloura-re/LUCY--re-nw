import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';
import { logActivity } from '@/lib/audit';

function normalizeKey(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// POST: Assign a teacher to a subject in a class
export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const { classId, subjectId, teacherId, periodsPerWeek = 5 } = (await request.json()) as any;

        if (!classId || !subjectId || !teacherId) {
            return NextResponse.json({ error: 'Class, subject, and teacher identifiers are required' }, { status: 400 });
        }

        const schoolFilter = dbUser.role === 'SUPERADMIN' 
            ? {} 
            : { OR: [{ schoolId: dbUser.schoolId }, { grade: { schoolId: dbUser.schoolId } }] };

        // 1. Resilient Class Lookup (by ID or normalized slug)
        let targetClass = await prisma.class.findFirst({
            where: {
                id: classId,
                ...schoolFilter
            },
            select: { id: true, name: true, schoolId: true, grade: { select: { schoolId: true } } }
        });

        if (!targetClass) {
            const allClasses = await prisma.class.findMany({
                where: schoolFilter,
                select: { id: true, name: true, schoolId: true, grade: { select: { schoolId: true } } }
            });
            const normInput = normalizeKey(String(classId));
            targetClass = allClasses.find((c) => {
                const cNorm = normalizeKey(c.name);
                return (
                    cNorm === normInput ||
                    cNorm.endsWith(normInput) ||
                    normInput.endsWith(cNorm) ||
                    c.name.toLowerCase() === String(classId).toLowerCase()
                );
            }) || null;
        }

        if (!targetClass) {
            return NextResponse.json({ error: 'Class not found in this institution' }, { status: 404 });
        }

        // 2. Resilient Subject Lookup (by ID or name)
        let targetSubject = await prisma.subject.findFirst({
            where: {
                id: subjectId,
                ...(dbUser.role === 'SUPERADMIN' ? {} : { schoolId: dbUser.schoolId })
            },
            select: { id: true, name: true, schoolId: true }
        });

        if (!targetSubject) {
            const allSubjects = await prisma.subject.findMany({
                where: dbUser.role === 'SUPERADMIN' ? {} : { schoolId: dbUser.schoolId },
                select: { id: true, name: true, schoolId: true }
            });
            const normSub = normalizeKey(String(subjectId));
            targetSubject = allSubjects.find((s) => {
                const sNorm = normalizeKey(s.name);
                return sNorm === normSub || s.name.toLowerCase() === String(subjectId).toLowerCase();
            }) || null;
        }

        if (!targetSubject) {
            return NextResponse.json({ error: 'Subject not found in this institution' }, { status: 404 });
        }

        // 3. Resilient Teacher Lookup (by ID, email, teacherCode, or inviteToken)
        let targetTeacher = await prisma.user.findFirst({
            where: {
                OR: [
                    { id: teacherId },
                    { email: { equals: String(teacherId).trim(), mode: 'insensitive' } },
                    { teacherCode: String(teacherId).trim() }
                ],
                ...(dbUser.role === 'SUPERADMIN' ? {} : { schoolId: dbUser.schoolId })
            },
            select: { id: true, email: true, schoolId: true, role: true }
        });

        // Auto-heal invited faculty who have an active invite token but no verified user account yet
        if (!targetTeacher) {
            const invite = await prisma.inviteToken.findFirst({
                where: {
                    OR: [
                        { id: teacherId },
                        { email: { equals: String(teacherId).trim(), mode: 'insensitive' } }
                    ],
                    ...(dbUser.role === 'SUPERADMIN' ? {} : { schoolId: dbUser.schoolId })
                }
            });
            if (invite) {
                let userByEmail = await prisma.user.findUnique({ where: { email: invite.email } });
                if (!userByEmail) {
                    userByEmail = await prisma.user.create({
                        data: {
                            email: invite.email,
                            name: invite.email.split('@')[0],
                            role: (invite.role as any) || 'TEACHER',
                            schoolId: dbUser.schoolId,
                            verified: false,
                            teacherCode: `TCH-${globalThis.crypto.randomUUID().split('-')[0].substring(0, 4).toUpperCase()}`
                        }
                    });
                } else if (!userByEmail.schoolId && dbUser.schoolId) {
                    userByEmail = await prisma.user.update({
                        where: { id: userByEmail.id },
                        data: { schoolId: dbUser.schoolId }
                    });
                }
                targetTeacher = userByEmail;
            }
        }

        if (!targetTeacher) {
            return NextResponse.json({ error: 'Teacher not found in this institution' }, { status: 404 });
        }

        const classSchoolId = targetClass.schoolId || targetClass.grade?.schoolId;

        if (dbUser.role !== 'SUPERADMIN') {
            if (!classSchoolId || classSchoolId !== dbUser.schoolId ||
                targetSubject.schoolId !== dbUser.schoolId ||
                targetTeacher.schoolId !== dbUser.schoolId) {
                return NextResponse.json({ error: 'Forbidden: Cross-tenant assignment attempted' }, { status: 403 });
            }
        }

        // Backfill class schoolId if null
        if (!targetClass.schoolId && classSchoolId) {
            prisma.class.update({ where: { id: targetClass.id }, data: { schoolId: classSchoolId } }).catch(() => {});
        }

        const resolvedClassId = targetClass.id;
        const resolvedSubjectId = targetSubject.id;
        const resolvedTeacherId = targetTeacher.id;

        // Check if assignment already exists
        const existing = await prisma.teacherAssignment.findFirst({
            where: {
                classId: resolvedClassId,
                subjectId: resolvedSubjectId,
            }
        });

        let resultAssignment = null;
        if (existing) {
            // Update existing assignment
            resultAssignment = await prisma.teacherAssignment.update({
                where: { id: existing.id },
                data: { teacherId: resolvedTeacherId, periodsPerWeek: parseInt(String(periodsPerWeek), 10) || 5 } as any
            });
        } else {
            // Create new assignment
            resultAssignment = await prisma.teacherAssignment.create({
                data: {
                    classId: resolvedClassId,
                    subjectId: resolvedSubjectId,
                    teacherId: resolvedTeacherId,
                    periodsPerWeek: parseInt(String(periodsPerWeek), 10) || 5
                } as any
            });
        }

        // Audit log with non-null schoolId
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId && dbUser.schoolId) {
                await logActivity({ userId: _userId, schoolId: dbUser.schoolId, action: 'CREATE', resourceType: 'staffing', ip: _ip || undefined });
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
        const classParam = searchParams.get('classId');

        if (!classParam) return NextResponse.json({ error: 'Class ID required' }, { status: 400 });

        // Resolve class by ID or normalized name
        let targetClass = await prisma.class.findFirst({
            where: {
                id: classParam,
                OR: [{ schoolId: dbUser.schoolId }, { grade: { schoolId: dbUser.schoolId } }]
            },
            select: { id: true }
        });

        if (!targetClass) {
            const allClasses = await prisma.class.findMany({
                where: { OR: [{ schoolId: dbUser.schoolId }, { grade: { schoolId: dbUser.schoolId } }] },
                select: { id: true, name: true }
            });
            const normParam = normalizeKey(classParam);
            const matched = allClasses.find((c) => {
                const cNorm = normalizeKey(c.name);
                return cNorm === normParam || c.name.toLowerCase() === classParam.toLowerCase();
            });
            if (matched) {
                targetClass = { id: matched.id };
            }
        }

        if (!targetClass) {
            return NextResponse.json({ assignments: [] });
        }

        const assignments = await prisma.teacherAssignment.findMany({
            where: {
                classId: targetClass.id,
                class: { OR: [{ schoolId: dbUser.schoolId }, { grade: { schoolId: dbUser.schoolId } }] }
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
