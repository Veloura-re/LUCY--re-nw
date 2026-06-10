import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        const schoolId = dbUser.schoolId!;

        // Fetch all datasets in parallel
        const [
            students,
            personnel,
            classes,
            subjects,
            exams,
            gradeRecords,
            attendance,
            invoices
        ] = await Promise.all([
            prisma.student.findMany({
                where: { schoolId },
                include: { class: true, grade: true }
            }),
            prisma.user.findMany({
                where: { schoolId }
            }),
            prisma.class.findMany({
                where: { grade: { schoolId } },
                include: { grade: true }
            }),
            prisma.subject.findMany({
                where: { schoolId }
            }),
            prisma.exam.findMany({
                where: { class: { grade: { schoolId } } },
                include: { class: true, subject: true, createdBy: true }
            }),
            prisma.gradeRecord.findMany({
                where: { student: { schoolId } },
                include: { student: true, exam: true, subject: true }
            }),
            prisma.attendanceRecord.findMany({
                where: { student: { schoolId } },
                include: { student: true, exam: true, period: true }
            }),
            prisma.invoice.findMany({
                where: { schoolId },
                include: { student: true }
            })
        ]);

        return NextResponse.json({
            success: true,
            data: {
                students: students.map(s => ({
                    ID: s.id,
                    Code: s.studentCode,
                    Name: `${s.firstName} ${s.lastName}`,
                    Class: s.class?.name || 'Unassigned',
                    Grade: s.grade.name,
                    EnrolledAt: s.enrolledAt.toISOString()
                })),
                personnel: personnel.map(p => ({
                    ID: p.id,
                    Email: p.email,
                    Name: p.name,
                    Role: p.role,
                    Status: p.verified ? 'Verified' : 'Pending'
                })),
                classes: classes.map(c => ({
                    ID: c.id,
                    Name: c.name,
                    Grade: c.grade.name
                })),
                subjects: subjects.map(s => ({
                    ID: s.id,
                    Name: s.name
                })),
                exams: exams.map(e => ({
                    ID: e.id,
                    Title: e.title,
                    Class: e.class.name,
                    Subject: e.subject.name,
                    TotalMarks: e.totalMarks,
                    CreatedBy: e.createdBy.name,
                    Date: e.createdAt.toISOString()
                })),
                grades: gradeRecords.map(g => ({
                    ID: g.id,
                    StudentCode: g.student.studentCode,
                    StudentName: `${g.student.firstName} ${g.student.lastName}`,
                    ExamTitle: g.exam.title,
                    Subject: g.subject.name,
                    Score: g.score,
                    Status: g.status,
                    Remark: g.remark || '',
                    Date: g.createdAt.toISOString()
                })),
                attendance: attendance.map(a => ({
                    ID: a.id,
                    StudentCode: a.student.studentCode,
                    StudentName: `${a.student.firstName} ${a.student.lastName}`,
                    Date: a.date.toISOString(),
                    Status: a.status,
                    Reason: a.reason || ''
                })),
                invoices: invoices.map(i => ({
                    ID: i.id,
                    StudentCode: i.student.studentCode,
                    StudentName: `${i.student.firstName} ${i.student.lastName}`,
                    Amount: i.amount,
                    Status: i.status,
                    DueDate: i.dueDate.toISOString()
                }))
            }
        });
    } catch (e) {
        return handleApiError(e);
    }
}
