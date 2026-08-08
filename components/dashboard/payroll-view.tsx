"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Briefcase,
    DollarSign,
    Users,
    Search,
    Wallet,
    Coins,
    Loader2,
    RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import SpringingLoader from "@/components/dashboard/springing-loader";

interface PayrollViewProps {
    user: any;
    school: any;
}

export function PayrollView({ user, school }: PayrollViewProps) {
    const [staff, setStaff] = useState<any[]>([]);
    const [payrollHistory, setPayrollHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [isIssuing, setIsIssuing] = useState(false);

    const [disbursementForm, setDisbursementForm] = useState({
        amount: "",
        bonus: "0",
        deductions: "0",
        paymentMethod: "BANK_TRANSFER",
        reference: "",
        notes: ""
    });

    useEffect(() => {
        fetchPayrollData();
    }, []);

    const fetchPayrollData = async () => {
        setLoading(true);
        try {
            const [staffRes, historyRes] = await Promise.all([
                fetch('/api/school/staffing'),
                fetch('/api/director/payroll')
            ]);

            const staffData = await staffRes.json();
            const historyData = await historyRes.json();

            if (staffData.staff) setStaff(staffData.staff);
            if (Array.isArray(historyData)) setPayrollHistory(historyData);
        } catch (e) {
            console.error("Failed to load payroll data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDisbursement = (member: any) => {
        setSelectedMember(member);
        const lastPay = payrollHistory.find(p => p.userId === member.id);
        const defaultAmount = lastPay ? lastPay.amount : (member.role === 'PRINCIPAL' ? '4500' : '2800');

        setDisbursementForm({
            amount: defaultAmount.toString(),
            bonus: "0",
            deductions: "0",
            paymentMethod: "BANK_TRANSFER",
            reference: `SAL-${Date.now().toString().slice(-6)}`,
            notes: `Monthly compensation for ${member.name} (${member.role})`
        });
    };

    const handleDisbursePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMember || !disbursementForm.amount) {
            toast.error("Please enter a valid salary disbursement amount.");
            return;
        }

        setIsIssuing(true);
        try {
            const totalAmount = parseFloat(disbursementForm.amount) + parseFloat(disbursementForm.bonus || "0") - parseFloat(disbursementForm.deductions || "0");

            const res = await fetch('/api/director/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedMember.id,
                    amount: totalAmount,
                    status: 'PAID',
                    reference: disbursementForm.reference,
                    notes: `${disbursementForm.notes} | Base: $${disbursementForm.amount}, Bonus: $${disbursementForm.bonus}, Deduct: $${disbursementForm.deductions}`
                })
            });

            if (res.ok) {
                const newRecord = await res.json();
                toast.success(`Disbursed $${totalAmount.toLocaleString()} to ${selectedMember.name}`);
                setPayrollHistory([newRecord, ...payrollHistory]);
                setSelectedMember(null);
            } else {
                const errData = await res.json();
                toast.error(errData.error || "Failed to execute salary disbursement");
            }
        } catch (e) {
            toast.error("Payment transmission failed");
        } finally {
            setIsIssuing(false);
        }
    };

    const totalMonthlyOutflow = payrollHistory.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
    const activeEducatorCount = staff.filter(s => s.role === 'TEACHER' || s.role === 'HOMEROOM').length;

    const filteredStaff = staff.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading && staff.length === 0 && payrollHistory.length === 0) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <SpringingLoader message="Synthesizing Faculty Compensation & Payroll Ledger..." />
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-10 pb-16 max-w-7xl mx-auto px-3 sm:px-6">
            {/* Header Telemetry */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-900 pb-6">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                Institutional Payroll Center
                            </h1>
                            <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest mt-0.5">
                                Faculty Compensation, Salary Packets & Institutional Outflow
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                    <Link href="/dashboard/finance">
                        <Button variant="outline" className="h-10 sm:h-11 px-4 rounded-xl border-zinc-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest hover:border-eduGreen-500/50">
                            <Coins className="w-4 h-4 mr-2 text-eduGreen-500" /> Fee Architecture
                        </Button>
                    </Link>
                    <Link href="/dashboard/revenue">
                        <Button variant="outline" className="h-10 sm:h-11 px-4 rounded-xl border-zinc-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest hover:border-eduGreen-500/50">
                            <DollarSign className="w-4 h-4 mr-2 text-eduGreen-500" /> Revenue Hub
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        onClick={fetchPayrollData}
                        disabled={loading}
                        className="h-10 sm:h-11 px-3 rounded-xl border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        title="Sync Payroll Ledger"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Top Payroll Analytics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 p-5 rounded-2xl shadow-sm">
                    <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        Active Campus Staff
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                        {staff.length}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-500" /> {activeEducatorCount} Accredited Educators
                    </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-amber-500/30 p-5 rounded-2xl shadow-sm bg-gradient-to-br from-amber-950/10 to-transparent">
                    <div className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">
                        Total Disbursed Outflow
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                        ${totalMonthlyOutflow.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2">
                        Institutional salary disbursements
                    </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 p-5 rounded-2xl shadow-sm">
                    <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        Salary Packets Issued
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                        {payrollHistory.length}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2">
                        Reconciled paystubs on ledger
                    </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-eduGreen-500/30 p-5 rounded-2xl shadow-sm">
                    <div className="text-[9px] font-mono font-bold text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest mb-1">
                        Disbursement Reliability
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-eduGreen-600 dark:text-eduGreen-400 tracking-tight">
                        100%
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2">
                        Zero salary disputes reported
                    </div>
                </Card>
            </div>

            {/* Staff Compensation Roster */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                            Staff Compensation Matrix
                        </h2>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                            Issue Monthly Packets & Reconcile Educator Hours
                        </p>
                    </div>

                    <div className="relative sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input
                            placeholder="Search educator or role..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="h-10 pl-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-xl text-xs"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i} className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-2xl p-5 shadow-sm animate-pulse">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
                                    <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-20" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                                        <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
                                    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
                                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-24" />
                                </div>
                            </Card>
                        ))
                    ) : filteredStaff.length === 0 ? (
                        <div className="col-span-full py-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                            <Users className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">No Staff Members Found</p>
                        </div>
                    ) : (
                        filteredStaff.map((member) => {
                            const history = payrollHistory.filter(p => p.userId === member.id);
                            const lastDisbursed = history[0];

                            return (
                                <Card key={member.id} className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-2xl p-5 shadow-sm hover:border-amber-500/40 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-500/20">
                                                {member.role}
                                            </span>
                                            {lastDisbursed && (
                                                <span className="text-[9px] text-zinc-400 font-mono">
                                                    Paid {format(new Date(lastDisbursed.createdAt), 'MMM dd')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center font-bold text-zinc-900 dark:text-white uppercase text-sm border border-zinc-200 dark:border-zinc-800">
                                                {member.name?.[0] || 'U'}
                                            </div>
                                            <div className="overflow-hidden">
                                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-tight truncate">
                                                    {member.name}
                                                </h3>
                                                <p className="text-[10px] text-zinc-500 truncate">
                                                    {member.email || "Campus Accredited"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                                        <div>
                                            <span className="text-[8px] font-mono text-zinc-400 uppercase">Last Packet</span>
                                            <div className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
                                                {lastDisbursed ? `$${parseFloat(lastDisbursed.amount).toLocaleString()}` : "Not Disbursed"}
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => handleOpenDisbursement(member)}
                                            size="sm"
                                            className="h-9 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md shadow-amber-900/20 active:scale-95 transition-all"
                                        >
                                            Issue Salary
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Historical Disbursements Ledger */}
            <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-900">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                            Historical Payroll Registry
                        </h2>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                            Audit Trail of All Disbursed Institutional Packets
                        </p>
                    </div>
                </div>

                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                    <th className="p-4">Staff Member</th>
                                    <th className="p-4">Reference</th>
                                    <th className="p-4">Disbursed Quantum</th>
                                    <th className="p-4">Timestamp</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-xs">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="p-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-28" /></td>
                                            <td className="p-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20" /></td>
                                            <td className="p-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16" /></td>
                                            <td className="p-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24" /></td>
                                            <td className="p-4"><div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-16" /></td>
                                        </tr>
                                    ))
                                ) : payrollHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-xs text-zinc-500 uppercase tracking-widest">
                                            No salary disbursements recorded on ledger.
                                        </td>
                                    </tr>
                                ) : (
                                    payrollHistory.map((record) => (
                                        <tr key={record.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                                            <td className="p-4 font-bold text-zinc-900 dark:text-white uppercase">
                                                {record.user?.name || "Campus Educator"}
                                            </td>
                                            <td className="p-4 text-zinc-500 font-mono text-[10px]">
                                                {record.reference || `PAY-${record.id.slice(0, 8)}`}
                                            </td>
                                            <td className="p-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                                                ${parseFloat(record.amount).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-zinc-500 font-mono text-[10px]">
                                                {format(new Date(record.createdAt), 'MMM dd, yyyy • HH:mm')}
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest font-mono bg-eduGreen-50 dark:bg-eduGreen-950/50 text-eduGreen-600 border border-eduGreen-500/30">
                                                    {record.status || "SETTLED"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Salary Disbursement Modal Popup */}
            <AnimatePresence>
                {selectedMember && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedMember(null)}
                            className="fixed inset-0 bg-black/75 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 z-10 overflow-hidden"
                        >
                            <div className="flex items-center gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-900">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center border border-amber-500/30 text-amber-600">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                        Disburse Salary Packet
                                    </h3>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                        {selectedMember.name} • {selectedMember.role}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleDisbursePayment} className="space-y-4 mt-5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                            Base Compensation ($ USD) *
                                        </label>
                                        <Input
                                            type="number"
                                            value={disbursementForm.amount}
                                            onChange={e => setDisbursementForm({ ...disbursementForm, amount: e.target.value })}
                                            required
                                            className="h-11 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                            Bonus / Performance ($)
                                        </label>
                                        <Input
                                            type="number"
                                            value={disbursementForm.bonus}
                                            onChange={e => setDisbursementForm({ ...disbursementForm, bonus: e.target.value })}
                                            className="h-11 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                            Deductions / Withholding ($)
                                        </label>
                                        <Input
                                            type="number"
                                            value={disbursementForm.deductions}
                                            onChange={e => setDisbursementForm({ ...disbursementForm, deductions: e.target.value })}
                                            className="h-11 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                            Payment Method
                                        </label>
                                        <select
                                            value={disbursementForm.paymentMethod}
                                            onChange={e => setDisbursementForm({ ...disbursementForm, paymentMethod: e.target.value })}
                                            className="h-11 w-full bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs font-medium text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                                        >
                                            <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                                            <option value="CHAPA">Chapa Electronic Gateway</option>
                                            <option value="CASH">Institutional Cash Voucher</option>
                                            <option value="CHECK">Certified Bank Check</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                            Transaction Reference Code
                                        </label>
                                        <Input
                                            value={disbursementForm.reference}
                                            onChange={e => setDisbursementForm({ ...disbursementForm, reference: e.target.value })}
                                            className="h-11 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-900">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setSelectedMember(null)}
                                        className="h-11 px-5 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-widest"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isIssuing}
                                        className="h-11 px-6 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-amber-900/30 flex items-center gap-2 active:scale-95 transition-all"
                                    >
                                        {isIssuing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            "Authorize Disbursement"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
