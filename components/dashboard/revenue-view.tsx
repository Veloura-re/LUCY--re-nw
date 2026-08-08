"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    CreditCard,
    Plus,
    Trash2,
    DollarSign,
    Calculator,
    Briefcase,
    Search,
    Filter,
    ShieldCheck,
    Printer,
    ArrowRight,
    Users,
    Layers,
    CheckCircle2,
    Clock,
    AlertCircle,
    Download,
    Coins
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { FeeStructureModal } from "@/components/dashboard/fee-structure-modal";
import { InvoicePrint } from "./invoice-print";
import { useReactToPrint } from "react-to-print";
import { format } from "date-fns";

interface RevenueViewProps {
    user: any;
    school: any;
    grades: any[];
}

export function RevenueView({ user, school, grades }: RevenueViewProps) {
    const [fees, setFees] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [financialAnalytics, setFinancialAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Fee Structure Modal State
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deletingFee, setDeletingFee] = useState(false);

    // Filter and Pagination State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;

    // Verification and Print State
    const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null);
    const [printInvoice, setPrintInvoice] = useState<any>(null);
    const [printStudent, setPrintStudent] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Institutional_Invoice_${printInvoice?.id?.slice(0, 8) || 'Receipt'}`
    });

    const triggerPrint = (inv: any, student: any) => {
        setPrintInvoice(inv);
        setPrintStudent(student);
        setTimeout(() => {
            if (handlePrint) handlePrint();
        }, 150);
    };

    useEffect(() => {
        fetchInitialData();
        fetchInvoices(1, statusFilter, searchQuery);
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [feesRes, analyticsRes, pendingRes] = await Promise.all([
                fetch('/api/school/finance/fees'),
                fetch('/api/school/finance/analytics'),
                fetch('/api/school/finance/pay/pending')
            ]);

            const feesData = await feesRes.json();
            const analyticsData = await analyticsRes.json();
            const pendingData = await pendingRes.json();

            if (feesData.fees) setFees(feesData.fees);
            if (analyticsData) setFinancialAnalytics(analyticsData);
            if (pendingData.payments) setPendingPayments(pendingData.payments);
        } catch (e) {
            console.error("Failed to load revenue initial data", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchInvoices = async (targetPage = page, status = statusFilter, query = searchQuery) => {
        try {
            const params = new URLSearchParams({
                page: targetPage.toString(),
                limit: limit.toString(),
                status,
                q: query
            });
            const res = await fetch(`/api/school/finance/invoices?${params.toString()}`);
            const data = await res.json();
            if (data.invoices) {
                setInvoices(data.invoices);
                setTotalPages(data.totalPages || 1);
            }
        } catch (e) {
            console.error("Failed to load invoices", e);
        }
    };

    const handleDeleteFee = async () => {
        if (!deleteId) return;
        setDeletingFee(true);
        try {
            const res = await fetch(`/api/school/finance/fees/${deleteId}`, { method: 'DELETE' });
            if (res.ok) {
                setFees(fees.filter(f => f.id !== deleteId));
                toast.success("Fee structure successfully dismantled.");
                setDeleteId(null);
            } else {
                toast.error("Failed to dismantle fee structure.");
            }
        } catch (e) {
            toast.error("Network synchronization failed.");
        } finally {
            setDeletingFee(false);
        }
    };

    const handleVerifyPayment = async (paymentId: string, status: 'SUCCESS' | 'FAILED') => {
        setVerifyingPayment(paymentId);
        try {
            const res = await fetch('/api/school/finance/pay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId, status })
            });

            if (res.ok) {
                toast.success(`Payment transaction marked as ${status}.`);
                setPendingPayments(pendingPayments.filter(p => p.id !== paymentId));
                fetchInitialData();
                fetchInvoices(page, statusFilter, searchQuery);
            } else {
                const errData = await res.json();
                toast.error(errData.error || "Failed to reconcile payment.");
            }
        } catch (e) {
            toast.error("Reconciliation pipeline offline.");
        } finally {
            setVerifyingPayment(null);
        }
    };

    const totalCollected = financialAnalytics?.totalCollected || 0;
    const totalInvoiced = financialAnalytics?.totalInvoiced || 0;
    const totalOutstanding = Math.max(0, totalInvoiced - totalCollected);

    return (
        <div className="space-y-6 sm:space-y-10 pb-16 max-w-7xl mx-auto px-3 sm:px-6">
            {/* Header Telemetry */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-900 pb-6">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-eduGreen-50 dark:bg-eduGreen-950/40 border border-eduGreen-500/30 flex items-center justify-center text-eduGreen-600 dark:text-eduGreen-400 font-bold">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                Institutional Revenue Hub
                            </h1>
                            <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest mt-0.5">
                                Real-Time Cash Flow, Tuition Streams & Reconciliation
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <Link href="/dashboard/finance">
                        <Button variant="outline" className="h-10 sm:h-11 px-4 rounded-xl border-zinc-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest hover:border-eduGreen-500/50">
                            <Coins className="w-4 h-4 mr-2 text-eduGreen-500" /> Fee Architecture
                        </Button>
                    </Link>
                    <Link href="/dashboard/payroll">
                        <Button variant="outline" className="h-10 sm:h-11 px-4 rounded-xl border-zinc-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest hover:border-amber-500/50">
                            <Briefcase className="w-4 h-4 mr-2 text-amber-500" /> Payroll Center
                        </Button>
                    </Link>
                    <Button
                        onClick={() => setShowFeeModal(true)}
                        className="h-10 sm:h-11 px-5 rounded-xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-eduGreen-900/30 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Create Structure
                    </Button>
                </div>
            </div>

            {/* Revenue Analytics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        Gross Invoiced Quantum
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                        ${totalInvoiced.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-eduGreen-500" /> Authorized billable tuition
                    </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-eduGreen-500/30 p-5 rounded-2xl shadow-sm relative overflow-hidden bg-gradient-to-br from-eduGreen-950/10 to-transparent">
                    <div className="text-[9px] font-mono font-bold text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest mb-1">
                        Collected Revenue
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-eduGreen-600 dark:text-eduGreen-400 tracking-tight">
                        ${totalCollected.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2">
                        Reconciled and settled funds
                    </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-amber-500/30 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">
                        Outstanding Receivables
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                        ${totalOutstanding.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2">
                        Pending scholar tuition balances
                    </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        Pending Verification
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                        {pendingPayments.length}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2">
                        Bank transfers awaiting audit
                    </div>
                </Card>
            </div>

            {/* Pending Verification Queue */}
            {pendingPayments.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                Payment Verification Queue
                            </h2>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                                Reconcile Manual Bank Transfers & Direct Deposits
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {pendingPayments.map((pay) => (
                            <Card key={pay.id} className="bg-white dark:bg-zinc-950 border-amber-500/20 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 flex items-center justify-center font-bold text-amber-600">
                                            {pay.invoice?.student?.firstName?.[0] || 'S'}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-900 dark:text-white uppercase">
                                                {pay.invoice?.student?.firstName} {pay.invoice?.student?.lastName}
                                            </div>
                                            <div className="text-[9px] text-zinc-500 font-mono">
                                                {pay.invoice?.student?.studentCode} • Ref: {pay.reference || 'NO_REF'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-[8px] font-mono text-zinc-400 uppercase">Amount</div>
                                            <div className="text-base font-black text-zinc-900 dark:text-white">
                                                ${parseFloat(pay.amount).toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handleVerifyPayment(pay.id, 'SUCCESS')}
                                                disabled={verifyingPayment === pay.id}
                                                className="h-9 px-4 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
                                            >
                                                Confirm
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleVerifyPayment(pay.id, 'FAILED')}
                                                disabled={verifyingPayment === pay.id}
                                                className="h-9 px-3 text-red-500 hover:bg-red-500/10 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-red-500/20"
                                            >
                                                Dispute
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Fee Structures Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                            Institutional Fee Structures
                        </h2>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                            Authorized Tuition Matrices by Grade Level
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowFeeModal(true)}
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-xl border-zinc-300 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1 text-eduGreen-500" /> New Structure
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fees.map((fee) => (
                        <Card key={fee.id} className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-2xl p-5 shadow-sm hover:border-eduGreen-500/40 transition-all group relative">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-[8px] font-mono font-bold text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest bg-eduGreen-50 dark:bg-eduGreen-950/50 px-2 py-0.5 rounded-md border border-eduGreen-500/20">
                                        {fee.category}
                                    </span>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-tight mt-2.5">
                                        {fee.name}
                                    </h3>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                        {fee.grade ? `Grade ${fee.grade.level} - ${fee.grade.name}` : "All Campus Grades"} • {fee.frequency}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setDeleteId(fee.id)}
                                    className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                                <span className="text-[9px] text-zinc-400 uppercase tracking-widest">Rate</span>
                                <span className="text-lg font-black text-zinc-900 dark:text-white font-mono">
                                    ${parseFloat(fee.amount).toLocaleString()}
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Institutional Invoices Ledger */}
            <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-900">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                            Scholar Invoices Ledger
                        </h2>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                            Automated Billing Ledger & Receipts
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input
                                placeholder="Search scholar..."
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    fetchInvoices(1, statusFilter, e.target.value);
                                }}
                                className="h-10 pl-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-xl text-xs"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={e => {
                                setStatusFilter(e.target.value);
                                fetchInvoices(1, e.target.value, searchQuery);
                            }}
                            className="h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl px-3 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest outline-none"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="PAID">Paid</option>
                            <option value="PENDING">Pending</option>
                            <option value="OVERDUE">Overdue</option>
                        </select>
                    </div>
                </div>

                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                    <th className="p-4">Scholar</th>
                                    <th className="p-4">Grade</th>
                                    <th className="p-4">Term</th>
                                    <th className="p-4">Total Amount</th>
                                    <th className="p-4">Paid Quantum</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-xs">
                                {invoices.map((inv) => {
                                    const total = parseFloat(inv.totalAmount || 0);
                                    const paid = parseFloat(inv.paidAmount || 0);
                                    const isPaid = inv.status === 'PAID' || paid >= total;

                                    return (
                                        <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-zinc-900 dark:text-white uppercase">
                                                    {inv.student?.firstName} {inv.student?.lastName}
                                                </div>
                                                <div className="text-[9px] text-zinc-500 font-mono">
                                                    {inv.student?.studentCode}
                                                </div>
                                            </td>
                                            <td className="p-4 text-zinc-600 dark:text-zinc-400">
                                                {inv.student?.grade?.name || "Grade 12"}
                                            </td>
                                            <td className="p-4 text-zinc-600 dark:text-zinc-400">
                                                {inv.term}
                                            </td>
                                            <td className="p-4 font-mono font-bold text-zinc-900 dark:text-white">
                                                ${total.toLocaleString()}
                                            </td>
                                            <td className="p-4 font-mono font-bold text-eduGreen-600 dark:text-eduGreen-400">
                                                ${paid.toLocaleString()}
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest font-mono",
                                                    isPaid ? "bg-eduGreen-50 dark:bg-eduGreen-950/50 text-eduGreen-600 border border-eduGreen-500/30" : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-500/30"
                                                )}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => triggerPrint(inv, inv.student)}
                                                    className="h-8 px-2.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-eduGreen-500 text-[10px] font-bold uppercase tracking-widest"
                                                >
                                                    <Printer className="w-3.5 h-3.5 mr-1" /> Receipt
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Fee Structure Creation Popup Modal */}
            <FeeStructureModal
                isOpen={showFeeModal}
                onClose={() => setShowFeeModal(false)}
                onSuccess={(newFee) => {
                    setFees([newFee, ...fees]);
                    fetchInitialData();
                }}
                grades={grades}
            />

            {/* Dismantle Fee Structure Confirmation */}
            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDeleteFee}
                title="Dismantle Fee Structure"
                description="Are you sure you want to deactivate this fee structure? Existing invoices linked to it will be preserved."
                confirmText="Dismantle Structure"
                variant="danger"
                isLoading={deletingFee}
            />

            {/* Hidden Printable Invoice Element */}
            <div className="hidden">
                <div ref={printRef}>
                    <InvoicePrint
                        invoice={printInvoice}
                        student={printStudent}
                        school={school}
                    />
                </div>
            </div>
        </div>
    );
}
