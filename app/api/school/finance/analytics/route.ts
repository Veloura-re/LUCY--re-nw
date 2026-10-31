import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, FINANCE_ROLES } from "@/lib/security";

export async function GET() {
    try {
        const dbUser = await requireRole(FINANCE_ROLES);

        // 1. Get Monthly Revenue (Last 12 Months)
        const labels: string[] = [];
        const datasets: { label: string, data: number[] }[] = [
            { label: "Successful Revenue", data: Array(12).fill(0) },
            { label: "Pending Invoices", data: Array(12).fill(0) },
            { label: "Staff Payroll", data: Array(12).fill(0) }
        ];

        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        const allPayments = await prisma.payment.findMany({
            where: {
                status: 'SUCCESS',
                createdAt: { gte: twelveMonthsAgo },
                invoice: { schoolId: dbUser.schoolId! }
            },
            select: { amount: true, createdAt: true }
        });

        const allInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['PENDING', 'OVERDUE'] },
                createdAt: { gte: twelveMonthsAgo },
                schoolId: dbUser.schoolId!
            },
            select: { amount: true, createdAt: true }
        });

        const allPayrolls = await (prisma as any).staffPayroll.findMany({
            where: {
                createdAt: { gte: twelveMonthsAgo },
                user: { schoolId: dbUser.schoolId! }
            },
            select: { amount: true, createdAt: true }
        });

        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            labels.push(monthLabel);

            const startOfMonth = d;
            const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

            const monthPayments = allPayments.filter(p => p.createdAt >= startOfMonth && p.createdAt < endOfMonth);
            const monthInvoices = allInvoices.filter(inv => inv.createdAt >= startOfMonth && inv.createdAt < endOfMonth);
            const monthPayrolls = allPayrolls.filter((p: any) => p.createdAt >= startOfMonth && p.createdAt < endOfMonth);

            datasets[0].data[11 - i] = monthPayments.reduce((acc, p) => acc + Number(p.amount), 0);
            datasets[1].data[11 - i] = monthInvoices.reduce((acc, inv) => acc + Number(inv.amount), 0);
            datasets[2].data[11 - i] = monthPayrolls.reduce((acc: number, p: any) => acc + Number(p.amount), 0);
        }

        // 2. Overview Metrics
        const totalRevenue = await prisma.payment.aggregate({
            where: { status: 'SUCCESS', invoice: { schoolId: dbUser.schoolId! } },
            _sum: { amount: true }
        });

        const totalPending = await prisma.invoice.aggregate({
            where: { status: { in: ['PENDING', 'OVERDUE'] }, schoolId: dbUser.schoolId! },
            _sum: { amount: true }
        });

        const totalPayroll = await (prisma as any).staffPayroll.aggregate({
            where: { user: { schoolId: dbUser.schoolId! } },
            _sum: { amount: true }
        });

        const efficiency = totalRevenue._sum.amount
            ? (Number(totalRevenue._sum.amount) / (Number(totalRevenue._sum.amount) + Number(totalPending._sum.amount || 0))) * 100
            : 0;

        return NextResponse.json({
            trends: { labels, datasets },
            summary: {
                totalLiquidity: Number(totalRevenue._sum.amount || 0),
                totalPending: Number(totalPending._sum.amount || 0),
                totalExpenses: Number(totalPayroll._sum.amount || 0),
                efficiency: efficiency.toFixed(1)
            }
        });

    } catch (error: any) {
        return handleApiError(error);
    }
}
