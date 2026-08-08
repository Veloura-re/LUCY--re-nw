"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    CreditCard,
    Plus,
    DollarSign,
    Calculator,
    Briefcase,
    Search,
    Printer,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    Download,
    Coins,
    Loader2,
    RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { FeeStructureModal } from "@/components/dashboard/fee-structure-modal";
import { InvoicePrint } from "./invoice-print";
import { useReactToPrint } from "react-to-print";
import { format } from "date-fns";
import SpringingLoader from "@/components/dashboard/springing-loader";

interface RevenueViewProps {
    user: any;
    school: any;
    grades: any[];
}

export function RevenueView({ user, school, grades }: RevenueViewProps) {
    const [fees, setFees] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [financialAnalytics, setFinancialAnalytics] = useState<any>(null);
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [generatingInvoices, setGeneratingInvoices] = useState(false);

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
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [printInvoice, setPrintInvoice] = useState<any>(null);
    const [printStudent, setPrintStudent] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Institutional_Invoice_${printInvoice?.id?.slice(0, 8) || 'Receipt'}`,
        onAfterPrint: () => {
            setPrintingId(null);
        }
    });

    const triggerPrint = (inv: any, student: any) => {
        const targetStudent = student || inv.student || {
            firstName: "Enrolled",
            lastName: "Scholar",
            studentCode: "N/A"
        };
        setPrintInvoice(inv);
        setPrintStudent(targetStudent);
        setPrintingId(inv.id);
    };

    useEffect(() => {
        if (printingId && printInvoice && printRef.current) {
            const timer = setTimeout(() => {
                try {
                    if (typeof handlePrint === 'function') {
                        handlePrint();
                    } else {
                        window.print();
                    }
                } catch (err) {
                    console.error("Print invocation fallback:", err);
                    window.print();
                } finally {
                    setTimeout(() => setPrintingId(null), 1000);
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [printingId, printInvoice, handlePrint]);

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
        setLoadingInvoices(true);
        try {
            const params = new URLSearchParams({
                page: targetPage.toString(),
                limit: limit.toString(),
                status,
                search: query
            });
            const res = await fetch(`/api/school/finance/invoices?${params.toString()}`);
            const data = await res.json();
            if (data.invoices) {
                setInvoices(data.invoices);
                setTotalPages(data.totalPages || 1);
            }
        } catch (e) {
            console.error("Failed to load invoices", e);
        } finally {
            setLoadingInvoices(false);
        }
    };

    const handleDeleteFee = async () => {
        if (!deleteId) return;
        setDeletingFee(true);
        try {
            const res = await fetch(`/api/school/finance/fees/${deleteId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success("Fee structure decommissioned.");
                setFees(fees.filter(f => f.id !== deleteId));
                setDeleteId(null);
            } else {
                toast.error("Failed to dismantle fee structure.");
            }
        } catch (e) {
            toast.error("Network communication failure.");
        } finally {
            setDeletingFee(false);
        }
    };

    const handleGenerateInvoices = async () => {
        setGeneratingInvoices(true);
        try {
            const res = await fetch('/api/school/finance/invoices/generate', {
                method: 'POST'
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Generated ${data.generatedCount || 0} invoices successfully.`);
                fetchInvoices(1, statusFilter, searchQuery);
                fetchInitialData();
            } else {
                toast.error(data.error || "Failed to generate invoices.");
            }
        } catch (e) {
            toast.error("Invoice run execution failure.");
        } finally {
            setGeneratingInvoices(false);
        }
    };

    const handleVerifyPayment = async (paymentId: string) => {
        setVerifyingPayment(paymentId);
        try {
            const res = await fetch('/api/school/finance/pay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId, action: 'APPROVE' })
            });

            if (res.ok) {
                toast.success("Payment transaction verified & reconciled.");
                setPendingPayments(pendingPayments.filter(p => p.id !== paymentId));
                fetchInitialData();
                fetchInvoices(page, statusFilter, searchQuery);
            } else {
                toast.error("Failed to verify transaction.");
            }
        } catch (e) {
            toast.error("Verification processing failed.");
        } finally {
            setVerifyingPayment(null);
        }
    };

    if (loading && fees.length === 0 && invoices.length === 0) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <SpringingLoader message="Initializing Institutional Revenue Hub..." />
            </div>
        );
    }

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
                                Invoices, Payment Settlement Verification & Ledger Auditing
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
                    <Link href="/dashboard/payroll">
                        <Button variant="outline" className="h-10 sm:h-11 px-4 rounded-xl border-zinc-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest hover:border-amber-500/50">
                            <Briefcase className="w-4 h-4 mr-2 text-amber-500" /> Staff Payroll
                        </Button>
                    </Link>
                    <Button
                        onClick={handleGenerateInvoices}
                        disabled={generatingInvoices}
                        className="h-10 sm:h-11 px-4 sm:px-5 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md shadow-eduGreen-900/20 active:scale-95 transition-all"
                    >
                        {generatingInvoices ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating Invoices...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                Run Billing Cycle
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Top Revenue Analytics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 p-5 rounded-2xl shadow-sm">
                    <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        Total Invoiced
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                        ${(financialAnalytics?.summary?.totalInvoiced || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-eduGreen-500" /> Total tuition quantum
                    </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-eduGreen-500/30 p-5 rounded-2xl shadow-sm bg-gradient-to-br from-eduGreen-950/10 to-transparent">
                    <div className="text-[9px] font-mono font-bold text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest mb-1">
                        Settled & Verified Revenue
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-eduGreen-600 dark:text-eduGreen-400 tracking-tight">
                        ${(financialAnalytics?.summary?.totalPaid || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2">
                        {financialAnalytics?.summary?.efficiency || "100%"} Efficiency Rate
                    </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-amber-500/30 p-5 rounded-2xl shadow-sm bg-gradient-to-br from-amber-950/10 to-transparent">
                    <div className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">
                        Pending Verification
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                        ${(financialAnalytics?.summary?.totalPending || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2">
                        {pendingPayments.length} Proofs awaiting approval
                    </div>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 p-5 rounded-2xl shadow-sm">
                    <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        Configured Structures
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                        {fees.length}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-zinc-400" /> Active Fee Protocols
                    </div>
                </Card>
            </div>

            {/* Pending Proofs Verification Queue */}
            {pendingPayments.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                        <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                            Pending Payment Receipts Verification ({pendingPayments.length})
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingPayments.map((pay) => (
                            <Card key={pay.id} className="bg-white dark:bg-zinc-950 border-amber-500/40 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-xs font-bold text-zinc-900 dark:text-white uppercase">
                                                {pay.student?.firstName} {pay.student?.lastName}
                                            </div>
                                            <div className="text-[9px] text-zinc-500 font-mono">
                                                ID: {pay.student?.studentCode} • Grade {pay.student?.grade?.name || "12"}
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-md text-[8px] font-mono font-bold uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-500/30">
                                            {pay.method || "TRANSFER"}
                                        </span>
                                    </div>

                                    <div className="text-lg font-black text-zinc-900 dark:text-white font-mono">
                                        ${Number(pay.amount || 0).toLocaleString()}
                                    </div>

                                    {pay.reference && (
                                        <div className="text-[9px] font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 break-all">
                                            Ref: {pay.reference}
                                        </div>
                                    )}

                                    {pay.receiptUrl && (
                                        <a
                                            href={pay.receiptUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center text-[10px] text-eduGreen-600 dark:text-eduGreen-400 font-bold uppercase hover:underline mt-1"
                                        >
                                            <Download className="w-3.5 h-3.5 mr-1" /> View Bank Slip / Proof
                                        </a>
                                    )}
                                </div>

                                <div className="pt-4 mt-3 border-t border-zinc-100 dark:border-zinc-900 flex gap-2">
                                    <Button
                                        size="sm"
                                        disabled={verifyingPayment === pay.id}
                                        onClick={() => handleVerifyPayment(pay.id)}
                                        className="w-full bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest h-8"
                                    >
                                        {verifyingPayment === pay.id ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Verify & Reconcile
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Invoices Ledger Table */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                            Institutional Invoices Ledger
                        </h2>
                        {loadingInvoices && (
                            <Loader2 className="w-3.5 h-3.5 text-eduGreen-500 animate-spin" />
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="relative min-w-[200px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <Input
                                placeholder="Search scholar / student code..."
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
                            className="h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl px-3 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest outline-none cursor-pointer"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="PAID">Paid</option>
                            <option value="PENDING">Pending</option>
                            <option value="OVERDUE">Overdue</option>
                        </select>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchInvoices(page, statusFilter, searchQuery)}
                            className="h-10 px-3 rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            title="Refresh Invoices"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", loadingInvoices && "animate-spin")} />
                        </Button>
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
                                {loadingInvoices ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="p-4">
                                                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-1" />
                                                <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-20" />
                                            </td>
                                            <td className="p-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16" /></td>
                                            <td className="p-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20" /></td>
                                            <td className="p-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16" /></td>
                                            <td className="p-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16" /></td>
                                            <td className="p-4"><div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-16" /></td>
                                            <td className="p-4 text-right"><div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-20 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-2 text-zinc-400">
                                                <CreditCard className="w-8 h-8 stroke-[1.5] text-zinc-400" />
                                                <p className="text-xs font-bold uppercase tracking-widest">No Invoices Found</p>
                                                <p className="text-[10px] text-zinc-500">Run a billing cycle or refine your search filters.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv) => {
                                        const total = parseFloat(inv.totalAmount || inv.amount || 0);
                                        const paid = parseFloat(inv.paidAmount || 0);
                                        const isPaid = inv.status === 'PAID' || paid >= total;
                                        const isPrintingThis = printingId === inv.id;

                                        return (
                                            <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-zinc-900 dark:text-white uppercase">
                                                        {inv.student?.firstName} {inv.student?.lastName}
                                                    </div>
                                                    <div className="text-[9px] text-zinc-500 font-mono">
                                                        {inv.student?.studentCode || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-zinc-600 dark:text-zinc-400">
                                                    {inv.student?.grade?.name || "Universal Tier"}
                                                </td>
                                                <td className="p-4 text-zinc-600 dark:text-zinc-400">
                                                    {inv.term || "Current Term"}
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
                                                        isPaid
                                                            ? "bg-eduGreen-50 dark:bg-eduGreen-950/50 text-eduGreen-600 border border-eduGreen-500/30"
                                                            : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-500/30"
                                                    )}>
                                                        {inv.status || (isPaid ? "PAID" : "PENDING")}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={isPrintingThis}
                                                        onClick={() => triggerPrint(inv, inv.student)}
                                                        className="h-8 px-2.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-eduGreen-500 text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all"
                                                    >
                                                        {isPrintingThis ? (
                                                            <>
                                                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-eduGreen-500" />
                                                                Generating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Printer className="w-3.5 h-3.5 mr-1" /> Receipt
                                                            </>
                                                        )}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
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

            {/* Hidden Printable Invoice Element with proper print visibility */}
            <div className="fixed -left-[99999px] top-0 opacity-0 pointer-events-none print:opacity-100 print:static print:left-0 print:pointer-events-auto" aria-hidden="true">
                <div ref={printRef}>
                    {printInvoice && (
                        <InvoicePrint
                            invoice={printInvoice}
                            student={printStudent || printInvoice.student}
                            school={school}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
