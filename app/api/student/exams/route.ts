import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const dbUser = await requireRole(['STUDENT']);

        let student;
        let examsData = [];

        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data } = await supabaseAdmin
                .from('Student')
                .select('id, classId, schoolId')
                .eq('userId', dbUser.id)
                .single();
            student = data;

            if (!student || !student.classId) {
                return NextResponse.json({ error: "Student profile not active" }, { status: 404 });
            }

            const { data: exams } = await supabaseAdmin
                .from('Exam')
                .select('*, subject:Subject(*), gradeRecords:GradeRecord(*), attempts:ExamAttempt(*)')
                .eq('classId', student.classId)
                .order('dueAt', { ascending: false });

            // Post-filter the gradeRecords and attempts arrays in JS to ensure student boundary
            examsData = (exams || []).map((exam: any) => {
                const studentGradeRecords = (exam.gradeRecords || []).filter((g: any) => g.studentId === student.id);
                const studentAttempts = (exam.attempts || []).filter((a: any) => a.studentId === student.id);
                return {
                    ...exam,
                    gradeRecords: studentGradeRecords,
                    attempts: studentAttempts
                };
            });
        } else {
            student = await prisma.student.findFirst({
                where: { userId: dbUser.id }
            });

            if (!student || !student.classId) {
                return NextResponse.json({ error: "Student profile not active" }, { status: 404 });
            }

            examsData = await prisma.exam.findMany({
                where: { classId: student.classId },
                include: {
                    subject: true,
                    gradeRecords: {
                        where: { studentId: student.id }
                    },
                    attempts: {
                        where: { studentId: student.id }
                    }
                },
                orderBy: { dueAt: 'desc' }
            });
        }

        const formattedExams = examsData.map(exam => {
            const now = new Date();
            const dueAt = exam.dueAt ? new Date(exam.dueAt) : null;
            const availableFrom = exam.availableFrom ? new Date(exam.availableFrom) : null;
            const hasSubmitted = (exam as any).attempts.some((a: any) => a.status === 'SUBMITTED') || exam.gradeRecords.length > 0;

            let status = "UPCOMING";
            if (exam.isPublished || hasSubmitted) {
                status = "COMPLETED";
            } else if (dueAt && now > dueAt) {
                status = "MISSED";
            } else if (!availableFrom || now >= availableFrom) {
                status = "ACTIVE";
            }

            return {
                id: exam.id,
                title: exam.title,
                subject: exam.subject.name,
                date: exam.dueAt,
                duration: exam.duration || 60,
                status,
                score: (exam.isPublished || hasSubmitted) ? (exam.gradeRecords[0]?.score || (exam.attempts[0]?.score ? Number(exam.attempts[0].score) : undefined)) : undefined,
                isPublished: exam.isPublished
            };
        });

        return NextResponse.json({ exams: formattedExams });

    } catch (e) {
        return handleApiError(e);
    }
}
