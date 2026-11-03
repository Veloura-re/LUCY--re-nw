import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError, FINANCE_ROLES, clampLimit, clampPage } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const user = await requireRole(FINANCE_ROLES);
        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId') || '';
        const gradeId = searchParams.get('gradeId') || '';
        const status = searchParams.get('status') || ''; // PAID | PENDING | OVERDUE | NO_INVOICE
        const search = searchParams.get('search') || '';
        const page = clampPage(searchParams.get('page'));
        const limit = clampLimit(searchParams.get('limit'), 50);
        const skip = (page - 1) * limit;

        const schoolId = user.schoolId!;

        // Fetch school details
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true, schoolCode: true, logoUrl: true }
        });

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
        const [students, totalStudents, classes, grades, allReceipts] = await Promise.all([
            prisma.student.findMany({
                where: studentWhere,
                orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
                skip,
                take: limit,
                include: {
                    class: { select: { id: true, name: true } },
                    grade: { select: { id: true, name: true } },
                    parentLinks: {
                        include: {
                            parent: { select: { id: true, name: true, email: true, role: true } }
                        }
                    },
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
            }),
            prisma.billingReceipt.findMany({
                where: { schoolId },
                orderBy: { createdAt: 'desc' },
                take: 20
            }).catch(() => [])
        ]);

        // Compute per-student financial summary
        const studentDossiers = students.map(student => {
            const invoices = student.invoices || [];
            const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
            const primaryParent = student.parentLinks?.[0]?.parent;
            
            const allPayments = invoices.flatMap(inv => (inv.payments || []).map((p: any) => ({
                id: p.id,
                invoiceId: inv.id,
                amount: Number(p.amount || 0),
                status: p.status || 'SUCCESS',
                paymentMethod: p.method || p.paymentMethod || 'MANUAL_RECEIPT',
                referenceId: p.reference || p.referenceId || p.transactionId || `REF-${p.id.slice(0, 10).toUpperCase()}`,
                receiptUrl: p.receiptUrl || p.proofUrl || p.metadata?.receiptUrl || p.metadata?.proofUrl || null,
                screenshotUrl: p.receiptUrl || p.proofUrl || p.metadata?.screenshotUrl || null,
                paidAt: p.createdAt || p.paidAt,
                submitterName: primaryParent?.name || `${student.firstName}'s Family`,
                submitterEmail: primaryParent?.email || student.email,
                schoolName: school?.name || 'Academic Institution'
            })));

            const totalPaid = allPayments.filter(p => p.status === 'SUCCESS').reduce((s, p) => s + p.amount, 0);
            const totalPending = invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + Number(i.amount || 0), 0);
            const totalOverdue = invoices.filter(i => i.status === 'OVERDUE').reduce((sum, i) => sum + Number(i.amount || 0), 0);
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
                    latestInvoice,
                    invoices: invoices.map(inv => ({
                        id: inv.id,
                        amount: Number(inv.amount),
                        status: inv.status,
                        createdAt: inv.createdAt,
                        dueDate: inv.dueDate,
                        items: inv.items,
                        payments: inv.payments
                    })),
                    payments: allPayments,
                    receiptScreenshots: allPayments.filter(p => p.receiptUrl || p.screenshotUrl)
                }
            };
        });

        // Filter by status if provided
        const filteredDossiers = status
            ? studentDossiers.filter(d => d.financials.overallStatus === status)
            : studentDossiers;

        return NextResponse.json({
            students: filteredDossiers,
            total: totalStudents,
            page,
            totalPages: Math.ceil(totalStudents / limit),
            classes,
            grades,
            school,
            recentReceipts: allReceipts
        });

    } catch (e) {
        return handleApiError(e);
    }
}
