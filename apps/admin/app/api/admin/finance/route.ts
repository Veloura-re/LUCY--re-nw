import { NextRequest, NextResponse } from 'next/server';
import { AdminRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/server-auth';
import { logAdminAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request, [AdminRole.FINANCE]);
    if (auth instanceof NextResponse) return auth;

    const { admin, ip, userAgent } = auth;

    // 1. Payment Aggregations
    const payments = await prisma.payment.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            amount: true,
            status: true,
            method: true,
            reference: true,
            createdAt: true,
            invoice: {
                select: {
                    id: true,
                    amount: true,
                    status: true,
                    school: { select: { id: true, name: true } },
                },
            },
        },
    });

    const paymentStats = await prisma.payment.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: { id: true },
    });

    // 2. Gateway distribution
    const gatewayStats = await prisma.payment.groupBy({
        by: ['method'],
        _sum: { amount: true },
        _count: { id: true },
    });

    // 3. Payroll status summary
    const payrollStats = await prisma.staffPayroll.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: { id: true },
    });

    await logAdminAction({
        adminId: admin.id,
        action: 'FINANCE_DASHBOARD_VIEWED',
        targetResource: 'FinanceLedger',
        ipAddress: ip,
        userAgent,
    });

    return NextResponse.json({
        summary: {
            payments: paymentStats,
            gateways: gatewayStats,
            payroll: payrollStats,
        },
        recentTransactions: payments,
    });
}
