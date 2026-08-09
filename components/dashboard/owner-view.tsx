"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, BarChart3, Users, GraduationCap, BookOpen, Calendar, DollarSign, Settings, Bell, Search, Sparkles, School as SchoolIcon, Clock, MessageSquare, Shield, Activity, PenTool } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { UpcomingEventsWidget } from "./upcoming-events";
import { DashboardGreeting } from "./dashboard-greeting";
import { Skeleton } from "@/components/ui/skeleton";
import SpringingLoader from "./springing-loader";
import { toast } from "sonner";
import { SmartConnectivity } from "./smart-connectivity";

import { Gender, School, Role } from "@prisma/client";

interface OwnerViewProps {
    user: {
        id: string;
        name: string;
        role: Role;
        gender?: Gender | null;
    };
    school: (School & {
        _count: {
            students: number;
            users: number;
        };
    }) | null;
    initialAnalytics?: any;
}

export function OwnerView({ user, school: initialSchool, initialAnalytics }: OwnerViewProps) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'realtime' | 'historical'>('realtime');
    const [analytics, setAnalytics] = useState<any>(initialAnalytics);
    const [isLoading, setIsLoading] = useState<boolean>(!initialAnalytics && !!initialSchool);

    useEffect(() => {
        if (initialSchool && !initialAnalytics) {
            fetch('/api/school/analytics')
                .then(res => res.json())
                .then(data => {
                    setAnalytics(data);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Pulse fetch error:", err);
                    setIsLoading(false);
                });
        }
    }, [initialSchool, initialAnalytics]);

    if (isLoading && initialSchool) {
        return (
            <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-64 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl" />
                        <Skeleton className="h-4 w-40 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-md" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="bg-white/20 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-900 rounded-3xl p-8 border-t-zinc-800/20">
                            <Skeleton className="h-4 w-20 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-md mb-6" />
                            <Skeleton className="h-12 w-16 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-lg mb-4" />
                            <Skeleton className="h-3 w-24 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-md" />
                        </Card>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8">
                        <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] h-[400px]">
                            <CardHeader className="p-8 border-b border-zinc-200 dark:border-zinc-900/50">
                                <Skeleton className="h-8 w-48 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl" />
                            </CardHeader>
                            <CardContent className="p-8 grid grid-cols-4 gap-4">
                                <Skeleton className="col-span-4 h-32 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl" />
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="col-span-1 h-24 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl" />
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-4">
                        <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] h-[400px]">
                            <CardHeader className="p-8 border-b border-zinc-200 dark:border-zinc-900/50">
                                <Skeleton className="h-6 w-32 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl" />
                            </CardHeader>
                            <CardContent className="p-8 space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-16 w-full bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl" />
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    // --- UNLINKED VIEW ---
    if (!initialSchool) {
        return (
            <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10">
                <div className="py-24 text-center rounded-3xl bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-900/50 shadow-2xl">
                    <SchoolIcon className="w-12 h-12 text-zinc-800 dark:text-zinc-200 mx-auto mb-6" />
                    <h2 className="text-2xl font-medium text-zinc-900 dark:text-white mb-2">Unlinked Account</h2>
                    <p className="text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-widest text-[10px]">
                        Your owner profile is not associated with any active institution.
                        <br />Please contact the super administrator to be linked to your school.
                    </p>
                </div>
            </div>
        );
    }

    const stats = [
        { label: "Total Students", value: analytics?.summary?.studentCount || 0, icon: GraduationCap, color: "text-eduGreen-500", desc: "Active Learners" },
        {
            label: "Staff Attendance",
            value: analytics?.summary?.staffPresence ? `${analytics.summary.staffPresence.present}/${analytics.summary.staffPresence.total}` : "0/0",
            icon: Users,
            color: "text-emerald-500",
            desc: "Faculty Present"
        },
        { label: "Active Classes", value: analytics?.summary?.classCount || 0, icon: BookOpen, color: "text-eduGreen-400", desc: "Digital Rooms" },
        { label: "Recent Events", value: analytics?.summary?.recentEvents || 0, icon: Calendar, color: "text-emerald-400", desc: "School Timeline" },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-3.5 sm:space-y-8 md:space-y-12 animate-in fade-in duration-300 relative z-10 pb-20 sm:pb-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2.5 sm:gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-3 sm:pb-10">
                <DashboardGreeting name={user?.name || 'Owner'} role="Owner" gender={user?.gender} />
                <div className="flex flex-row items-center gap-2 sm:gap-4 w-full md:w-auto">
                    <Link href="/dashboard/events" className="flex-1 sm:flex-initial">
                        <Button className="w-full sm:w-auto bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-800 rounded-lg sm:rounded-xl h-8 sm:h-10 px-2.5 sm:px-4 text-[8px] sm:text-[10px] font-medium uppercase tracking-widest flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm">
                            <Calendar className="w-3 h-3 text-eduGreen-500" />
                            Events
                        </Button>
                    </Link>
                    <div className="flex bg-white dark:bg-zinc-950 p-0.5 sm:p-1.5 rounded-lg sm:rounded-2xl border border-zinc-200 dark:border-zinc-900 shadow-sm sm:shadow-2xl justify-center">
                        <button
                            onClick={() => setViewMode('realtime')}
                            className={cn(
                                "px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-md sm:rounded-xl text-[8px] sm:text-[10px] font-medium uppercase tracking-widest transition-all",
                                viewMode === 'realtime'
                                    ? "bg-eduGreen-600 text-white shadow-md sm:shadow-lg shadow-eduGreen-900/20"
                                    : "text-zinc-600 hover:text-eduGreen-600 dark:hover:text-white"
                            )}
                        >
                            Real-time
                        </button>
                        <button
                            onClick={() => setViewMode('historical')}
                            className={cn(
                                "px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-md sm:rounded-xl text-[8px] sm:text-[10px] font-medium uppercase tracking-widest transition-all",
                                viewMode === 'historical'
                                    ? "bg-eduGreen-600 text-white shadow-md sm:shadow-lg shadow-eduGreen-900/20"
                                    : "text-zinc-600 hover:text-eduGreen-600 dark:hover:text-white"
                            )}
                        >
                            Historical
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {viewMode === 'realtime' ? (
                    <motion.div
                        key="realtime"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-3.5 sm:space-y-12"
                    >
                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-8">
                            {stats.map((stat, i) => (
                                <Card key={i} className="bg-white/20 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-900 rounded-xl sm:rounded-3xl p-3 sm:p-8 hover:border-eduGreen-900/30 transition-all border-t-zinc-800/20 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <stat.icon className="w-5 h-5 sm:w-12 sm:h-12" />
                                    </div>
                                    <p className="text-[7px] sm:text-[10px] font-medium uppercase tracking-widest text-zinc-700 mb-0.5 sm:mb-2 truncate">{stat.label}</p>
                                    <p className="text-lg sm:text-4xl font-medium text-zinc-900 dark:text-white tracking-tight">{stat.value}</p>
                                    <p className="text-[7px] sm:text-[9px] font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-widest mt-0.5 sm:mt-2 truncate">{stat.desc}</p>
                                </Card>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-8">
                            <div className="lg:col-span-8">
                                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-3xl overflow-hidden group shadow-xl sm:shadow-2xl border-t-zinc-800/20 flex flex-col h-full">
                                    <CardHeader className="p-3.5 sm:p-8 pb-2 sm:pb-4 flex flex-row items-center justify-between border-b border-zinc-200 dark:border-zinc-900/50">
                                        <div>
                                            <CardTitle className="text-base sm:text-lg md:text-2xl font-medium text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 sm:gap-3">
                                                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-500" />
                                                Executive Overview
                                            </CardTitle>
                                            <p className="text-[8px] sm:text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-0.5 sm:mt-1 ml-6 sm:ml-8">Financials & Personnel Ledger</p>
                                        </div>
                                        <div className="flex space-x-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse delay-75" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse delay-150" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-3.5 sm:p-8 flex-grow">
                                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 h-full">
                                            <div className="col-span-2 lg:col-span-4">
                                                <MetricNode
                                                    label="Current Monthly Revenue"
                                                    value={`$${(analytics?.summary?.collectedFees || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                                                    icon={<DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-500" />}
                                                    percentage={(analytics?.summary?.collectedFees || 0) > 0 ? 12 : undefined}
                                                    trend={(analytics?.summary?.collectedFees || 0) > 0 ? "Positive Yield" : undefined}
                                                    featured
                                                />
                                            </div>

                                            <div className="col-span-1 lg:col-span-1">
                                                <MetricNode
                                                    label="Principals"
                                                    value={analytics?.summary?.principalCount || 0}
                                                    icon={<Shield className="w-4 h-4 sm:w-5 sm:h-5" />}
                                                />
                                            </div>
                                            <div className="col-span-1 lg:col-span-1">
                                                <MetricNode
                                                    label="Staff/Teachers"
                                                    value={analytics?.summary?.staffPresence?.total || 0}
                                                    icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />}
                                                />
                                            </div>
                                             <div className="col-span-1 lg:col-span-1">
                                                <MetricNode
                                                    label="Approvals"
                                                    value={analytics?.summary?.pendingApprovals || 0}
                                                    icon={<BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />}
                                                />
                                            </div>
                                            <div className="col-span-1 lg:col-span-1">
                                                <MetricNode
                                                    label="Pending Receivables"
                                                    value={`$${(analytics?.summary?.pendingFees || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                                                    icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="lg:col-span-4">
                                <Card className="h-full bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl border-t-zinc-800/20">
                                    <CardHeader className="p-3.5 sm:p-8 pb-2 sm:pb-4 border-b border-zinc-200 dark:border-zinc-900/50">
                                        <CardTitle className="text-sm sm:text-base md:text-xl font-medium text-zinc-900 dark:text-white flex items-center gap-2 sm:gap-3">
                                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-eduGreen-500" />
                                            Scholastic Summons
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3.5 sm:px-8 pb-3.5 sm:pb-8 pt-2 sm:pt-4">
                                        <UpcomingEventsWidget />
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="lg:col-span-12">
                                <SmartConnectivity />
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="historical"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-3.5 sm:space-y-12"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-8">
                            {/* Attendance Waveform */}
                            <div className="lg:col-span-7">
                                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl border-t-zinc-800/20">
                                    <CardHeader className="p-4 sm:p-10 pb-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base sm:text-lg md:text-2xl font-medium text-zinc-900 dark:text-white">Attendance Waveform</CardTitle>
                                                <p className="text-[8px] sm:text-[9px] font-medium text-zinc-600 uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-0.5 sm:mt-1">7-Day Scholar Presence Index</p>
                                            </div>
                                            <div className="px-2 sm:px-3 py-0.5 sm:py-1 bg-eduGreen-500/10 border border-eduGreen-500/20 rounded-md sm:rounded-lg">
                                                <span className="text-[8px] sm:text-[10px] font-medium text-eduGreen-500 uppercase tracking-widest italic">Live Trend</span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-10 pt-3 sm:pt-8">
                                        <AttendanceWaveform data={analytics?.attendance || []} />
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Subject Power Bars */}
                            <div className="lg:col-span-5">
                                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl border-t-zinc-800/20 h-full">
                                    <CardHeader className="p-4 sm:p-10 pb-2 sm:pb-4">
                                        <CardTitle className="text-sm sm:text-base md:text-xl font-medium text-zinc-900 dark:text-white">Subject Mastery</CardTitle>
                                        <p className="text-[8px] sm:text-[9px] font-medium text-zinc-600 uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-0.5 sm:mt-1">Performance Distribution</p>
                                    </CardHeader>
                                    <CardContent className="px-4 sm:px-10 pb-4 sm:pb-10 space-y-3 sm:space-y-8">
                                        {analytics?.performanceBySubject?.length > 0 ? (
                                            analytics.performanceBySubject.map((s: any, i: number) => (
                                                <div key={i} className="space-y-1.5 sm:space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[8px] sm:text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">{s.name}</span>
                                                        <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white">{s.avg.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-1.5 sm:h-2 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-800/50">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${s.avg}%` }}
                                                            transition={{ duration: 0.8, delay: i * 0.1 }}
                                                            className="h-full bg-gradient-to-r from-eduGreen-600 to-eduGreen-400 shadow-[0_0_10px_rgba(20,184,115,0.3)]"
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-10 sm:py-20 text-center text-[8px] sm:text-[10px] font-medium uppercase text-zinc-800 dark:text-zinc-200 tracking-[0.2em] sm:tracking-[0.3em]">No Data Connection Found</div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MetricNode({ label, value, icon, percentage, trend, featured = false }: { label: string, value: string | number, icon: React.ReactNode, percentage?: number, trend?: string, featured?: boolean }) {
    return (
        <div className={cn(
            "relative group/metric overflow-hidden transition-all duration-300 rounded-xl sm:rounded-3xl",
            featured
                ? "p-4 sm:p-8 md:p-10 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900/80 dark:to-zinc-950 hover:shadow-[0_0_40px_-10px_rgba(20,184,115,0.2)] border border-zinc-200 dark:border-zinc-800/50"
                : "p-2.5 sm:p-5 bg-white/40 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
        )}>
            {/* Background Glow */}
            {featured && (
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-eduGreen-500/10 rounded-full blur-[80px] pointer-events-none group-hover/metric:bg-eduGreen-500/20 transition-all duration-300" />
            )}
            {!featured && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/metric:opacity-100 transition-opacity duration-300" />
            )}

            <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between mb-2 sm:mb-4">
                    <div className="flex items-center gap-1.5 sm:gap-3">
                        <div className={cn(
                            "flex items-center justify-center rounded-lg sm:rounded-2xl shadow-inner transition-colors duration-300",
                            featured
                                ? "w-8 h-8 sm:w-12 sm:h-12 bg-eduGreen-500/10 dark:bg-eduGreen-500/20 text-eduGreen-600 dark:text-eduGreen-400 group-hover/metric:bg-eduGreen-500/20 dark:group-hover/metric:bg-eduGreen-500/30 group-hover/metric:text-eduGreen-700 dark:group-hover/metric:text-eduGreen-300"
                                : "w-7 h-7 sm:w-10 sm:h-10 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 group-hover/metric:text-zinc-900 dark:group-hover/metric:text-white"
                        )}>
                            {icon}
                        </div>
                        <span className={cn(
                            "font-medium uppercase tracking-[0.1em] sm:tracking-[0.2em] truncate",
                            featured ? "text-[9px] sm:text-xs text-zinc-700 dark:text-zinc-300" : "text-[8px] sm:text-[10px] text-zinc-600 dark:text-zinc-500 group-hover/metric:text-zinc-900 dark:group-hover/metric:text-zinc-400 transition-colors"
                        )}>{label}</span>
                    </div>

                    {trend && (
                        <div className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[7px] sm:text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                            <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {trend}
                        </div>
                    )}
                </div>

                <div className="flex items-end justify-between gap-2 sm:gap-6">
                    <div>
                        <div className={cn(
                            "font-semibold tracking-tighter mb-1 sm:mb-2 mt-1 sm:mt-4",
                            featured ? "text-2xl sm:text-6xl text-zinc-900 dark:text-white" : "text-base sm:text-3xl text-zinc-900 dark:text-white"
                        )}>
                            {value}
                        </div>

                        <div className="text-[7px] sm:text-[10px] font-medium text-zinc-500 dark:text-zinc-600 uppercase tracking-widest italic flex items-center gap-1.5 sm:gap-2">
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-eduGreen-500 animate-pulse shadow-[0_0_8px_rgba(20,184,115,0.8)]" />
                            Live
                        </div>
                    </div>

                    {percentage !== undefined && (
                        <div className="flex flex-col items-end justify-center mb-0.5 sm:mb-1">
                            <span className={cn("font-medium text-zinc-600 dark:text-zinc-400 leading-none", featured ? "text-sm sm:text-xl" : "text-xs sm:text-sm")}>
                                {Math.round(percentage)}%
                            </span>
                            <span className={cn("font-medium text-zinc-400 dark:text-zinc-600 uppercase mt-0.5 sm:mt-1", featured ? "text-[7px] sm:text-[8px]" : "text-[5px] sm:text-[6px]")}>Index</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AttendanceWaveform({ data }: { data: any[] }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!data.length) return <div className="h-40 sm:h-64 flex items-center justify-center text-[8px] sm:text-[10px] font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Awaiting Smart Link...</div>;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - d.percentage;
        return `${x},${y}`;
    }).join(" ");

    const areaPoints = `0,100 ${points} 100,100`;

    return (
        <div className="relative h-40 sm:h-64 w-full group">
            <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b873" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#14b873" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Area Fill */}
                <motion.polyline
                    points={areaPoints}
                    fill="url(#waveGradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                />

                {/* Main Line */}
                <motion.polyline
                    points={points}
                    fill="none"
                    stroke="#14b873"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.3, ease: "easeInOut" }}
                />

                {/* Data Points */}
                {data.map((d, i) => (
                    <circle
                        key={i}
                        cx={(i / (data.length - 1)) * 100}
                        cy={100 - d.percentage}
                        r="1.5"
                        fill="#147A52"
                        className="hover:r-2 transition-all cursor-pointer shadow-lg"
                    />
                ))}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between mt-3 sm:mt-6">
                {data.map((d, i) => (
                    <span key={i} className="text-[7px] sm:text-[8px] font-medium text-zinc-700 uppercase tracking-widest">
                        {mounted ? new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }) : "---"}
                    </span>
                ))}
            </div>
        </div>
    );
}

