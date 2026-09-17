import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { createClient } from '@supabase/supabase-js';

// Removed top-level supabaseAdmin to ensure runtime evaluation of Edge env vars

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);

        // Edge-safe: use Supabase SDK when Prisma is unavailable
        if (!prisma) {
            if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
                throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for privileged operations.");
            }
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
            const { data: assignments, error } = await supabaseAdmin
                .from('TeacherAssignment')
                .select(`
                    id, classId, subjectId,
                    class:Class(name, grade:Grade(level)),
                    subject:Subject(name)
                `)
                .eq('teacherId', dbUser.id);

            if (error) throw new Error(error.message);

            const classes = (assignments || []).map((a: any) => ({
                id: a.id,
                classId: a.classId,
                className: a.class?.name,
                subjectId: a.subjectId,
                subjectName: a.subject?.name,
                gradeLevel: a.class?.grade?.level,
                studentCount: 0,
                avgGrade: null
            }));
            return NextResponse.json({ classes });
        }

        // Node runtime: full Prisma query
        const assignments = await prisma.teacherAssignment.findMany({
            where: { teacherId: dbUser.id },
            include: {
                class: {
                    include: { grade: true, _count: { select: { students: true } } }
                },
                subject: true
            }
        });

        const classIds = assignments.map(a => a.classId);
        const subjectIds = assignments.map(a => a.subjectId);

        const allGrades = await prisma.gradeRecord.findMany({
            where: {
                student: { classId: { in: classIds } },
                subjectId: { in: subjectIds }
            },
            select: { score: true, subjectId: true, student: { select: { classId: true } } }
        });

        const classes = assignments.map((a: any) => {
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
