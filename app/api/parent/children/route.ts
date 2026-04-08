import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['PARENT']);

        const links = await prisma.parentStudentLink.findMany({
            where: { parentId: dbUser.id },
            include: {
                student: {
                    include: {
                        grade: true,
                        school: true,
                        class: {
                            include: {
                                homeroomTeacher: {
                                    select: { id: true, name: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (links.length === 0) return NextResponse.json({ students: [] });

        const studentIds = links.map(l => l.studentId);

        // Batch attendance records for all children in one query
        const allAttendance = await prisma.attendanceRecord.findMany({
            where: { studentId: { in: studentIds } },
            select: { studentId: true, status: true }
        });

        // Batch grade records (only published exams) for all children in one query
        const allGrades = await prisma.gradeRecord.findMany({
            where: {
                studentId: { in: studentIds },
                exam: { isPublished: true } as any
            },
            include: { exam: { select: { config: true } } }
        }) as any[];

        // Batch invoices for all children to get counts and balances
        const allInvoices = await prisma.invoice.findMany({
            where: { studentId: { in: studentIds } },
            select: { studentId: true, status: true, amount: true, createdAt: true }
        });

        // Build per-student statistics in memory
        const students = links.map((link) => {
            const sid = link.student.id;

            const studentAttendance = allAttendance.filter(a => a.studentId === sid);
            const presentCount = studentAttendance.filter(a => a.status === 'PRESENT').length;
            const attendancePct = studentAttendance.length > 0
                ? (presentCount / studentAttendance.length) * 100
                : 100;

            const studentGrades = allGrades.filter(g => g.studentId === sid);
            let averageScore = 0;
            if (studentGrades.length > 0) {
                const total = studentGrades.reduce((acc: number, g: any) => {
                    const max = (g.exam?.config as any)?.maxScore || 100;
                    return acc + (g.score / max);
                }, 0);
                averageScore = (total / studentGrades.length) * 100;
            }

            const studentInvoices = allInvoices.filter(i => i.studentId === sid);
            const unpaidInvoices = studentInvoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE');
            const totalOutstanding = unpaidInvoices.reduce((acc, inv) => acc + Number(inv.amount), 0);

            const recentInvoices = allInvoices
                .filter(i => i.studentId === sid)
                .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
                .slice(0, 3);

            return {
                ...link.student,
                recentInvoices,
                stats: {
                    attendancePct: attendancePct.toFixed(1),
                    averageScore: averageScore.toFixed(1),
                    invoiceCount: unpaidInvoices.length,
                    totalOutstanding: totalOutstanding.toFixed(2)
                }
            };
        });

        return NextResponse.json({ students });
    } catch (e) {
        return handleApiError(e);
    }
}
