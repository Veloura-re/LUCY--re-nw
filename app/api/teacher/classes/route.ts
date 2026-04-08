import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);

        const assignments = await prisma.teacherAssignment.findMany({
            where: {
                teacherId: dbUser.id
            },
            include: {
                class: {
                    include: {
                        grade: true,
                        _count: {
                            select: { students: true }
                        }
                    }
                },
                subject: true
            }
        });

        // Efficiently fetch all relevant grade records for all assigned classes in one go
        const classIds = assignments.map(a => a.classId);
        const subjectIds = assignments.map(a => a.subjectId);

        const allGrades = await prisma.gradeRecord.findMany({
            where: {
                student: { classId: { in: classIds } },
                subjectId: { in: subjectIds }
            },
            select: {
                score: true,
                subjectId: true,
                student: { select: { classId: true } }
            }
        });

        const classes = assignments.map((a: any) => {
            // Group and average in memory
            const relevantGrades = allGrades.filter(g =>
                g.student.classId === a.classId && g.subjectId === a.subjectId
            );

            const avgGrade = relevantGrades.length > 0
                ? relevantGrades.reduce((acc, curr) => acc + curr.score, 0) / relevantGrades.length
                : null;

            return {
                id: a.id,
                classId: a.classId,
                className: a.class.name,
                subjectId: a.subjectId,
                subjectName: a.subject.name,
                gradeLevel: a.class.grade.level,
                studentCount: a.class._count.students,
                avgGrade
            };
        });

        return NextResponse.json({ classes });
    } catch (e) {
        return handleApiError(e);
    }
}
