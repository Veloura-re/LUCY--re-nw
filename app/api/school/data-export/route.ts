import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        const schoolId = dbUser.schoolId!;

        // Fetch all datasets in parallel
        const [
            school,
            students,
            personnel,
            parents,
            classes,
            subjects,
            exams,
            gradeRecords,
            attendance,
            invoices,
            books,
            events,
            payrolls,
            assignments,
            lessons,
            timetables
        ] = await Promise.all([
            prisma.school.findUnique({ where: { id: schoolId } }),
            prisma.student.findMany({ where: { schoolId }, include: { class: true, grade: true } }),
            prisma.user.findMany({ where: { schoolId, role: { not: 'PARENT' } } }),
            prisma.user.findMany({ where: { schoolId, role: 'PARENT' }, include: { parentLinks: { include: { student: true } } } }),
            prisma.class.findMany({ where: { grade: { schoolId } }, include: { grade: true } }),
            prisma.subject.findMany({ where: { schoolId } }),
            prisma.exam.findMany({ where: { class: { grade: { schoolId } } }, include: { class: true, subject: true, createdBy: true } }),
            prisma.gradeRecord.findMany({ where: { student: { schoolId } }, include: { student: true, exam: true, subject: true } }),
            prisma.attendanceRecord.findMany({ where: { student: { schoolId } }, include: { student: true, exam: true, period: true } }),
            prisma.invoice.findMany({ where: { schoolId }, include: { student: true } }),
            prisma.book.findMany({ where: { grade: { schoolId } }, include: { subject: true } }),
            prisma.event.findMany({ where: { schoolId }, include: { createdBy: true } }),
            prisma.staffPayroll.findMany({ include: { user: true } }), // In a real app we'd filter by user.schoolId
            prisma.assignment.findMany({ where: { class: { grade: { schoolId } } }, include: { class: true, subject: true, teacher: true } }),
            prisma.lesson.findMany({ where: { class: { grade: { schoolId } } }, include: { class: true, subject: true, teacher: true } }),
            prisma.timetable.findMany({ where: { class: { grade: { schoolId } } }, include: { class: true, subject: true, teacher: true, period: true } })
        ]);

        const payrollsFiltered = payrolls.filter(p => p.user.schoolId === schoolId);

        return NextResponse.json({
            success: true,
            schoolName: school?.name || "LUCY Educational Institute",
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
                parents: parents.map(p => ({
                    ID: p.id,
                    Name: p.name,
                    Email: p.email,
                    Children: p.parentLinks.map(l => `${l.student.firstName} ${l.student.lastName}`).join(', ') || 'None Linked'
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
                })),
                books: books.map(b => ({
                    Title: b.title,
                    Author: b.author || 'Unknown',
                    Subject: b.subject?.name || 'General'
                })),
                events: events.map(e => ({
                    Title: e.title,
                    StartDate: e.eventDate.toISOString(),
                    Creator: e.createdBy?.name || 'System'
                })),
                payrolls: payrollsFiltered.map(p => ({
                    StaffName: p.user.name,
                    Role: p.user.role,
                    PeriodStart: p.periodStart.toISOString().split('T')[0],
                    PeriodEnd: p.periodEnd.toISOString().split('T')[0],
                    Amount: Number(p.amount),
                    Status: p.status
                })),
                assignments: assignments.map(a => ({
                    Title: a.title,
                    Class: a.class.name,
                    Subject: a.subject.name,
                    Teacher: a.teacher.name,
                    DueAt: a.dueDate.toISOString()
                })),
                lessons: lessons.map(l => ({
                    Topic: l.topic,
                    Class: l.class.name,
                    Subject: l.subject.name,
                    Teacher: l.teacher.name,
                    Date: l.date.toISOString()
                })),
                timetables: timetables.map(t => ({
                    Class: t.class.name,
                    Subject: t.subject.name,
                    Teacher: t.teacher.name,
                    DayOfWeek: t.dayOfWeek,
                    Period: t.period?.name || `Period ${t.periodId}`
                }))
            }
        });
    } catch (e) {
        return handleApiError(e);
    }
}
