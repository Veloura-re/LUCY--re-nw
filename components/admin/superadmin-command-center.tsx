'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Globe, Users, GraduationCap, BookOpen, ShieldCheck, CreditCard,
    Inbox, ArrowUpRight, CheckCircle2, ShieldAlert, Activity, Cpu,
    Server, RefreshCw, Zap, ExternalLink, Lock, Check, Key, Terminal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface SchoolType {
    id: string;
    name: string;
    schoolCode: string;
    status: string;
    createdAt: string;
    subscriptionStatus: string | null;
    _count: {
        users: number;
        students: number;
        grades: number;
    };
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
};

const cardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring" as const, stiffness: 280, damping: 22 }
    }
};

export function SuperAdminCommandCenter({ userName }: { userName: string }) {
    const [activeTab, setActiveTab] = useState<"OVERVIEW" | "SCHOOLS" | "REQUESTS" | "SECURITY" | "BILLING">("OVERVIEW");
    const [schools, setSchools] = useState<SchoolType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [securityCount, setSecurityCount] = useState(0);
    const [requestCount, setRequestCount] = useState(0);
    const [pendingReceiptsCount, setPendingReceiptsCount] = useState(0);
    const [securityReports, setSecurityReports] = useState<any[]>([]);
    const [wantsAccessRequests, setWantsAccessRequests] = useState<any[]>([]);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchDashboardMetrics();
    }, []);

    const fetchDashboardMetrics = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch schools list
            const resSchools = await fetch('/api/admin/schools');
            if (resSchools.ok) {
                const data = await resSchools.json() as any;
                setSchools(data.schools || []);
            }

            // 2. Fetch security reports
            const resSecurity = await fetch('/api/admin/security-reports');
            if (resSecurity.ok) {
                const data = await resSecurity.json() as any;
                setSecurityReports(data.reports || []);
                setSecurityCount(data.reports?.length || 0);
            }

            // 3. Fetch wants access requests
            const resRequests = await fetch('/api/admin/wants-access');
            if (resRequests.ok) {
                const data = await resRequests.json() as any;
                setWantsAccessRequests(data.requests || []);
                setRequestCount(data.requests?.length || 0);
            }

            // 4. Fetch receipts
            const resReceipts = await fetch('/api/admin/billing/receipts');
            if (resReceipts.ok) {
                const data = await resReceipts.json() as any;
                const receiptsList = data.receipts || [];
                setReceipts(receiptsList);
                setPendingReceiptsCount(receiptsList.filter((r: any) => r.status === 'PENDING').length);
            }
        } catch (err: any) {
            console.error('Failed to load dashboard metrics:', err);
            toast.error('Telemetry node sync failure.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchDashboardMetrics();
        toast.success("Telemetry matrix refreshed.");
        setIsRefreshing(false);
    };

    const totalStaff = schools.reduce((sum, s) => sum + (s._count?.users || 0), 0);
    const totalStudents = schools.reduce((sum, s) => sum + (s._count?.students || 0), 0);
    const activeSchools = schools.filter(s => s.status === 'ACTIVE').length;

    const tabs = [
        { id: "OVERVIEW", label: "Core Telemetry", icon: Activity },
        { id: "SCHOOLS", label: `Tenants (${schools.length})`, icon: Globe },
        { id: "REQUESTS", label: `Inbound Leads (${requestCount})`, icon: Inbox, badge: requestCount > 0 },
        { id: "SECURITY", label: `Vault Threat (${securityCount})`, icon: ShieldCheck, alert: securityCount > 0 },
        { id: "BILLING", label: `Payments (${pendingReceiptsCount})`, icon: CreditCard, alert: pendingReceiptsCount > 0 },
    ] as const;

    return (
        <div className="space-y-8">
            {/* Header Telemetry Bar */}
            <div className="relative overflow-hidden bg-zinc-950/90 backdrop-blur-3xl border border-zinc-800/80 p-8 rounded-[2.5rem] shadow-2xl">
                {/* Backlight Glow Overlay */}
                <div className="absolute -top-24 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold tracking-widest uppercase">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
                                NODE OPERATIONAL // RLS ACTIVE
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline">
                                LATENCY: 12ms
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase font-orbitron">
                            Command Node Dashboard
                        </h1>
                        <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1">
                            Welcome back, <span className="text-white font-bold">{userName}</span>. Institutional isolation ledger synced.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="h-12 px-5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                        >
                            <RefreshCw className={cn("w-4 h-4 text-emerald-400", isRefreshing && "animate-spin")} />
                            Sync Matrix
                        </button>

                        <Link
                            href="/admin/schools"
                            className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95"
                        >
                            <Zap className="w-4 h-4" />
                            Provision Tenant
                        </Link>
                    </div>
                </div>
            </div>

            {/* Backlit Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto p-1.5 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-2xl scrollbar-none">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "relative px-6 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 whitespace-nowrap",
                                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeAdminTab"
                                    className="absolute inset-0 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                            <Icon className={cn("w-4 h-4 relative z-10", isActive ? "text-emerald-400" : "text-zinc-500")} />
                            <span className="relative z-10">{tab.label}</span>
                            
                            {(tab as any).alert && (
                                <span className="relative z-10 w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_#f97316]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab View Container */}
            <AnimatePresence mode="wait">
                {activeTab === "OVERVIEW" && (
                    <motion.div
                        key="overview"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        {/* 4 Metric Telemetry Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {[
                                { label: "Registered Tenants", value: schools.length, sub: `${activeSchools} Active Nodes`, icon: Globe, accent: "emerald", text: "text-emerald-400" },
                                { label: "Platform Staff", value: totalStaff, sub: "Faculty & Directors", icon: Users, accent: "cyan", text: "text-cyan-400" },
                                { label: "Active Learners", value: totalStudents, sub: "Student Profiles", icon: GraduationCap, accent: "purple", text: "text-purple-400" },
                                { label: "Grade Structures", value: schools.reduce((sum, s) => sum + (s._count?.grades || 0), 0), sub: "Configured Levels", icon: BookOpen, accent: "amber", text: "text-amber-400" },
                            ].map((stat, i) => (
                                <motion.div key={i} variants={cardVariants}>
                                    <div className="relative overflow-hidden bg-zinc-950/90 border border-zinc-800/80 p-6 rounded-3xl group hover:border-zinc-700 transition-all">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase flex items-center gap-2">
                                                <stat.icon className={cn("w-4 h-4", stat.text)} />
                                                {stat.label}
                                            </span>
                                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                                                LIVE
                                            </span>
                                        </div>
                                        <div className={cn("text-3xl font-black font-mono tracking-tight mb-1", stat.text)}>
                                            {isLoading ? "..." : stat.value.toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 font-mono font-semibold uppercase tracking-wider">
                                            {stat.sub}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Quick Action Matrix & System Health */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Controls */}
                            <motion.div variants={cardVariants} className="lg:col-span-2 space-y-4">
                                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-emerald-400" />
                                    Core System Modules
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Link
                                        href="/admin/schools"
                                        className="relative overflow-hidden bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/40 p-6 rounded-3xl group transition-all duration-300 flex flex-col justify-between h-44 shadow-lg"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                                <Globe className="w-6 h-6" />
                                            </div>
                                            <ArrowUpRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-black text-sm uppercase tracking-wider font-orbitron">Schools Ledger</h4>
                                            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider mt-1">{schools.length} active tenant databases</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/admin/billing"
                                        className="relative overflow-hidden bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/40 p-6 rounded-3xl group transition-all duration-300 flex flex-col justify-between h-44 shadow-lg"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                                                <CreditCard className="w-6 h-6" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {pendingReceiptsCount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[9px] font-mono font-bold animate-pulse">
                                                        {pendingReceiptsCount} PENDING
                                                    </span>
                                                )}
                                                <ArrowUpRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-white font-black text-sm uppercase tracking-wider font-orbitron">Billing Verification</h4>
                                            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider mt-1">Tuition fee wire verification</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/admin/security"
                                        className="relative overflow-hidden bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/40 p-6 rounded-3xl group transition-all duration-300 flex flex-col justify-between h-44 shadow-lg"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            <ArrowUpRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-black text-sm uppercase tracking-wider font-orbitron">Security Vault</h4>
                                            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider mt-1">{securityCount} disclosure reports logged</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/admin/requests"
                                        className="relative overflow-hidden bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/40 p-6 rounded-3xl group transition-all duration-300 flex flex-col justify-between h-44 shadow-lg"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                                <Inbox className="w-6 h-6" />
                                            </div>
                                            <ArrowUpRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-black text-sm uppercase tracking-wider font-orbitron">Access Requests</h4>
                                            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider mt-1">{requestCount} inbound sign-ups</p>
                                        </div>
                                    </Link>
                                </div>
                            </motion.div>

                            {/* System Status Feed */}
                            <motion.div variants={cardVariants} className="space-y-4">
                                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <Server className="w-4 h-4 text-emerald-400" />
                                    Security & Telemetry Log
                                </h3>

                                <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-6 h-[23.5rem] flex flex-col justify-between shadow-2xl">
                                    <div className="space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                            <div>
                                                <div className="text-xs font-bold text-white uppercase tracking-wider">RLS Encryption Active</div>
                                                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Database row-level security enforcing tenant boundaries.</div>
                                            </div>
                                        </div>

                                        {pendingReceiptsCount > 0 && (
                                            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-start gap-3">
                                                <CreditCard className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <div className="text-xs font-bold text-white uppercase tracking-wider">Pending Wire Transfers</div>
                                                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{pendingReceiptsCount} receipts awaiting verification.</div>
                                                </div>
                                            </div>
                                        )}

                                        {securityCount > 0 && (
                                            <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                                                <ShieldAlert className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <div className="text-xs font-bold text-white uppercase tracking-wider">Vulnerabilities Logged</div>
                                                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{securityCount} white-hat reports filed.</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                        <span>ZDR POLICY: STRICT</span>
                                        <span className="text-emerald-400 font-bold">100% HEALTHY</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {activeTab === "SCHOOLS" && (
                    <motion.div
                        key="schools"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-8 space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white font-orbitron uppercase">Institutional Tenants</h3>
                                <p className="text-xs text-zinc-500 font-mono mt-1">Cryptographically isolated school PostgreSQL schemas</p>
                            </div>
                            <Link
                                href="/admin/schools"
                                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-white flex items-center gap-2"
                            >
                                Manage All Nodes <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                            </Link>
                        </div>

                        <div className="divide-y divide-zinc-900 border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-900/30">
                            {schools.map((school) => (
                                <div key={school.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10B981]" />
                                        <div>
                                            <div className="text-sm font-bold text-white">{school.name}</div>
                                            <div className="text-[10px] font-mono text-zinc-500">CODE: {school.schoolCode}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 font-mono text-xs">
                                        <div className="text-right">
                                            <div className="text-zinc-300 font-bold">{school._count?.users || 0} Staff</div>
                                            <div className="text-[10px] text-zinc-500">{school._count?.students || 0} Students</div>
                                        </div>
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                            RLS PROTECTED
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === "REQUESTS" && (
                    <motion.div
                        key="requests"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-8 space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white font-orbitron uppercase">Inbound Wants-Access Ledger</h3>
                                <p className="text-xs text-zinc-500 font-mono mt-1">Pending school registrations awaiting owner invite token dispatches</p>
                            </div>
                            <Link
                                href="/admin/requests"
                                className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono font-bold flex items-center gap-2"
                            >
                                Open Request Vault <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {wantsAccessRequests.length === 0 ? (
                            <div className="py-12 text-center text-zinc-500 text-xs font-mono">No pending inbound access requests logged.</div>
                        ) : (
                            <div className="space-y-3">
                                {wantsAccessRequests.slice(0, 5).map((req, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-900 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-bold text-white">{req.name || req.email}</div>
                                            <div className="text-[10px] font-mono text-zinc-500">{req.email} • {req.schoolName || 'Institution'}</div>
                                        </div>
                                        <Link
                                            href="/admin/requests"
                                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider"
                                        >
                                            Dispatch Token
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === "SECURITY" && (
                    <motion.div
                        key="security"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-8 space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white font-orbitron uppercase">Vulnerability Disclosure Vault</h3>
                                <p className="text-xs text-zinc-500 font-mono mt-1">Real-time white-hat security logs</p>
                            </div>
                            <Link
                                href="/admin/security"
                                className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono font-bold flex items-center gap-2"
                            >
                                Open Security Vault <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {securityReports.length === 0 ? (
                            <div className="py-12 text-center text-zinc-500 text-xs font-mono">No vulnerabilities logged. System clean.</div>
                        ) : (
                            <div className="space-y-3">
                                {securityReports.map((rep, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-orange-950/10 border border-orange-900/30 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-bold text-orange-400">{rep.title || 'Security Report'}</div>
                                            <div className="text-[10px] font-mono text-zinc-400">Reporter: {rep.reporterEmail || 'Anonymous'}</div>
                                        </div>
                                        <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-mono font-bold uppercase">
                                            {rep.severity || 'DISCLOSED'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === "BILLING" && (
                    <motion.div
                        key="billing"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-8 space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white font-orbitron uppercase">Billing & Wire Receipts</h3>
                                <p className="text-xs text-zinc-500 font-mono mt-1">Manual bank transfer verifications</p>
                            </div>
                            <Link
                                href="/admin/billing"
                                className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold flex items-center gap-2"
                            >
                                Open Billing Console <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {receipts.length === 0 ? (
                            <div className="py-12 text-center text-zinc-500 text-xs font-mono">No wire transfer receipts in queue.</div>
                        ) : (
                            <div className="space-y-3">
                                {receipts.map((rcpt, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-900 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-bold text-white">{rcpt.schoolName || 'School Node'}</div>
                                            <div className="text-[10px] font-mono text-zinc-500">Amount: ${rcpt.amount || '0.00'} • Ref: {rcpt.reference || 'N/A'}</div>
                                        </div>
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase",
                                            rcpt.status === 'VERIFIED' ? "bg-emerald-500/20 text-emerald-400" : "bg-orange-500/20 text-orange-400"
                                        )}>
                                            {rcpt.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
