import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, publicErrorMessage } from '@/lib/security';
import { logActivity } from '@/lib/audit';
import { reportServerError } from '@/lib/error-capture';

// POST: Bulk update marks
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM']);
        const examId = id;
        const { marks }: any = await request.json().catch(() => ({})); // Array of { studentId, score, remark }

        // Fetch Exam to verify locking and details
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                subject: true,
                term: true,
                class: {
                    select: {
                        id: true,
                        name: true,
                        homeroomTeacherId: true,
                        grade: { select: { schoolId: true } }
                    }
                }
            }
        });

        if (!exam) return NextResponse.json({ error: "Marklist not found" }, { status: 404 });

        const schoolId = user.schoolId || exam.class?.grade?.schoolId;

        // Faculty permissions check
        if (['TEACHER', 'HOMEROOM'].includes(user.role)) {
            // Check term completion
            if (exam.term) {
                const isTermCompleted = !exam.term.isActive || (exam.term.endDate && new Date() > new Date(exam.term.endDate));
                if (isTermCompleted) {
                    return NextResponse.json({
                        error: "Academic term is completed. Marklists for finalized terms are read-only.",
                        code: "TERM_COMPLETED"
                    }, { status: 403 });
                }
            }

            if (exam.isLocked) {
                return NextResponse.json({
                    error: "Marklist is locked. Contact Principal or Director.",
                    code: "MARKLIST_LOCKED"
                }, { status: 403 });
            }

            // Verify teacher assignment
            let isAuthorized = false;
            if (exam.createdById === user.id) isAuthorized = true;
            if (!isAuthorized && exam.class?.homeroomTeacherId === user.id) isAuthorized = true;

            if (!isAuthorized) {
                const exactAssignment = await prisma.teacherAssignment.findFirst({
                    where: {
                        teacherId: user.id,
                        classId: exam.classId,
                        subjectId: exam.subjectId
                    }
                });
                if (exactAssignment) isAuthorized = true;
            }

            if (!isAuthorized) {
                const classAssignment = await prisma.teacherAssignment.findFirst({
                    where: {
                        teacherId: user.id,
                        classId: exam.classId
                    }
                });
                if (classAssignment) isAuthorized = true;
            }

            if (!isAuthorized) {
                const timetableSlot = await prisma.timetable.findFirst({
                    where: {
                        teacherId: user.id,
                        classId: exam.classId,
                        subjectId: exam.subjectId
                    }
                });
                if (timetableSlot) isAuthorized = true;
            }

            if (!isAuthorized) {
                return NextResponse.json({
                    error: "You are not assigned to edit grades for this class subject.",
                    code: "UNAUTHORIZED_TEACHER"
                }, { status: 403 });
            }
        }

        // Use transaction for bulk update
        const updates = (marks || []).map((m: any) =>
            prisma.gradeRecord.upsert({
                where: {
                    studentId_examId: {
                        studentId: m.studentId,
                        examId: examId
                    }
                },
                update: {
                    score: isNaN(parseFloat(m.score)) ? 0 : parseFloat(m.score),
                    remark: m.remark || null,
                    status: 'SUBMITTED'
                },
                create: {
                    studentId: m.studentId,
                    examId: examId,
                    subjectId: exam.subjectId,
                    score: isNaN(parseFloat(m.score)) ? 0 : parseFloat(m.score),
                    remark: m.remark || null,
                    createdById: user.id
                }
            })
        );

        await prisma.$transaction(updates);

        // Audit log with valid schoolId
        if (schoolId) {
            try {
                const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
                await logActivity({
                    userId: user.id,
                    schoolId,
                    action: 'UPDATE_EXAM_MARKS',
                    resourceType: 'EXAM',
                    resourceId: examId,
                    ip
                });
            } catch (auditErr) {
                console.error("Audit log error:", auditErr);
            }
        }

        return NextResponse.json({ success: true, count: updates.length });
    } catch (e: any) {
        console.error("Save Marks Error:", e);
        void reportServerError(e, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(e, "Failed to save marks") }, { status: 500 });
    }
}

// GET: Fetch detailed marks for this list
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM']);
        const examId = id;

        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                class: {
                    include: {
                        students: { orderBy: { lastName: 'asc' } },
                        grade: { select: { schoolId: true } }
                    }
                },
                subject: true,
                term: true,
                gradeRecords: true
            }
        });

        if (!exam) return NextResponse.json({ error: "Marklist not found" }, { status: 404 });

        let isTermCompleted = false;
        let isLiveTerm = false;
        if (exam.term) {
            const pastEnd = exam.term.endDate ? new Date() > new Date(exam.term.endDate) : false;
            isTermCompleted = !exam.term.isActive || pastEnd;
            isLiveTerm = exam.term.isActive && !pastEnd;
        }

        let canEdit = true;
        if (['TEACHER', 'HOMEROOM'].includes(user.role)) {
            if (isTermCompleted || exam.isLocked) {
                canEdit = false;
            } else {
                let isAuthorized = exam.createdById === user.id || exam.class?.homeroomTeacherId === user.id;
                if (!isAuthorized) {
                    const assignment = await prisma.teacherAssignment.findFirst({
                        where: { teacherId: user.id, classId: exam.classId }
                    });
                    if (assignment) isAuthorized = true;
                }
                canEdit = isAuthorized;
            }
        }

        // Map students to their grades
        const studentsWithMarks = exam.class.students.map(student => {
            const grade = exam.gradeRecords.find(g => g.studentId === student.id);
            return {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                studentCode: student.studentCode,
                photoUrl: student.photoUrl,
                score: grade?.score ?? null,
                remark: grade?.remark ?? "",
                gradeStatus: grade?.status
            };
        });

        return NextResponse.json({
            exam: {
                id: exam.id,
                title: exam.title,
                totalMarks: exam.totalMarks,
                category: exam.category,
                isLocked: exam.isLocked,
                subjectName: exam.subject.name,
                className: exam.class.name,
                term: exam.term,
                isTermCompleted,
                isLiveTerm,
                canEdit
            },
            students: studentsWithMarks
        });

    } catch (e: any) {
        void reportServerError(e, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(e) }, { status: 500 });
    }
}
