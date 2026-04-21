import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';

// POST: Assign a teacher to a subject in a class
export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const { classId, subjectId, teacherId } = await request.json();

        // Tenant Isolation: Ensure class and subject and teacher belong to this school
        const [targetClass, targetSubject, targetTeacher] = await Promise.all([
            prisma.class.findUnique({ where: { id: classId }, select: { grade: { select: { schoolId: true } } } }),
            prisma.subject.findUnique({ where: { id: subjectId }, select: { schoolId: true } }),
            prisma.user.findUnique({ where: { id: teacherId }, select: { schoolId: true, role: true } })
        ]);

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
                data: { teacherId }
            });
            return NextResponse.json({ assignment: updated });
        } else {
            // Create new assignment
            const assignment = await prisma.teacherAssignment.create({
                data: {
                    classId,
                    subjectId,
                    teacherId
                }
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
