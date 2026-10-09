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
    ShieldCheck,
    Coins,
    Users,
    Receipt,
    Sparkles,
    CheckCircle2,
    Layers,
    Clock,
    FileText,
    Building2,
    Smartphone,
    Copy,
    Check,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { FeeStructureModal } from "./fee-structure-modal";
import { BankingAccountsModal, BankingAccount } from "./banking-accounts-modal";
import { getClientCache, setClientCache, fetchWithResilience } from "@/lib/cache-client";

interface FinanceViewProps {
    user: any;
    school: any;
    grades: any[];
}

export function FinanceView({ user, school, grades }: FinanceViewProps) {
    const cachedFees = typeof window !== 'undefined' ? getClientCache<any[]>('finance_fees_list') : null;
    const cachedAnalytics = typeof window !== 'undefined' ? getClientCache<any>('finance_analytics') : null;

    const [fees, setFees] = useState<any[]>(cachedFees || []);
    const [loading, setLoading] = useState(!cachedFees);
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [showBankingModal, setShowBankingModal] = useState(false);
    const [bankingAccounts, setBankingAccounts] = useState<BankingAccount[]>(
        Array.isArray(school?.bankingConfig) ? school.bankingConfig : []
    );
    const [copiedAccId, setCopiedAccId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deletingFee, setDeletingFee] = useState(false);
    const [financialAnalytics, setFinancialAnalytics] = useState<any>(cachedAnalytics || null);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [gradeFilter, setGradeFilter] = useState("ALL");

    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [feesRes, analyticsRes, bankingRes] = await Promise.all([
                fetchWithResilience('/api/school/finance/fees', {}, 8000),
                fetchWithResilience('/api/school/finance/analytics', {}, 8000),
                fetchWithResilience('/api/school/finance/banking', {}, 8000).catch(() => ({ ok: false }))
            ]);

            if (feesRes.ok) {
                const data: any = await feesRes.json();
                const feeList = Array.isArray(data) ? data : (data.fees || []);
                setFees(feeList);
                setClientCache('finance_fees_list', feeList, 60000);
            }

            if (analyticsRes.ok) {
                const data = await analyticsRes.json();
                setFinancialAnalytics(data);
                setClientCache('finance_analytics', data, 60000);
            }

            if ('json' in bankingRes && bankingRes.ok) {
                const bData: any = await bankingRes.json();
                if (Array.isArray(bData.accounts)) {
                    setBankingAccounts(bData.accounts);
                }
            }
        } catch (e) {
            console.error("[FinanceView] Fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncInvoices = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/school/finance/sync', { method: 'POST' });
            const data: any = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || "Synced fee structures to student invoices successfully.");
                fetchInitialData();
            } else {
                toast.error(data.message || "Failed to sync fee structures.");
            }
        } catch (e) {
            toast.error("Connection interrupted during sync.");
        } finally {
            setSyncing(false);
        }
    };

    const handleDeleteFee = (id: string) => {
        setDeleteId(id);
    };

    const executeDeleteFee = async () => {
        if (!deleteId) return;
        setDeletingFee(true);
        try {
            const res = await fetch(`/api/school/finance/fees/${deleteId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success("Fee structure decommissioned.");
                setFees(prev => prev.filter(f => f.id !== deleteId));
                setDeleteId(null);
            } else {
                toast.error("Failed to delete fee structure.");
            }
        } catch (e) {
            toast.error("Connection failure.");
        } finally {
            setDeletingFee(false);
        }
    };

    const handleFeeCreated = (newFee: any) => {
        setFees(prev => [newFee, ...prev]);
        setShowFeeModal(false);
        fetchInitialData();
    };

    const filteredFees = fees.filter(fee => {
        const matchesSearch = fee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            fee.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "ALL" || fee.category === categoryFilter;
        const matchesGrade = gradeFilter === "ALL" || 
            (gradeFilter === "UNIVERSAL" ? !fee.gradeId : fee.gradeId === gradeFilter);
        return matchesSearch && matchesCategory && matchesGrade;
    });

    if (loading && fees.length === 0) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <SpringingLoader message="Synthesizing Institutional Finance Matrix..." />
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-10 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-6 sm:pb-8">
                <div>
                    <div className="flex items-center gap-2.5 sm:gap-3 mb-1">
                        <div className="p-2 sm:p-2.5 bg-eduGreen-500/10 rounded-xl border border-eduGreen-500/20 text-eduGreen-500">
                            <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <h1 className="text-xl sm:text-3xl font-medium text-zinc-900 dark:text-white tracking-tight uppercase">
                            Fee Architecture & <span className="text-eduGreen-500">Financial Hub</span>
                        </h1>
                    </div>
                    <p className="text-[9px] sm:text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest pl-1">
                        Define institutional tuition tiers, manage fee protocols, and access financial portals.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <Button
                        onClick={handleSyncInvoices}
                        disabled={syncing}
                        variant="outline"
                        className="h-10 sm:h-12 px-4 sm:px-5 rounded-xl border-eduGreen-500/30 bg-eduGreen-500/10 hover:bg-eduGreen-500/20 text-eduGreen-600 dark:text-eduGreen-400 font-medium text-[9px] sm:text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Zap className={cn("w-4 h-4 text-eduGreen-500", syncing && "animate-spin")} />
                        {syncing ? "Syncing Ledgers..." : "Sync Billing Ledgers"}
                    </Button>
                    <Link href="/dashboard/revenue">
                        <Button
                            variant="outline"
                            className="h-10 sm:h-12 px-4 sm:px-5 rounded-xl border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500/50 hover:bg-eduGreen-500/10 text-zinc-900 dark:text-white font-medium text-[9px] sm:text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <DollarSign className="w-4 h-4 text-eduGreen-500" />
                            Revenue Hub
                        </Button>
                    </Link>
                    <Link href="/dashboard/payroll">
                        <Button
                            variant="outline"
                            className="h-10 sm:h-12 px-4 sm:px-5 rounded-xl border-zinc-300 dark:border-zinc-800 hover:border-amber-500/50 hover:bg-amber-500/10 text-zinc-900 dark:text-white font-medium text-[9px] sm:text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <Briefcase className="w-4 h-4 text-amber-500" />
                            Staff Payroll
                        </Button>
                    </Link>
                    <Link href="/dashboard/finance/students">
                        <Button
                            variant="outline"
                            className="h-10 sm:h-12 px-4 sm:px-5 rounded-xl border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500/50 hover:bg-eduGreen-500/10 text-zinc-900 dark:text-white font-medium text-[9px] sm:text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <Users className="w-4 h-4 text-eduGreen-500" />
                            Student Dossiers
                        </Button>
                    </Link>
                    <Button
                        onClick={() => setShowBankingModal(true)}
                        variant="outline"
                        className="h-10 sm:h-12 px-4 sm:px-5 rounded-xl border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500/50 hover:bg-eduGreen-500/10 text-zinc-900 dark:text-white font-medium text-[9px] sm:text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Building2 className="w-4 h-4 text-eduGreen-500" />
                        Banking Channels
                        {bankingAccounts.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-eduGreen-500/20 text-eduGreen-600 dark:text-eduGreen-400 text-[8px] font-bold">
                                {bankingAccounts.filter(a => a.isActive).length}
                            </span>
                        )}
                    </Button>
                    <Button
                        onClick={() => setShowFeeModal(true)}
                        className="h-10 sm:h-12 px-4 sm:px-6 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-medium text-[9px] sm:text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-eduGreen-900/20 flex items-center gap-2 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        New Fee Protocol
                    </Button>
                </div>
            </div>

            {/* Financial Health KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-2xl p-4 sm:p-6 shadow-sm border-t-zinc-800/20 group hover:border-eduGreen-900/30 transition-all">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <span className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Active Protocols</span>
                        <Calculator className="w-4 h-4 text-eduGreen-500" />
                    </div>
                    <div className="text-2xl sm:text-4xl font-medium text-zinc-900 dark:text-white tracking-tighter italic">
                        {fees.length}
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-1 sm:mt-2">Configured Fee Tiers</p>
                </Card>

                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-2xl p-4 sm:p-6 shadow-sm border-t-zinc-800/20 group hover:border-eduGreen-900/30 transition-all">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <span className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Total Invoiced</span>
                        <Receipt className="w-4 h-4 text-eduGreen-500" />
                    </div>
                    <div className="text-2xl sm:text-4xl font-medium text-zinc-900 dark:text-white tracking-tighter italic">
                        ${(financialAnalytics?.summary?.totalInvoiced || 0).toLocaleString()}
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-1 sm:mt-2">Generated Invoices</p>
                </Card>

                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-2xl p-4 sm:p-6 shadow-sm border-t-zinc-800/20 group hover:border-eduGreen-900/30 transition-all">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <span className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Collection Rate</span>
                        <CheckCircle2 className="w-4 h-4 text-eduGreen-500" />
                    </div>
                    <div className="text-2xl sm:text-4xl font-medium text-zinc-900 dark:text-white tracking-tighter italic">
                        {financialAnalytics?.summary?.efficiency || "100%"}
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-1 sm:mt-2">Settlement Efficiency</p>
                </Card>

                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-2xl p-4 sm:p-6 shadow-sm border-t-zinc-800/20 group hover:border-amber-900/30 transition-all">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <span className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Pending Liquidity</span>
                        <DollarSign className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl sm:text-4xl font-medium text-zinc-900 dark:text-white tracking-tighter italic">
                        ${(financialAnalytics?.summary?.totalPending || 0).toLocaleString()}
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-1 sm:mt-2">Uncollected Tuition</p>
                </Card>
            </div>

            {/* Dedicated Financial Operation Portals */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                        Dedicated Financial Portals
                    </h2>
                    <span className="text-[9px] font-mono text-zinc-600 uppercase">Independent Modules</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {/* Portal 1: Revenue Hub */}
                    <Card className="bg-gradient-to-br from-white/80 to-white/40 dark:from-zinc-950/80 dark:to-zinc-900/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/60 rounded-2xl p-5 sm:p-6 shadow-md hover:border-eduGreen-500/40 transition-all group flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-eduGreen-500/10 rounded-xl border border-eduGreen-500/20 text-eduGreen-500 group-hover:scale-110 transition-transform">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-eduGreen-500/10 text-eduGreen-500 text-[8px] font-medium uppercase tracking-widest border border-eduGreen-500/20">
                                    Billing & Ledgers
                                </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-medium text-zinc-900 dark:text-white uppercase tracking-tight mb-1.5 group-hover:text-eduGreen-500 transition-colors">
                                Revenue & Invoices Hub
                            </h3>
                            <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal mb-6">
                                Run billing cycles, inspect the institutional ledger, verify manual payments, and print formal invoices.
                            </p>
                        </div>
                        <Link href="/dashboard/revenue" className="w-full">
                            <Button className="w-full h-10 bg-zinc-900 dark:bg-zinc-800 hover:bg-eduGreen-600 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn">
                                Open Revenue Hub
                                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </Card>

                    {/* Portal 2: Staff Payroll */}
                    <Card className="bg-gradient-to-br from-white/80 to-white/40 dark:from-zinc-950/80 dark:to-zinc-900/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/60 rounded-2xl p-5 sm:p-6 shadow-md hover:border-amber-500/40 transition-all group flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500 group-hover:scale-110 transition-transform">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[8px] font-medium uppercase tracking-widest border border-amber-500/20">
                                    Staff Compensation
                                </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-medium text-zinc-900 dark:text-white uppercase tracking-tight mb-1.5 group-hover:text-amber-500 transition-colors">
                                Staff Payroll Center
                            </h3>
                            <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal mb-6">
                                Disburse monthly educator and staff compensation, track payout history, and export payroll slips.
                            </p>
                        </div>
                        <Link href="/dashboard/payroll" className="w-full">
                            <Button className="w-full h-10 bg-zinc-900 dark:bg-zinc-800 hover:bg-amber-600 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn">
                                Open Payroll Center
                                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </Card>

                    {/* Portal 3: Student Billing Dossiers */}
                    <Card className="bg-gradient-to-br from-white/80 to-white/40 dark:from-zinc-950/80 dark:to-zinc-900/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/60 rounded-2xl p-5 sm:p-6 shadow-md hover:border-eduGreen-500/40 transition-all group flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-eduGreen-500/10 rounded-xl border border-eduGreen-500/20 text-eduGreen-500 group-hover:scale-110 transition-transform">
                                    <Users className="w-5 h-5" />
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-eduGreen-500/10 text-eduGreen-500 text-[8px] font-medium uppercase tracking-widest border border-eduGreen-500/20">
                                    Student Accounts
                                </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-medium text-zinc-900 dark:text-white uppercase tracking-tight mb-1.5 group-hover:text-eduGreen-500 transition-colors">
                                Student Dossiers
                            </h3>
                            <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal mb-6">
                                Individual scholar financial profiles, parent payment links, receipt proof uploads, and balance statements.
                            </p>
                        </div>
                        <Link href="/dashboard/finance/students" className="w-full">
                            <Button className="w-full h-10 bg-zinc-900 dark:bg-zinc-800 hover:bg-eduGreen-600 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn">
                                Inspect Student Ledgers
                                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </Card>

                    {/* Portal 4: Banking & Settlement Channels */}
                    <Card className="bg-gradient-to-br from-white/80 to-white/40 dark:from-zinc-950/80 dark:to-zinc-900/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/60 rounded-2xl p-5 sm:p-6 shadow-md hover:border-eduGreen-500/40 transition-all group flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-eduGreen-500/10 rounded-xl border border-eduGreen-500/20 text-eduGreen-500 group-hover:scale-110 transition-transform">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <span className={cn(
                                    "px-2.5 py-1 rounded-full text-[8px] font-medium uppercase tracking-widest border",
                                    bankingAccounts.filter(a => a.isActive).length > 0
                                        ? "bg-eduGreen-500/10 text-eduGreen-600 dark:text-eduGreen-400 border-eduGreen-500/20"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                )}>
                                    {bankingAccounts.filter(a => a.isActive).length > 0 ? `${bankingAccounts.filter(a => a.isActive).length} Rails Active` : "Setup Required"}
                                </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-medium text-zinc-900 dark:text-white uppercase tracking-tight mb-1.5 group-hover:text-eduGreen-500 transition-colors">
                                Institutional Bank Accounts
                            </h3>
                            <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal mb-6">
                                Configure verified school accounts (CBE, Telebirr) for parent tuition settlements.
                            </p>
                        </div>
                        <Button 
                            onClick={() => setShowBankingModal(true)}
                            className="w-full h-10 bg-zinc-900 dark:bg-zinc-800 hover:bg-eduGreen-600 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn"
                        >
                            Configure Banking Rails
                            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                    </Card>
                </div>

                {/* Institutional Settlement Accounts Ribbon */}
                <div className="p-6 rounded-3xl bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-900/60 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-eduGreen-500/10 rounded-xl border border-eduGreen-500/20 text-eduGreen-500">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white uppercase tracking-tight">
                                    Official Institutional Settlement Channels
                                </h3>
                                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                                    Accounts presented to parents when settling tuition invoices
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowBankingModal(true)}
                            size="sm"
                            className="h-9 px-4 rounded-xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white text-[10px] font-bold uppercase tracking-widest self-start sm:self-auto shadow-md shadow-eduGreen-900/20"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Manage Accounts
                        </Button>
                    </div>

                    {bankingAccounts.filter(a => a.isActive).length === 0 ? (
                        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                <div>
                                    <p className="font-semibold text-zinc-900 dark:text-white text-[11px] uppercase tracking-wider">
                                        No Banking Channels Configured Yet
                                    </p>
                                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                                        Parents currently see a notice to settle at the campus finance office. Add your official CBE, Telebirr, or bank account so families can pay online.
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setShowBankingModal(true)}
                                className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-[9px] font-bold uppercase tracking-wider shrink-0"
                            >
                                Setup Now
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {bankingAccounts.filter(a => a.isActive).map((acc) => (
                                <div
                                    key={acc.id}
                                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-1.5 text-xs relative group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-[10px] uppercase tracking-wider text-eduGreen-600 dark:text-eduGreen-400 flex items-center gap-1.5">
                                            {acc.type === "MOBILE_MONEY" ? <Smartphone className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                                            {acc.provider}
                                        </span>
                                        {acc.isPrimary && (
                                            <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-eduGreen-100 dark:bg-eduGreen-950/60 text-eduGreen-700 dark:text-eduGreen-400 border border-eduGreen-300 dark:border-eduGreen-800/40">
                                                Primary
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] font-mono text-zinc-900 dark:text-white flex items-center justify-between">
                                        <span className="select-all font-bold">{acc.accountNumber}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(acc.accountNumber);
                                                setCopiedAccId(acc.id);
                                                setTimeout(() => setCopiedAccId(null), 2000);
                                                toast.success("Account copied");
                                            }}
                                            className="text-zinc-600 hover:text-eduGreen-500 transition-colors p-1"
                                            title="Copy Account Number"
                                        >
                                            {copiedAccId === acc.id ? <Check className="w-3 h-3 text-eduGreen-500" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate">
                                        Holder: <strong className="text-zinc-800 dark:text-zinc-200">{acc.accountName}</strong>
                                    </div>
                                    {acc.instructions && (
                                        <p className="text-[9px] text-zinc-600 dark:text-zinc-500 truncate italic">
                                            {acc.instructions}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Active Fee Structure Protocols Registry */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-zinc-200 dark:border-zinc-900 pt-8">
                    <div>
                        <h2 className="text-base sm:text-2xl font-medium text-zinc-900 dark:text-white tracking-tight uppercase">
                            Fee Structure Protocols
                        </h2>
                        <p className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5">
                            Grade-Scoped Tuition & Auxiliary Billing Templates
                        </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                            <Input
                                placeholder="Search Protocol..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-9 sm:h-11 w-full sm:w-56 pl-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-xl text-[10px] sm:text-xs"
                            />
                        </div>

                        <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="h-9 sm:h-11 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl px-3 text-[9px] sm:text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest outline-none hover:border-zinc-800 transition-all cursor-pointer"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="TUITION">Tuition</option>
                            <option value="REGISTRATION">Registration</option>
                            <option value="FACILITY">Facility</option>
                            <option value="TRANSPORT">Transport</option>
                            <option value="EXAMINATION">Exam</option>
                            <option value="OTHER">Other</option>
                        </select>

                        <select
                            value={gradeFilter}
                            onChange={e => setGradeFilter(e.target.value)}
                            className="h-9 sm:h-11 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl px-3 text-[9px] sm:text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest outline-none hover:border-zinc-800 transition-all cursor-pointer"
                        >
                            <option value="ALL">All Grades</option>
                            <option value="UNIVERSAL">Universal (All Grades)</option>
                            {grades.map(g => (
                                <option key={g.id} value={g.id}>Grade {g.level}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {filteredFees.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {filteredFees.map((fee) => (
                            <Card key={fee.id} className="group relative bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-2xl overflow-hidden hover:border-eduGreen-500/40 transition-all shadow-sm flex flex-col justify-between">
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-eduGreen-600 via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <CardHeader className="p-5 pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-eduGreen-500 group-hover:border-eduGreen-500/30 transition-all">
                                            <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl sm:text-2xl font-medium text-zinc-900 dark:text-white tracking-tighter">
                                                ${parseFloat(fee.amount).toLocaleString()}
                                            </div>
                                            <div className="text-[8px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5">
                                                {fee.frequency}
                                            </div>
                                        </div>
                                    </div>

                                    <CardTitle className="text-base font-medium text-zinc-900 dark:text-white mt-4 tracking-tight group-hover:text-eduGreen-500 transition-colors line-clamp-1">
                                        {fee.name}
                                    </CardTitle>

                                    {fee.description && (
                                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                                            {fee.description}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        <span className="text-[8px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
                                            {fee.category}
                                        </span>
                                        <span className="text-[8px] font-medium text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest px-2 py-0.5 bg-eduGreen-500/10 rounded-md border border-eduGreen-500/20">
                                            {fee.grade ? `Grade ${fee.grade.level}` : "Universal Tier"}
                                        </span>
                                    </div>
                                </CardHeader>

                                <CardFooter className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-900/60 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
                                    <span className="text-[8px] font-mono text-zinc-600">
                                        #{fee.id.slice(0, 8)}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteFee(fee.id)}
                                        className="h-8 px-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all font-medium text-[8px] uppercase tracking-widest gap-1.5"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Decommission
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-white/20 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-900 rounded-3xl p-8">
                        <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-200 dark:border-zinc-800 text-zinc-600">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white uppercase tracking-wider mb-1">
                            No Fee Protocols Configured
                        </h3>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto mb-6">
                            Create your first fee structure to define tuition rates, lab fees, and registration costs for each grade.
                        </p>
                        <Button
                            onClick={() => setShowFeeModal(true)}
                            className="h-10 px-6 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest shadow-lg shadow-eduGreen-900/20"
                        >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Establish Fee Structure
                        </Button>
                    </div>
                )}
            </div>

            {/* Fee Structure Modal Popup */}
            <FeeStructureModal
                isOpen={showFeeModal}
                onClose={() => setShowFeeModal(false)}
                onSuccess={handleFeeCreated}
                grades={grades}
            />

            {/* Institutional Banking Channels Modal */}
            <BankingAccountsModal
                isOpen={showBankingModal}
                onClose={() => setShowBankingModal(false)}
                initialAccounts={bankingAccounts}
                onSuccess={(updated) => setBankingAccounts(updated)}
                schoolName={school?.name}
            />

            {/* Delete Fee Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={executeDeleteFee}
                isLoading={deletingFee}
                title="Decommission Fee Structure"
                description="This action will permanently remove this fee structure. Existing past invoices will retain their historical records."
                confirmText="Decommission"
                variant="danger"
            />
        </div>
    );
}
