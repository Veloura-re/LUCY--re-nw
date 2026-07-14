import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId') || '';
        const gradeId = searchParams.get('gradeId') || '';
        const status = searchParams.get('status') || ''; // PAID | PENDING | OVERDUE | NO_INVOICE
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const schoolId = user.schoolId!;

        // Build student filter
        const studentWhere: any = {
            schoolId,
            enrollmentStatus: 'ACTIVE',
        };
        if (classId) studentWhere.classId = classId;
        if (gradeId) studentWhere.gradeId = gradeId;
        if (search) {
            studentWhere.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { studentCode: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Get students with their invoices and payments
        const [students, totalStudents, classes, grades] = await Promise.all([
            prisma.student.findMany({
                where: studentWhere,
                orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
                skip,
                take: limit,
                include: {
                    class: { select: { id: true, name: true } },
                    grade: { select: { id: true, name: true } },
                    invoices: {
                        orderBy: { createdAt: 'desc' },
                        include: {
                            items: true,
                            payments: true,
                        }
                    }
                }
            }),
            prisma.student.count({ where: studentWhere }),
            prisma.class.findMany({
                where: { schoolId },
                orderBy: { name: 'asc' },
                select: { id: true, name: true, gradeId: true }
            }),
            prisma.grade.findMany({
                where: { schoolId },
                orderBy: { name: 'asc' },
                select: { id: true, name: true }
            })
        ]);

        // Compute per-student financial summary
        const studentDossiers = students.map(student => {
            const invoices = student.invoices;
            const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
            const totalPaid = invoices.reduce((sum, inv) =>
                sum + inv.payments.filter(p => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0), 0);
            const totalPending = invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + Number(i.amount), 0);
            const totalOverdue = invoices.filter(i => i.status === 'OVERDUE').reduce((sum, i) => sum + Number(i.amount), 0);
            const latestInvoice = invoices[0] || null;

            let overallStatus = 'NO_INVOICE';
            if (invoices.length > 0) {
                if (totalOverdue > 0) overallStatus = 'OVERDUE';
                else if (totalPending > 0) overallStatus = 'PENDING';
                else overallStatus = 'PAID';
            }

            return {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                studentCode: student.studentCode,
                email: student.email,
                photoUrl: student.photoUrl,
                class: student.class,
                grade: student.grade,
                financials: {
                    totalBilled,
                    totalPaid,
                    totalPending,
                    totalOverdue,
                    balance: totalBilled - totalPaid,
                    invoiceCount: invoices.length,
                    overallStatus,
                    latestInvoice: latestInvoice ? {
                        id: latestInvoice.id,
                        amount: Number(latestInvoice.amount),
                        status: latestInvoice.status,
                        dueDate: latestInvoice.dueDate,
                        createdAt: latestInvoice.createdAt,
                    } : null,
                }
            };
        });

        // Apply status filter after computing (since it's computed not DB)
        const filtered = status
            ? studentDossiers.filter(s => s.financials.overallStatus === status)
            : studentDossiers;

        // School-wide summary stats
        const allStudentInvoices = await prisma.invoice.groupBy({
            by: ['status'] as any,
            where: { schoolId },
            _count: { id: true },
            _sum: { amount: true },
        });

        return NextResponse.json({
            students: filtered,
            total: totalStudents,
            page,
            limit,
            classes,
            grades,
            summary: allStudentInvoices,
        });
    } catch (e) {
        return handleApiError(e);
    }
}
