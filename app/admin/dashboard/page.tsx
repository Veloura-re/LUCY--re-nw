'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    School, Users, GraduationCap, AlertCircle, Loader2, BookOpen,
    Globe, ShieldCheck, CreditCard, Inbox, ArrowUpRight, CheckCircle2, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { WelcomeAnnouncement } from "@/components/dashboard/welcome-announcement";
import { toast } from "sonner";

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

export default function SuperAdminDashboard() {
    const [schools, setSchools] = useState<SchoolType[]>([]);
    const [userName, setUserName] = useState("Administrator");
    const [isLoading, setIsLoading] = useState(true);
    const [securityCount, setSecurityCount] = useState(0);
    const [requestCount, setRequestCount] = useState(0);
    const [pendingReceiptsCount, setPendingReceiptsCount] = useState(0);
    const [recentReceipts, setRecentReceipts] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardMetrics();
        fetchUser();
    }, []);

    const fetchUser = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.name) setUserName(user.user_metadata.name);
    };

    const fetchDashboardMetrics = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch schools list
            const resSchools = await fetch('/api/admin/schools');
            if (resSchools.ok) {
                const data = await resSchools.json() as any;
                setSchools(data.schools || []);
            }

            // 2. Fetch security reports count
            const resSecurity = await fetch('/api/admin/security-reports');
            if (resSecurity.ok) {
                const data = await resSecurity.json() as any;
                setSecurityCount(data.reports?.length || 0);
            }

            // 3. Fetch wants access requests count
            const resRequests = await fetch('/api/admin/wants-access');
            if (resRequests.ok) {
                const data = await resRequests.json() as any;
                setRequestCount(data.requests?.length || 0);
            }

            // 4. Fetch pending receipts count & recent receipts list
            const resReceipts = await fetch('/api/admin/billing/receipts');
            if (resReceipts.ok) {
                const data = await resReceipts.json() as any;
                const receiptsList = data.receipts || [];
                setRecentReceipts(receiptsList.slice(0, 3)); // show top 3
                setPendingReceiptsCount(receiptsList.filter((r: any) => r.status === 'PENDING').length);
            }
        } catch (err: any) {
            console.error('Failed to load dashboard metrics:', err);
            toast.error('Sync failure with database node.');
        } finally {
            setIsLoading(false);
        }
    };

    const totalStaff = schools.reduce((sum, s) => sum + s._count.users, 0);
    const totalStudents = schools.reduce((sum, s) => sum + s._count.students, 0);
    const activeSchools = schools.filter(s => s.status === 'ACTIVE').length;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-eduGreen-600 opacity-60" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-700">Calibrating Core Modules...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            <DashboardGreeting
                name={userName}
                role="SUPERADMIN"
                gender={null}
            />

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Schools", value: schools.length, sub: `${activeSchools} active`, icon: Globe, color: "from-eduGreen-500/10 to-transparent", border: "border-eduGreen-500/10", text: "text-eduGreen-400" },
                    { label: "Total Staff", value: totalStaff, sub: "Platform users", icon: Users, color: "from-blue-500/10 to-transparent", border: "border-blue-500/10", text: "text-blue-400" },
                    { label: "Students", value: totalStudents, sub: "Active learners", icon: GraduationCap, color: "from-purple-500/10 to-transparent", border: "border-purple-500/10", text: "text-purple-400" },
                    { label: "Grade Levels", value: schools.reduce((sum, s) => sum + s._count.grades, 0), sub: "Across all schools", icon: BookOpen, color: "from-amber-500/10 to-transparent", border: "border-amber-500/10", text: "text-amber-400" },
                ].map((stat, i) => (
                    <div key={i} className={`relative overflow-hidden rounded-2xl border ${stat.border} bg-white/[0.02] p-6 group hover:bg-white/[0.04] transition-all`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-60`} />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.25em]">{stat.label}</span>
                                <stat.icon className={`w-4 h-4 ${stat.text} opacity-60`} />
                            </div>
                            <div className={`text-4xl font-medium ${stat.text} mb-1`}>{stat.value}</div>
                            <div className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">{stat.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Action Hub */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* System Navigation Card Grid */}
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 font-orbitron">System Controls</h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* School control */}
                        <Link 
                            href="/admin/schools" 
                            className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between h-40 group transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-eduGreen-950/20 border border-eduGreen-500/10 flex items-center justify-center text-eduGreen-500">
                                    <School className="w-5 h-5" />
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm uppercase tracking-tight">Schools Ledger</h3>
                                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">{schools.length} total nodes registered</p>
                            </div>
                        </Link>

                        {/* Billing Control */}
                        <Link 
                            href="/admin/billing" 
                            className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between h-40 group transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-emerald-950/20 border border-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {pendingReceiptsCount > 0 && (
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    )}
                                    <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm uppercase tracking-tight">Billing & License</h3>
                                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">
                                    {pendingReceiptsCount} wire verification{pendingReceiptsCount !== 1 ? 's' : ''} pending
                                </p>
                            </div>
                        </Link>

                        {/* Security Disclosures */}
                        <Link 
                            href="/admin/security" 
                            className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between h-40 group transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-orange-950/20 border border-orange-500/10 flex items-center justify-center text-orange-500">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm uppercase tracking-tight">Vulnerabilities</h3>
                                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">{securityCount} disclosure reports</p>
                            </div>
                        </Link>

                        {/* Access requests */}
                        <Link 
                            href="/admin/requests" 
                            className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between h-40 group transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-sky-950/20 border border-sky-500/10 flex items-center justify-center text-sky-500">
                                    <Inbox className="w-5 h-5" />
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm uppercase tracking-tight">Access Requests</h3>
                                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">{requestCount} sign-ups logged</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* System Alerts / Urgent items */}
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 font-orbitron">System Health Alerts</h2>
                    
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-[21rem] flex flex-col justify-between">
                        <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin">
                            {pendingReceiptsCount > 0 ? (
                                <div className="flex gap-3 text-emerald-400 bg-emerald-950/10 border border-emerald-900/30 p-3 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    <div className="text-[11px] leading-relaxed">
                                        <strong className="block uppercase tracking-wider text-[10px] text-white">Pending Wire Verification</strong>
                                        There are {pendingReceiptsCount} wire transfers waiting for manual review in the licensing module.
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3 text-zinc-500 bg-zinc-950/50 border border-zinc-900/60 p-3 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    <div className="text-[11px] leading-relaxed">
                                        <strong className="block uppercase tracking-wider text-[10px] text-zinc-400">All Billings Settled</strong>
                                        No pending manual payment receipts waiting in the queue.
                                    </div>
                                </div>
                            )}

                            {securityCount > 0 && (
                                <div className="flex gap-3 text-orange-400 bg-orange-950/10 border border-orange-900/30 p-3 rounded-xl">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    <div className="text-[11px] leading-relaxed">
                                        <strong className="block uppercase tracking-wider text-[10px] text-white">Security Vulnerabilities Logged</strong>
                                        {securityCount} disclosure reports have been posted via public uplink. Review disclosure details immediately.
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-600 font-mono">
                            <span>Status: Node Operational</span>
                            <span>System Load: 1.04</span>
                        </div>
                    </div>
                </div>

            </div>

            <WelcomeAnnouncement />
        </div>
    );
}
