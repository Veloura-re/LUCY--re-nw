import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";

export async function GET() {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Fetch school invoices
            const { data: invoicesData, error: invErr } = await supabaseAdmin
                .from('Invoice')
                .select('*')
                .eq('schoolId', dbUser.schoolId!);
            if (invErr) throw invErr;

            const invoiceIds = (invoicesData || []).map((inv: any) => inv.id);

            // Fetch payments
            let paymentsData: any[] = [];
            if (invoiceIds.length > 0) {
                const { data, error } = await supabaseAdmin
                    .from('Payment')
                    .select('*')
                    .in('invoiceId', invoiceIds)
                    .eq('status', 'SUCCESS');
                if (error) throw error;
                paymentsData = data || [];
            }

            // Fetch school users (for payroll)
            const { data: usersData, error: uErr } = await supabaseAdmin
                .from('User')
                .select('id')
                .eq('schoolId', dbUser.schoolId!);
            if (uErr) throw uErr;
            const userIds = (usersData || []).map((u: any) => u.id);

            // Fetch payrolls
            let payrollsData: any[] = [];
            if (userIds.length > 0) {
                const { data, error } = await supabaseAdmin
                    .from('StaffPayroll')
                    .select('*')
                    .in('userId', userIds);
                if (error) throw error;
                payrollsData = data || [];
            }

            const now = new Date();
            const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

            const allPayments = paymentsData.filter(p => new Date(p.createdAt) >= twelveMonthsAgo);
            const allInvoices = (invoicesData || []).filter(inv => ['PENDING', 'OVERDUE'].includes(inv.status) && new Date(inv.createdAt) >= twelveMonthsAgo);
            const allPayrolls = payrollsData.filter(p => new Date(p.createdAt) >= twelveMonthsAgo);

            const labels: string[] = [];
            const datasets: { label: string, data: number[] }[] = [
                { label: "Successful Revenue", data: Array(12).fill(0) },
                { label: "Pending Invoices", data: Array(12).fill(0) },
                { label: "Staff Payroll", data: Array(12).fill(0) }
            ];

            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
                labels.push(monthLabel);

                const startOfMonth = d;
                const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

                const monthPayments = allPayments.filter(p => {
                    const cd = new Date(p.createdAt);
                    return cd >= startOfMonth && cd < endOfMonth;
                });
                const monthInvoices = allInvoices.filter(inv => {
                    const cd = new Date(inv.createdAt);
                    return cd >= startOfMonth && cd < endOfMonth;
                });
                const monthPayrolls = allPayrolls.filter(p => {
                    const cd = new Date(p.createdAt);
                    return cd >= startOfMonth && cd < endOfMonth;
                });

                datasets[0].data[11 - i] = monthPayments.reduce((acc, p) => acc + Number(p.amount), 0);
                datasets[1].data[11 - i] = monthInvoices.reduce((acc, inv) => acc + Number(inv.amount), 0);
                datasets[2].data[11 - i] = monthPayrolls.reduce((acc, p) => acc + Number(p.amount), 0);
            }

            const totalRevenueAmount = paymentsData.reduce((acc, p) => acc + Number(p.amount), 0);
            const totalPendingAmount = (invoicesData || []).filter(inv => ['PENDING', 'OVERDUE'].includes(inv.status)).reduce((acc, inv) => acc + Number(inv.amount), 0);
            const totalPayrollAmount = payrollsData.reduce((acc, p) => acc + Number(p.amount), 0);

            const efficiency = totalRevenueAmount
                ? (totalRevenueAmount / (totalRevenueAmount + totalPendingAmount)) * 100
                : 0;

            return NextResponse.json({
                trends: { labels, datasets },
                summary: {
                    totalLiquidity: totalRevenueAmount,
                    totalPending: totalPendingAmount,
                    totalExpenses: totalPayrollAmount,
                    efficiency: efficiency.toFixed(1)
                }
            });
        }

        // 1. Get Monthly Revenue (Last 12 Months)
        const labels: string[] = [];
        const datasets: { label: string, data: number[] }[] = [
            { label: "Successful Revenue", data: Array(12).fill(0) },
            { label: "Pending Invoices", data: Array(12).fill(0) },
            { label: "Staff Payroll", data: Array(12).fill(0) }
        ];

        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        // Sequential fetching for stability on Cloudflare Edge
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
