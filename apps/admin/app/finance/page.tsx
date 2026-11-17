import React from 'react';
import { AdminRole } from '@prisma/client';
import { protectAdminPage } from '@/lib/page-guard';
import { AdminShell } from '@/components/admin-shell';
import { prisma } from '@/lib/prisma';
import { DollarSign, CreditCard, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

export default async function FinanceAdminPage() {
    const admin = await protectAdminPage([AdminRole.FINANCE], '/finance');

    const [payments, paymentAgg, gatewayAgg, payrollAgg] = await Promise.all([
        prisma.payment.findMany({
            take: 25,
            orderBy: { createdAt: 'desc' },
            include: {
                invoice: {
                    select: {
                        id: true,
                        school: { select: { name: true, schoolCode: true } },
                    },
                },
            },
        }),
        prisma.payment.groupBy({
            by: ['status'],
            _sum: { amount: true },
            _count: { id: true },
        }),
        prisma.payment.groupBy({
            by: ['method'],
            _sum: { amount: true },
            _count: { id: true },
        }),
        prisma.staffPayroll.groupBy({
            by: ['status'],
            _sum: { amount: true },
            _count: { id: true },
        }),
    ]);

    const totalRevenue = paymentAgg
        .filter((p: any) => p.status === 'SUCCESS' || p.status === 'PAID')
        .reduce((acc: number, curr: any) => acc + (curr._sum.amount?.toNumber() || 0), 0);

    const pendingRevenue = paymentAgg
        .filter((p: any) => p.status === 'PENDING')
        .reduce((acc: number, curr: any) => acc + (curr._sum.amount?.toNumber() || 0), 0);

    const totalPayroll = payrollAgg
        .filter((p: any) => p.status === 'COMPLETED' || p.status === 'PAID')
        .reduce((acc: number, curr: any) => acc + (curr._sum.amount?.toNumber() || 0), 0);

    return (
        <AdminShell admin={admin}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl font-bold font-mono text-zinc-100 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                        FINANCIAL INTELLIGENCE & TRANSACTION LEDGER
                    </h1>
                    <p className="text-xs font-mono text-zinc-400 mt-1">
                        Restricted Access: Finance Administrator Clearance
                    </p>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                            Collected Revenue
                        </span>
                        <div className="text-2xl font-bold font-mono text-emerald-400">
                            ETB {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">Cleared institutional fees</span>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                            Pending Invoices
                        </span>
                        <div className="text-2xl font-bold font-mono text-amber-400">
                            ETB {pendingRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">Awaiting payment verification</span>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                            Payroll Disbursed
                        </span>
                        <div className="text-2xl font-bold font-mono text-cyan-400">
                            ETB {totalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">Completed faculty salary disbursements</span>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                            Active Gateways
                        </span>
                        <div className="text-lg font-bold font-mono text-zinc-200 mt-1">
                            Chapa / Stripe / Telebirr
                        </div>
                        <span className="text-[11px] text-emerald-400 mt-1 block">Operational webhook listeners</span>
                    </div>
                </div>

                {/* Gateway Distribution Table */}
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-6">
                    <h2 className="text-sm font-bold font-mono text-zinc-200 mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-zinc-400" />
                        PAYMENT GATEWAY DISTRIBUTION
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['CHAPA', 'STRIPE', 'TELEBIRR'].map((gateway) => {
                            const stat = (gatewayAgg as any[]).find((g: any) => g.method === gateway);
                            const count = stat?._count?.id || 0;
                            const amount = stat?._sum?.amount?.toNumber() || 0;
                            return (
                                <div key={gateway} className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-mono text-xs font-bold text-zinc-300">{gateway}</span>
                                        <span className="text-[11px] font-mono text-zinc-500">{count} txs</span>
                                    </div>
                                    <div className="text-lg font-mono font-semibold text-zinc-100">
                                        ETB {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Transactions Ledger */}
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                        <h2 className="text-sm font-bold font-mono text-zinc-200">
                            TRANSACTION LEDGER STREAM (LATEST 25)
                        </h2>
                        <span className="text-xs font-mono text-zinc-500">Auto-updating ledger</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                            <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                                <tr>
                                    <th className="py-3 px-4">TX ID</th>
                                    <th className="py-3 px-4">School</th>
                                    <th className="py-3 px-4">Method</th>
                                    <th className="py-3 px-4">Amount</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-zinc-500">
                                            No transactions recorded in the ledger yet.
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-zinc-900/40">
                                            <td className="py-3 px-4 text-zinc-400">{p.id.slice(0, 8)}...</td>
                                            <td className="py-3 px-4 font-semibold text-zinc-200">
                                                {p.invoice?.school?.name || 'Platform Service'}
                                            </td>
                                            <td className="py-3 px-4 text-zinc-300">{p.method || 'DIRECT'}</td>
                                            <td className="py-3 px-4 text-emerald-400 font-semibold">
                                                ETB {Number(p.amount).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                        p.status === 'SUCCESS' || p.status === 'PAID'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                            : p.status === 'PENDING'
                                                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}
                                                >
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-zinc-500">
                                                {new Date(p.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminShell>
    );
}
