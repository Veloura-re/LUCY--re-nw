"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    CreditCard,
    Plus,
    Trash2,
    DollarSign,
    Calculator,
    Briefcase,
    Settings2,
    ArrowRight,
    Search,
    Filter,
    Zap,
    CalendarDays,
    ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { toast } from "sonner";
import { ConfirmationModal, InputModal, PaymentModal } from "@/components/ui/confirmation-modal";
import { useReactToPrint } from "react-to-print";
import { InvoicePrint } from "./invoice-print";
import { format } from "date-fns";
import { Printer, ChevronDown, Wallet, Users, ArrowUpCircle } from "lucide-react";
import { PayrollDashboard } from "./payroll-dashboard";

interface FinanceViewProps {
    user: any;
    school: any;
    grades: any[];
}

export function FinanceView({ user, school, grades }: FinanceViewProps) {
    const [fees, setFees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [financialAnalytics, setFinancialAnalytics] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [activeTab, setActiveTab] = useState<"REVENUE" | "EXPENSES">("REVENUE");
    
    // Pagination state for invoices
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;
    const [staff, setStaff] = useState<any[]>([]);
    const [payrollHistory, setPayrollHistory] = useState<any[]>([]);
    const [isPaying, setIsPaying] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        amount: "",
        category: "TUITION",
        frequency: "TERM",
        gradeId: "ALL",
        description: ""
    });

    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [printInvoice, setPrintInvoice] = useState<any>(null);
    const [printStudent, setPrintStudent] = useState<any>(null);

    const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null);
    const [creatingFee, setCreatingFee] = useState(false);
    const [deletingFee, setDeletingFee] = useState(false);
    const [simulatingPay, setSimulatingPay] = useState<string | null>(null);

    const [paymentContext, setPaymentContext] = useState<{
        isOpen: boolean;
        type: 'PAYROLL' | 'INVOICE';
        memberId?: string;
        invoiceId?: string;
        title: string;
        description: string;
        defaultAmount?: string;
    }>({
        isOpen: false,
        type: 'PAYROLL',
        title: "",
        description: ""
    });

    const printRef = React.useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
    });

    const triggerPrint = (invoice: any) => {
        setPrintInvoice(invoice);
        setPrintStudent(invoice.student);
        setTimeout(() => handlePrint(), 100);
    };


    useEffect(() => {
        fetchFees();
        fetchFinancialAnalytics();
        fetchPendingPayments();
        fetchStaff();
        fetchPayrollHistory();
    }, []);

    useEffect(() => {
        fetchInvoices();
    }, [page, searchQuery, statusFilter]);

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/school/teachers');
            const data = await res.json();
            setStaff((data as any).teachers || []);
        } catch (e) { console.error(e); }
    };

    const fetchPayrollHistory = async () => {
        try {
            const res = await fetch('/api/director/payroll');
            const data = await res.json();
            setPayrollHistory(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            setPayrollHistory([]);
        }
    };

    const handleIssuePayment = async (staffId: string) => {
        const member = staff.find(s => s.id === staffId);
        const lastPay = payrollHistory.find(p => p.userId === staffId);

        setPaymentContext({
            isOpen: true,
            type: 'PAYROLL',
            memberId: staffId,
            title: `Issue Payroll: ${member?.name || 'Personnel'}`,
            description: "Authorize institutional resource disbursement for this personnel node.",
            defaultAmount: lastPay?.amount?.toString() || ""
        });
    };

    const processPayrollPayment = async (data: { amount: number; method: string; note: string }) => {
        if (!paymentContext.memberId) return;

        setIsPaying(paymentContext.memberId);
        try {
            const res = await fetch('/api/director/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: paymentContext.memberId,
                    amount: data.amount,
                    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    periodEnd: new Date(),
                    method: data.method,
                    note: data.note
                })
            });
            if (res.ok) {
                toast.success("Payment Dispatched");
                fetchPayrollHistory();
                setPaymentContext(prev => ({ ...prev, isOpen: false }));
            } else {
                const errorData: any = await res.json().catch(() => ({}));
                toast.error(`Failed: ${errorData.error || res.statusText}`);
            }
        } catch (e: any) {
            toast.error(e.message || "Uplink Failure");
        } finally {
            setIsPaying(null);
        }
    };

    const handleRecordManualPayment = (invoice: any) => {
        setPaymentContext({
            isOpen: true,
            type: 'INVOICE',
            invoiceId: invoice.id,
            title: `Settle Invoice: ${invoice.student.firstName}`,
            description: `Manually record fulfillment for Invoice #${invoice.id.slice(0, 8)}`,
            defaultAmount: invoice.amount.toString()
        });
    };

    const processInvoicePayment = async (data: { amount: number; method: string; note: string }) => {
        if (!paymentContext.invoiceId) return;

        setSimulatingPay(paymentContext.invoiceId);
        try {
            const res = await fetch('/api/school/finance/webhooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: paymentContext.invoiceId,
                    status: 'SUCCESS',
                    transactionReference: `MANUAL_${data.method}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
                    amount: data.amount,
                    note: data.note
                })
            });
            if (res.ok) {
                toast.success("Settlement Recorded");
                fetchInvoices();
                fetchFinancialAnalytics();
                setPaymentContext(prev => ({ ...prev, isOpen: false }));
            } else {
                toast.error(`Failed to process payment: ${res.statusText}`);
            }
        } catch (e) {
            toast.error("Internal sync error");
        } finally {
            setSimulatingPay(null);
        }
    };

    const fetchPendingPayments = async () => {
        try {
            const res = await fetch('/api/school/finance/pay/pending'); // I need to create this API
            if (res.ok) {
                const data = await res.json();
                setPendingPayments(data as any);
            }
        } catch (e) {
            console.error("Failed to fetch pending verifications");
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
                toast.success(status === 'SUCCESS' ? "Payment Verified" : "Payment Rejected");
                fetchPendingPayments();
                fetchInvoices();
                fetchFinancialAnalytics();
            } else {
                toast.error(`Verification Failed: ${await res.text()}`);
            }
        } catch (e: any) {
            toast.error(e.message || "System error");
        } finally {
            setVerifyingPayment(null);
        }
    };

    const fetchInvoices = async () => {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                status: statusFilter,
                ...(searchQuery && { search: searchQuery })
            });
            const res = await fetch(`/api/school/finance/invoices?${params.toString()}`);
            const data = await res.json() as any;
            if (data.invoices) {
                setInvoices(data.invoices);
                if (data.pagination) setTotalPages(data.pagination.totalPages || 1);
            } else {
                setInvoices(data as any);
            }
        } catch (e) {
            console.error("Invoice synchronizer failed:", e);
        }
    };

    const fetchFinancialAnalytics = async () => {
        try {
            const res = await fetch('/api/school/finance/analytics');
            const data = await res.json();
            setFinancialAnalytics(data);
        } catch (e) {
            console.error("Finance analytics uplink failed:", e);
        }
    };

    const fetchFees = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/school/finance/fees');
            const data = await res.json();
            setFees(data as any);
        } catch (e) {
            console.error(e);
            toast.error("Failed to synchronize financial data");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFee = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingFee(true);
        try {
            const res = await fetch('/api/school/finance/fees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    gradeId: formData.gradeId === "ALL" ? null : formData.gradeId
                })
            });
            if (!res.ok) throw new Error("Failed to create fee");
            toast.success("Fee structure established");
            setIsCreating(false);
            setFormData({ name: "", amount: "", category: "TUITION", frequency: "TERM", gradeId: "ALL", description: "" });
            fetchFees();
        } catch (e) {
            toast.error("Institutional protocol failure");
        } finally {
            setCreatingFee(false);
        }
    };

    const handleDeleteFee = (id: string) => {
        setDeleteId(id);
    };

    const executeDeleteFee = async () => {
        if (!deleteId) return;
        setDeletingFee(true);
        try {
            const res = await fetch(`/api/school/finance/fees/${deleteId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Structure decommissioned");
            fetchFees();
        } catch (e) {
            toast.error("Failed to delete fee structure");
        } finally {
            setDeletingFee(false);
            setDeleteId(null);
        }
    };

    const handleGenerateInvoices = async (dueDate: string) => {
        setShowInvoiceModal(false);
        setIsGenerating(true);
        try {
            const res = await fetch('/api/school/finance/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dueDate, term: "Term 1 2024" })
            });
            const data = await res.json();
            if (!res.ok) throw new Error((data as any).message || "Failed to generate");
            toast.success((data as any).message);
        } catch (e: any) {
            toast.error(e.message || "Institutional protocol failure");
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <SpringingLoader message="Retrieving Institutional Ledger" />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white uppercase italic">
                        Financial <span className="text-eduGreen-500 not-italic">Nexus</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Autonomous Resource Controller & Billing Terminal</p>
                </div>

                <div className="flex items-center gap-4 mb-1">
                    <Button
                        variant="ghost"
                        onClick={() => setShowInvoiceModal(true)}
                        disabled={isGenerating}
                        className="rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 hover:border-eduGreen-500/30 transition-all h-14 px-6 font-medium text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500 hover:text-white"
                    >
                        <Zap className={cn("mr-2 h-4 w-4 text-amber-500", isGenerating && "animate-pulse")} />
                        {isGenerating ? "Executing Cycle..." : "Launch Invoicing Cycle"}
                    </Button>
                    <Link href="/dashboard/finance/students">
                        <Button
                            variant="ghost"
                            className="rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 hover:border-eduGreen-500/30 transition-all h-14 px-6 font-medium text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500 hover:text-white"
                        >
                            <Users className="mr-2 h-4 w-4 text-eduGreen-500" /> Student Dossiers
                        </Button>
                    </Link>
                    {!isCreating && (
                        <Button
                            onClick={() => setIsCreating(true)}
                            className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-14 px-8 rounded-2xl font-medium text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95 shadow-eduGreen-900/20"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Create Structure
                        </Button>
                    )}
                </div>
            </div>

            {/* Financial Intelligence Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Revenue Trend Graph */}
                <Card className="lg:col-span-8 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] overflow-hidden shadow-2xl border-t-zinc-800/20">
                    <CardHeader className="p-10 pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white uppercase italic">Revenue <span className="text-eduGreen-500 not-italic">Temporal Shift</span></CardTitle>
                                <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.2em] mt-1">12-Month Liquidity Flux</p>
                            </div>
                            <div className="px-3 py-1 bg-eduGreen-500/10 border border-eduGreen-500/20 rounded-lg">
                                <span className="text-[10px] font-medium text-eduGreen-500 uppercase tracking-widest italic">Live Delta</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 pt-8">
                        <RevenueFluxChart data={financialAnalytics?.trends} />
                    </CardContent>
                </Card>

                {/* Efficiency & Liquidity */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] p-8 shadow-2xl border-t-zinc-800/20 group hover:border-eduGreen-900/30 transition-all">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Efficiency Index</span>
                            <Zap className="w-4 h-4 text-eduGreen-500" />
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-5xl font-medium text-zinc-900 dark:text-white tracking-tighter">{financialAnalytics?.summary?.efficiency || 0}%</div>
                                <div className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-eduGreen-500 animate-pulse" />
                                    Collection Yield
                                </div>
                            </div>
                            <div className="h-16 w-16 relative">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-zinc-900 dark:text-white" />
                                    <motion.circle
                                        cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent"
                                        strokeDasharray="175.9"
                                        initial={{ strokeDashoffset: 175.9 }}
                                        animate={{ strokeDashoffset: 175.9 - (Math.min(parseFloat(financialAnalytics?.summary?.efficiency || 0), 100) / 100) * 175.9 }}
                                        transition={{ duration: 1.3, ease: "easeOut" }}
                                        strokeLinecap="round"
                                        className="text-eduGreen-500 drop-shadow-[0_0_8px_rgba(20,184,115,0.4)]"
                                    />
                                </svg>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] p-8 shadow-2xl border-t-zinc-800/20 group hover:border-amber-900/30 transition-all">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Pending Liquidity</span>
                            <DollarSign className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-4xl font-medium text-zinc-900 dark:text-white tracking-tighter italic">
                            ${(financialAnalytics?.summary?.totalPending || 0).toLocaleString()}
                        </div>
                        <p className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest mt-3">Uncollected Institutional Assets</p>
                        <div className="mt-6 h-1 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "60%" }}
                                className="h-full bg-amber-500/50"
                            />
                        </div>
                    </Card>
                </div>
            </div>

            {isCreating && (
                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900 animate-in slide-in-from-top-4 duration-300 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-10 border-b border-zinc-200 dark:border-zinc-900/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-eduGreen-950/20 rounded-xl border border-eduGreen-900/30 text-eduGreen-500">
                                    <Settings2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight">Fee Configuration</CardTitle>
                                    <CardDescription className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 mt-1">Establishing new billing protocol</CardDescription>
                                </div>
                            </div>
                            <Button variant="ghost" onClick={() => setIsCreating(false)} className="text-zinc-600 hover:text-white font-medium text-[10px] uppercase tracking-widest">
                                Cancel
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10">
                        <form onSubmit={handleCreateFee} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Structure Name</label>
                                    <Input
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Annual Tuition Fee"
                                        className="h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-xl focus:border-eduGreen-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Target Grade</label>
                                    <select
                                        value={formData.gradeId}
                                        onChange={e => setFormData({ ...formData, gradeId: e.target.value })}
                                        className="w-full h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 text-zinc-900 dark:text-white font-medium text-sm focus:border-eduGreen-500 outline-none appearance-none"
                                    >
                                        <option value="ALL">Institutional Universal (All Grades)</option>
                                        {grades.map(grade => (
                                            <option key={grade.id} value={grade.id}>Grade {grade.level} - {grade.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Quantum (Amount)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-eduGreen-500" />
                                        <Input
                                            required
                                            type="number"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="0.00"
                                            className="h-14 pl-12 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-xl focus:border-eduGreen-500 transition-all font-medium text-xl text-zinc-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Cycle</label>
                                        <select
                                            value={formData.frequency}
                                            onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                            className="w-full h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 text-zinc-900 dark:text-white font-medium text-sm focus:border-eduGreen-500 outline-none"
                                        >
                                            <option value="TERM">Per Term</option>
                                            <option value="MONTHLY">Monthly</option>
                                            <option value="ANNUAL">Annual</option>
                                            <option value="ONCE">Single Event</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Classification</label>
                                        <select
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 text-zinc-900 dark:text-white font-medium text-sm focus:border-eduGreen-500 outline-none"
                                        >
                                            <option value="TUITION">Tuition</option>
                                            <option value="TRANSPORT">Transport</option>
                                            <option value="SPORTS">Sports</option>
                                            <option value="LIBRARY">Library</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 pt-4">
                                <Button type="submit" disabled={creatingFee} className="w-full h-16 bg-white text-black hover:bg-zinc-200 rounded-2xl font-medium text-sm uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3">
                                    {creatingFee ? (
                                        <><span className="w-5 h-5 border-2 border-zinc-400 border-t-black rounded-full animate-spin" /> Authorizing...</>
                                    ) : (
                                        "Authorize Fee Structure"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Tab Controller */}
            <div className="flex items-center gap-2 p-1 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-900 w-fit mx-auto">
                <button
                    onClick={() => setActiveTab("REVENUE")}
                    className={cn(
                        "px-8 py-3 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all",
                        activeTab === "REVENUE" ? "bg-eduGreen-600 text-white shadow-lg" : "text-zinc-600 dark:text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Revenue Hub
                </button>
                <button
                    onClick={() => setActiveTab("EXPENSES")}
                    className={cn(
                        "px-8 py-3 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all",
                        activeTab === "EXPENSES" ? "bg-amber-600 text-zinc-900 dark:text-white shadow-lg" : "text-zinc-600 dark:text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Expense Nexus (Payroll)
                </button>
            </div>

            {activeTab === "REVENUE" ? (
                <>
                    {/* Verification Nexus */}
                    {pendingPayments.length > 0 && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-900/30 text-amber-500">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight uppercase italic">Verification <span className="text-amber-500 not-italic">Nexus</span></h2>
                                    <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5">Awaiting Institutional Reconciliation</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {pendingPayments.map((pay) => (
                                    <Card key={pay.id} className="bg-white dark:bg-zinc-950 border-amber-900/20 rounded-3xl p-6 hover:border-amber-900/40 transition-all group overflow-hidden relative border-dashed">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-amber-950/20 flex items-center justify-center border border-amber-900/30 font-medium text-amber-500">
                                                    {pay.invoice.student.firstName[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-zinc-900 dark:text-white uppercase tracking-tight">{pay.invoice.student.firstName} {pay.invoice.student.lastName}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">{pay.invoice.student.studentCode}</span>
                                                        <span className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                                                        <span className="text-[10px] font-medium text-amber-500/80 uppercase tracking-widest">{pay.method.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:flex items-center gap-12">
                                                <div>
                                                    <div className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest mb-1">Reference</div>
                                                    <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 font-mono tracking-tighter">{pay.reference || "NO_REF"}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest mb-1">Quantum</div>
                                                    <div className="text-[11px] font-medium text-zinc-900 dark:text-white">${parseFloat(pay.amount).toLocaleString()}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        onClick={() => handleVerifyPayment(pay.id, 'SUCCESS')}
                                                        isLoading={verifyingPayment === pay.id}
                                                        disabled={verifyingPayment === pay.id}
                                                        className="h-10 px-6 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest transition-all shadow-xl shadow-eduGreen-900/20"
                                                    >
                                                        Confirm Settlement
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleVerifyPayment(pay.id, 'FAILED')}
                                                        isLoading={verifyingPayment === pay.id}
                                                        disabled={verifyingPayment === pay.id}
                                                        className="h-10 px-4 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all font-medium text-[9px] uppercase tracking-widest border border-zinc-200 dark:border-zinc-900"
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

                    {/* Institutional Invoice Ledger */}
                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-800">
                                    <Briefcase className="w-5 h-5 text-zinc-900 dark:text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight uppercase">Institutional Ledger</h2>
                                    <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5">Automated Reconciliation Registry</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="relative group/export">
                                    <Button
                                        variant="outline"
                                        className="h-12 px-6 rounded-xl border-eduGreen-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white transition-all font-medium text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-eduGreen-900/20"
                                    >
                                        <Printer className="w-4 h-4 text-eduGreen-500" /> Print Ledger
                                    </Button>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <Input
                                        placeholder="Search Scholar..."
                                        value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                                        className="h-12 w-64 pl-12 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-xl focus:border-eduGreen-500 transition-all font-medium text-xs"
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                                    className="h-12 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl px-4 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest focus:border-eduGreen-500 outline-none hover:border-zinc-800 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="PAID">Confirmed</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="OVERDUE">Overdue</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {invoices.map((inv, i) => (
                                <Card key={inv.id} className="bg-white/20 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-900/50 rounded-3xl p-6 hover:border-zinc-800 transition-all group overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-eduGreen-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-300 dark:border-zinc-800 font-medium text-zinc-600 group-hover:text-eduGreen-500 transition-colors">
                                                {inv.student.firstName[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-zinc-900 dark:text-white uppercase tracking-tight">{inv.student.firstName} {inv.student.lastName}</div>
                                                <div className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5">{inv.student.studentCode}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:flex items-center gap-12">
                                            <div>
                                                <div className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest mb-1">Due Date</div>
                                                <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">{new Date(inv.dueDate).toLocaleDateString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest mb-1">Quantum</div>
                                                <div className="text-[11px] font-medium text-zinc-900 dark:text-white">${parseFloat(inv.amount).toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest mb-1">Status</div>
                                                <div className={cn(
                                                    "text-[9px] font-medium uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border inline-block italic",
                                                    inv.status === 'PAID' ? "bg-eduGreen-500/10 border-eduGreen-500/20 text-eduGreen-500" :
                                                        inv.status === 'OVERDUE' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                                            "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                                )}>
                                                    {inv.status}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => triggerPrint(inv)}
                                                    className="h-10 w-10 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-600 hover:text-eduGreen-500 rounded-xl transition-all"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    isLoading={simulatingPay === inv.id}
                                                    onClick={() => handleRecordManualPayment(inv)}
                                                    className="h-10 px-4 bg-zinc-100 dark:bg-zinc-900 hover:bg-eduGreen-600 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                                                >
                                                    Record Payment
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between bg-white/40 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-900/50 backdrop-blur-md">
                                <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">
                                    Page {page} of {totalPages}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-800 hover:text-white"
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-800 hover:text-white"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {fees.map((fee) => (
                            <Card key={fee.id} className="group relative bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] overflow-hidden hover:border-eduGreen-900/30 transition-all border-t-zinc-800/10 shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-eduGreen-600 via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex justify-between items-start">
                                        <div className="p-3 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-300 dark:border-zinc-800 text-eduGreen-500 group-hover:border-eduGreen-900/30 transition-all">
                                            <Calculator className="w-5 h-5" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-medium text-zinc-900 dark:text-white tracking-tighter">
                                                ${parseFloat(fee.amount).toLocaleString()}
                                            </div>
                                            <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-1">
                                                {fee.frequency} Quantum
                                            </div>
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl font-medium text-zinc-900 dark:text-white mt-6 tracking-tight group-hover:text-eduGreen-500 transition-colors">
                                        {fee.name}
                                    </CardTitle>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest px-2 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-300 dark:border-zinc-800 group-hover:border-eduGreen-900/20 transition-all">
                                            {fee.category}
                                        </span>
                                        <span className="text-[9px] font-medium text-eduGreen-900 uppercase tracking-tighter">
                                            {fee.grade ? `Target: Grade ${fee.grade.level}` : "Universal Directive"}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardFooter className="px-8 pb-8 pt-6 flex justify-between items-center bg-zinc-100/20 dark:bg-zinc-900/20">
                                    <span className="text-[8px] font-medium text-zinc-700 uppercase tracking-widest">
                                        ID: {fee.id.slice(0, 8)}...
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteFee(fee.id)}
                                        className="h-10 px-4 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all font-medium text-[10px] uppercase tracking-widest"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Decommission
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}

                        {fees.length === 0 && !isCreating && (
                            <div className="md:col-span-2 py-32 text-center">
                                <div className="w-20 h-20 bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-900 mx-auto mb-6 opacity-30">
                                    <CreditCard className="w-10 h-10 text-zinc-600 dark:text-zinc-500" />
                                </div>
                                <p className="text-zinc-600 font-medium uppercase tracking-[0.4em] text-xs">No Fee Protocols Active</p>
                                <Button variant="ghost" onClick={() => setIsCreating(true)} className="text-eduGreen-500 mt-4 font-medium uppercase tracking-widest text-[10px]">
                                    Establish Initial Structure
                                </Button>
                            </div>
                        )}
                    </div>

                    <ConfirmationModal
                        isOpen={!!deleteId}
                        onClose={() => setDeleteId(null)}
                        onConfirm={executeDeleteFee}
                        isLoading={deletingFee}
                        title="Decommission Structure"
                        description="This action will permanently remove this fee structure from the institutional ledger. All associated billing records will be archived."
                        confirmText="Decommission"
                        variant="danger"
                    />

                    <InputModal
                        isOpen={showInvoiceModal}
                        onClose={() => setShowInvoiceModal(false)}
                        onConfirm={handleGenerateInvoices}
                        title="Launch Invoicing Cycle"
                        description="Specify the financial period deadline for generated invoices."
                        placeholder="YYYY-MM-DD"
                        defaultValue="2024-01-31"
                        inputType="date"
                        confirmText="Execute Cycle"
                    />

                    {/* Hidden Print Template */}
                    <div className="absolute -left-[9999px] top-0 overflow-hidden" aria-hidden="true">
                        <InvoicePrint
                            ref={printRef}
                            invoice={printInvoice}
                            student={printStudent}
                            school={school}
                        />
                    </div>

                </>
            ) : (
                    <PayrollDashboard 
                        staff={staff} 
                        payrollHistory={payrollHistory} 
                        handleIssuePayment={handleIssuePayment} 
                        isPaying={isPaying} 
                    />
            )}

            <PaymentModal
                isOpen={paymentContext.isOpen}
                onClose={() => setPaymentContext(prev => ({ ...prev, isOpen: false }))}
                onConfirm={paymentContext.type === 'PAYROLL' ? processPayrollPayment : processInvoicePayment}
                title={paymentContext.title}
                description={paymentContext.description}
                defaultAmount={paymentContext.defaultAmount}
                isLoading={!!(isPaying || simulatingPay)}
                confirmText={paymentContext.type === 'PAYROLL' ? "Authorize Disbursement" : "Record Fulfillment"}
            />
        </div>
    );
}

function RevenueFluxChart({ data }: { data: any }) {
    if (!data) return <div className="h-64 flex items-center justify-center text-[10px] font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Initializing Neural Stream...</div>;

    const maxVal = Math.max(...data.datasets[0].data, ...data.datasets[1].data, 1000);

    return (
        <div className="relative h-64 w-full group pt-4">
            <div className="absolute inset-0 flex items-end justify-between gap-4 px-2">
                {data.labels.map((label: string, i: number) => {
                    const revHeight = (data.datasets[0].data[i] / maxVal) * 100;
                    const penHeight = (data.datasets[1].data[i] / maxVal) * 100;

                    return (
                        <div key={i} className="flex-1 flex flex-col justify-end gap-1 group/bar relative">
                            {/* Pending Bar */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${penHeight}%` }}
                                transition={{ duration: 0.8, delay: i * 0.05 }}
                                className="w-full bg-zinc-100/80 dark:bg-zinc-900/80 rounded-t-sm border-x border-t border-zinc-300 dark:border-zinc-800 group-hover/bar:bg-zinc-200 dark:bg-zinc-800 transition-colors"
                            />
                            {/* Revenue Bar */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${revHeight}%` }}
                                transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }}
                                className="w-full bg-gradient-to-t from-eduGreen-600 to-eduGreen-400 rounded-t-sm shadow-[0_0_15px_rgba(20,184,115,0.2)]"
                            />

                            {/* Tooltip on hover */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-black text-[8px] font-medium px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none uppercase tracking-tighter">
                                Rev: ${data.datasets[0].data[i].toLocaleString()}
                            </div>

                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-medium text-zinc-700 uppercase tracking-tighter">
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

