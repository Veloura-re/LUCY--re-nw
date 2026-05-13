import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        const { searchParams } = new URL(request.url);
        const targetStudentId = searchParams.get('studentId');

        // Authorization Logic
        let studentIdToFetch: string | null = null;

        if (dbUser.role === 'PARENT') {
            if (targetStudentId) {
                // Check if parent is linked to this student
                let isLinked = false;
                if (!prisma) {
                    const { createClient } = require('@supabase/supabase-js');
                    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                    const { data } = await supabaseAdmin.from('ParentStudentLink').select('studentId').eq('parentId', dbUser.id).eq('studentId', targetStudentId);
                    isLinked = data && data.length > 0;
                } else {
                    const parentLinks = await prisma.parentStudentLink.findMany({
                        where: { parentId: dbUser.id }
                    });
                    isLinked = parentLinks.some(link => link.studentId === targetStudentId);
                }

                if (!isLinked) return NextResponse.json({ error: 'Forbidden - Student not linked' }, { status: 403 });
                studentIdToFetch = targetStudentId;
            } else {
                return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
            }
        } else if (dbUser.role === 'STUDENT') {
            let student = null;
            if (!prisma) {
                const { createClient } = require('@supabase/supabase-js');
                const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                const { data } = await supabaseAdmin.from('Student').select('id').eq('userId', dbUser.id).single();
                student = data;
            } else {
                student = await prisma.student.findFirst({ where: { userId: dbUser.id } });
            }
            // Students can only see themselves
            if (targetStudentId && targetStudentId !== student?.id) {
                return NextResponse.json({ error: 'Forbidden - You cannot view other students' }, { status: 403 });
            }
            studentIdToFetch = student?.id || null;
        } else {
            // Staff roles
            let student = null;
            if (!prisma) {
                const { createClient } = require('@supabase/supabase-js');
                const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                const { data } = await supabaseAdmin.from('Student').select('id').eq('userId', dbUser.id).maybeSingle();
                student = data;
            } else {
                student = await prisma.student.findFirst({ where: { userId: dbUser.id } });
            }
            studentIdToFetch = targetStudentId || student?.id || null;

            // Ensure staff only sees students in their school
            if (studentIdToFetch) {
                let targetSchoolId = null;
                if (!prisma) {
                    const { createClient } = require('@supabase/supabase-js');
                    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                    const { data } = await supabaseAdmin.from('Student').select('schoolId').eq('id', studentIdToFetch).single();
                    targetSchoolId = data?.schoolId;
                } else {
                    const targetStudent = await prisma.student.findUnique({
                        where: { id: studentIdToFetch },
                        select: { schoolId: true }
                    });
                    targetSchoolId = targetStudent?.schoolId;
                }
                
                if (targetSchoolId !== dbUser.schoolId) {
                    return NextResponse.json({ error: 'Forbidden - Student outside school boundary' }, { status: 403 });
                }
            }
        }

        if (!studentIdToFetch) return NextResponse.json({ error: 'No student profile target identified' }, { status: 400 });

        let records = [];
        let student = null;

        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            
            // Basic Edge Fallback
            const { data: studentData } = await supabaseAdmin.from('Student').select('firstName, lastName').eq('id', studentIdToFetch).single();
            student = studentData;

            const { data: gradeData } = await supabaseAdmin.from('GradeRecord').select('*, subject:Subject(name), exam:Exam(title, config, questions)').eq('studentId', studentIdToFetch).order('createdAt', { ascending: false });
            records = gradeData || [];
            
            // For edge we skip ExamAttempts to save latency, fallback to simple grades
            const grouped: any = {};
            records.forEach(r => {
                if (!grouped[r.subjectId]) {
                    grouped[r.subjectId] = {
                        subjectId: r.subjectId,
                        subjectName: r.subject?.name,
                        exams: [],
                        totalScore: 0,
                        totalMax: 0
                    };
                }
                const max = r.exam?.config?.maxScore || 100;
                grouped[r.subjectId].exams.push({
                    id: r.id,
                    title: r.exam?.title || "Assignment",
                    date: r.createdAt,
                    score: r.score,
                    maxScore: max,
                    remark: r.remark,
                    attempt: null // Edge fallback
                });
                grouped[r.subjectId].totalScore += Number(r.score);
                grouped[r.subjectId].totalMax += Number(max);
            });

            const result = Object.values(grouped).map((g: any) => ({
                ...g,
                average: g.totalMax > 0 ? (g.totalScore / g.totalMax) * 100 : 0
            }));

            return NextResponse.json({
                grouped: result,
                studentName: student ? `${student.firstName} ${student.lastName}` : null
            });
        }

        records = await prisma.gradeRecord.findMany({
            where: { studentId: studentIdToFetch },
            include: {
                exam: true,
                subject: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Fetch ExamAttempts for these exams to get detailed feedback
        const examIds = records.map(r => r.examId).filter(Boolean) as string[];
        const attempts = await prisma.examAttempt.findMany({
            where: {
                studentId: studentIdToFetch,
                examId: { in: examIds }
            }
        });

        // Fetch student name for the header if viewing as parent/staff
        student = await prisma.student.findUnique({
            where: { id: studentIdToFetch },
            select: { firstName: true, lastName: true }
        });

        // Group by Subject
        const grouped: any = {};
        records.forEach(r => {
            if (!grouped[r.subjectId]) {
                grouped[r.subjectId] = {
                    subjectId: r.subjectId,
                    subjectName: r.subject.name,
                    exams: [],
                    totalScore: 0,
                    totalMax: 0
                };
            }

            const max = r.exam?.config ? (r.exam.config as any).maxScore || 100 : 100;
            const attempt = attempts.find(a => a.examId === r.examId);

            grouped[r.subjectId].exams.push({
                id: r.id,
                title: r.exam?.title || "Assignment",
                date: r.createdAt,
                score: r.score,
                maxScore: max,
                remark: r.remark,
                attempt: attempt ? {
                    id: attempt.id,
                    answers: attempt.answers,
                    metadata: (attempt as any).metadata,
                    questions: r.exam?.questions
                } : null
            });

            grouped[r.subjectId].totalScore += Number(r.score);
            grouped[r.subjectId].totalMax += Number(max);
        });

        const result = Object.values(grouped).map((g: any) => ({
            ...g,
            average: g.totalMax > 0 ? (g.totalScore / g.totalMax) * 100 : 0
        }));

        return NextResponse.json({
            grouped: result,
            studentName: student ? `${student.firstName} ${student.lastName}` : null
        });
    } catch (e) {
        return handleApiError(e);
    }
}
