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
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
        const [assignments, homerooms] = await Promise.all([
            prisma.teacherAssignment.findMany({
                where: { teacherId: dbUser.id },
                include: {
                    class: {
                        include: { grade: true, _count: { select: { students: true } } }
                    },
                    subject: true
                }
            }).catch(() => []),
            prisma.class.findMany({
                where: { homeroomTeacherId: dbUser.id },
                include: {
                    grade: true,
                    _count: { select: { students: true } }
                }
            }).catch(() => [])
        ]);

        const classIds = assignments.map(a => a.classId);
        const subjectIds = assignments.map(a => a.subjectId);

        const allGrades = (classIds.length > 0 && subjectIds.length > 0) ? await prisma.gradeRecord.findMany({
            where: {
                student: { classId: { in: classIds } },
                subjectId: { in: subjectIds }
            },
            select: { score: true, subjectId: true, student: { select: { classId: true } } }
        }).catch(() => []) : [];

        const classesMap = new Map<string, any>();

        assignments.forEach((a: any) => {
            if (!a.class) return;
            const relevantGrades = allGrades.filter(g =>
                g.student?.classId === a.classId && g.subjectId === a.subjectId
            );
            const avgGrade = relevantGrades.length > 0
                ? relevantGrades.reduce((acc: number, curr: any) => acc + curr.score, 0) / relevantGrades.length
                : null;

            classesMap.set(`${a.classId}_${a.subjectId}`, {
                id: a.id,
                classId: a.classId,
                className: a.class?.name || "Class",
                subjectId: a.subjectId,
                subjectName: a.subject?.name || "Subject",
                gradeLevel: a.class?.grade?.level ?? 0,
                studentCount: a.class?._count?.students ?? 0,
                avgGrade,
                isHomeroom: false
            });
        });

        homerooms.forEach((h: any) => {
            const matchingEntries = Array.from(classesMap.values()).filter((c: any) => c.classId === h.id);
            if (matchingEntries.length > 0) {
                matchingEntries.forEach((entry: any) => {
                    entry.isHomeroom = true;
                });
            } else {
                classesMap.set(`homeroom_${h.id}`, {
                    id: `homeroom-${h.id}`,
                    classId: h.id,
                    className: h.name || "Homeroom Class",
                    subjectId: "homeroom",
                    subjectName: "Homeroom Advisory",
                    gradeLevel: h.grade?.level ?? 0,
                    studentCount: h._count?.students ?? 0,
                    avgGrade: null,
                    isHomeroom: true
                });
            }
        });

        return NextResponse.json({ classes: Array.from(classesMap.values()) });
    } catch (e) {
        return handleApiError(e);
    }
}
