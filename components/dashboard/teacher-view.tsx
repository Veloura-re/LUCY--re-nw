"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap, ArrowRight, Sparkles, Plus, Calendar, Loader2, Brain, Zap, ClipboardCheck, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UpcomingEventsWidget } from "./upcoming-events";
import { DashboardGreeting } from "./dashboard-greeting";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard";

interface TeacherClass {
    id: string; // Assignment ID
    classId: string;
    className: string;
    subjectName: string;
    gradeLevel: number;
    studentCount: number;
    avgGrade?: number;
}

interface TeacherExam {
    id: string;
    title: string;
    subject?: {
        name: string;
    };
}

interface AttendanceStat {
    label: string;
    value: string;
    trend: string;
    color: string;
}

import { Gender } from "@prisma/client";

export function TeacherView({ user, initialData }: {
    user: { role: string; name: string; gender?: Gender | null; schoolId?: string | null };
    initialData?: any;
}) {
    useRealtimeDashboard(user.schoolId);
    const [classes, setClasses] = useState<TeacherClass[]>(initialData?.classes || []);
    const [exams, setExams] = useState<TeacherExam[]>(initialData?.exams || []);
    const [attendanceSummary, setAttendanceSummary] = useState<AttendanceStat[]>(initialData?.attendanceSummary || []);
    const [pendingEvaluations, setPendingEvaluations] = useState<number>(initialData?.pendingEvaluations || 0);
    const [recentSubmissions, setRecentSubmissions] = useState<any[]>(initialData?.recentSubmissions || []);
    const [isLoading, setIsLoading] = useState(!initialData);
    const [isClockedIn, setIsClockedIn] = useState(initialData?.isClockedIn || false);
    const [clockingIn, setClockingIn] = useState(false);

    useEffect(() => {
        if (!initialData) {
            const fetchData = async () => {
                try {
                    const [classesRes, examsRes, analyticsRes] = await Promise.all([
                        fetch('/api/teacher/classes'),
                        fetch('/api/teacher/exams?recent=true'),
                        fetch('/api/teacher/analytics')
                    ]);

                    if (classesRes.ok) {
                        const data = await classesRes.json();
                        setClasses(data.classes);
                    }

                    if (examsRes.ok) {
                        const data = await examsRes.json();
                        setExams(data.exams?.slice(0, 3) || []);
                    }

                    const clockInRes = await fetch('/api/teacher/attendance/clock-in');
                    if (clockInRes.ok) {
                        const clockData = await clockInRes.json();
                        setIsClockedIn(clockData.clockedIn);
                    }

                    if (analyticsRes.ok) {
                        const data = await analyticsRes.json();
                        const attendanceRate = data.attendanceRate || "100%";
                        const missingCount = data.missingCount || 0;
                        setAttendanceSummary([
                            { label: "Attendance Rate", value: attendanceRate, trend: "Institutional Avg", color: "text-eduGreen-500" },
                            { label: "Missing Records", value: missingCount.toString(), trend: "Today", color: missingCount > 0 ? "text-red-500" : "text-zinc-500" }
                        ]);
                        setPendingEvaluations(data.pendingEvaluations || 0);
                        setRecentSubmissions(data.recentSubmissions || []);
                    }

                } catch (error) {
                    console.error("Failed to fetch dashboard data", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [initialData]);

    const handleClockIn = async () => {
        setClockingIn(true);
        try {
            const res = await fetch('/api/teacher/attendance/clock-in', {
                method: 'POST',
            });
            if (res.ok) {
                setIsClockedIn(true);
                toast.success("Successfully clocked in for today.");
            } else {
                toast.error("Failed to clock in");
            }
        } catch (e) {
            toast.error("An error occurred");
        } finally {
            setClockingIn(false);
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-300 relative z-10 pb-40">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-end md:justify-between gap-8"
            >
                <DashboardGreeting name={user?.name || 'Teacher'} role={user?.role} gender={user?.gender} />

                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <Button
                        onClick={handleClockIn}
                        disabled={isClockedIn || clockingIn}
                        className={cn(
                            "h-12 px-8 rounded-xl font-medium text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all border w-full md:w-auto",
                            isClockedIn
                                ? "bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white border-white/10 hover:scale-105 active:scale-95"
                        )}
                    >
                        {clockingIn ? (
                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                        ) : isClockedIn ? (
                            <Calendar className="w-5 h-5 mr-3" />
                        ) : (
                            <Zap className="w-5 h-5 mr-3" />
                        )}
                        {isClockedIn ? "Clocked In" : "Clock In"}
                    </Button>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <Link href="/dashboard/teacher/attendance" className="w-full sm:w-auto">
                            <Button variant="outline" className="w-full sm:w-auto rounded-xl border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all h-12 px-8 font-medium text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white shadow-xl">
                                <Calendar className="mr-3 h-4 w-4 text-eduGreen-500" /> Attendance
                            </Button>
                        </Link>
                        <Link href="/dashboard/teacher/assignments" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-black h-12 px-10 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-105 active:scale-95 border-none">
                                <Zap className="mr-3 h-5 w-5" /> Task Command
                            </Button>
                        </Link>
                        <Link href="/dashboard/teacher/exams" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto bg-gradient-to-r from-eduGreen-600 to-emerald-700 hover:from-eduGreen-500 hover:to-emerald-600 text-white h-12 px-10 rounded-xl font-medium text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-950/40 transition-all hover:scale-105 active:scale-95 border border-white/10">
                                <Plus className="mr-3 h-5 w-5" /> Exam Registry
                            </Button>
                        </Link>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-10">
                    {/* Maker Hub - Enhanced Section (Always visible) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <motion.div
                            whileHover={{ y: -8, transition: { duration: 0.1 } }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Link href="/dashboard/teacher/exams/create" className="group block h-full">
                                <Card className="h-full bg-gradient-to-br from-eduGreen-600 to-emerald-900 border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(15,94,63,0.3)] group-hover:shadow-[0_25px_60px_rgba(15,94,63,0.5)] transition-all relative border-t-white/20">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors" />
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/20 blur-2xl -ml-12 -mb-12" />

                                    <CardContent className="p-10 flex flex-col justify-between h-full min-h-[220px]">
                                        <div>
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="p-4 bg-white/15 rounded-2xl backdrop-blur-md border border-white/20">
                                                    <Plus className="w-6 h-6 text-white" />
                                                </div>
                                                <span className="text-[10px] font-medium text-white/50 uppercase tracking-[0.3em]">Module Registry</span>
                                            </div>
                                            <h3 className="text-3xl font-medium text-white tracking-tight">PEDAGOGICAL SCROLL</h3>
                                            <p className="text-eduGreen-100/70 text-sm font-medium mt-3">Construct custom assessments with full pedagogical control.</p>
                                        </div>

                                        <div className="mt-8 flex items-center justify-between">
                                            <span className="text-[10px] font-medium text-white uppercase tracking-widest flex items-center gap-2">
                                                Initialize Schema <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>

                        <motion.div
                            whileHover={{ y: -8, transition: { duration: 0.1 } }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Link href="/dashboard/teacher/exams/create?mode=ai" className="group block h-full">
                                <Card className="h-full bg-gradient-to-br from-indigo-600 to-purple-900 border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(79,70,229,0.3)] group-hover:shadow-[0_25px_60px_rgba(79,70,229,0.5)] transition-all relative border-t-white/20">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors" />

                                    <CardContent className="p-10 flex flex-col justify-between h-full min-h-[220px]">
                                        <div>
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="p-4 bg-white/15 rounded-2xl backdrop-blur-md border border-white/20">
                                                    <Zap className="w-6 h-6 text-indigo-200" />
                                                </div>
                                                <span className="text-[10px] font-medium text-white/50 uppercase tracking-[0.3em]">Neural Synthesis</span>
                                            </div>
                                            <h3 className="text-3xl font-medium text-white tracking-tight uppercase">NEURAL SCRIBE</h3>
                                            <p className="text-indigo-100/70 text-sm font-medium mt-3">Leverage semantic drafting to generate elite-tier content.</p>
                                        </div>

                                        <div className="mt-8 flex items-center justify-between">
                                            <span className="text-[10px] font-medium text-white uppercase tracking-widest flex items-center gap-2">
                                                Start Synthesis <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    </div>

                    {isLoading ? (
                        <div className="grid md:grid-cols-2 gap-8">
                            {[1, 2, 3, 4].map(i => (
                                <Card key={i} className="bg-zinc-950/20 border-zinc-900 rounded-3xl p-10 h-[300px]">
                                    <div className="flex justify-between mb-8">
                                        <Skeleton className="h-6 w-24 bg-zinc-900/50 rounded-xl" />
                                        <Skeleton className="h-12 w-12 bg-zinc-900/50 rounded-2xl" />
                                    </div>
                                    <Skeleton className="h-8 w-48 bg-zinc-900/50 rounded-xl mb-4" />
                                    <Skeleton className="h-4 w-32 bg-zinc-900/50 rounded-md" />

                                    <div className="grid grid-cols-2 gap-6 mt-8">
                                        <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl" />
                                        <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : classes.length === 0 ? (

                        <div className="flex flex-col items-center justify-center py-32 rounded-[3rem] bg-zinc-950/30 border-2 border-dashed border-zinc-900">
                            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center opacity-20 mb-8">
                                <BookOpen className="w-10 h-10 text-dm-textMain" />
                            </div>
                            <div className="text-center">
                                <p className="text-zinc-600 font-medium uppercase tracking-[0.4em] text-xs">No Nodes Discovered</p>
                                <p className="text-zinc-800 text-[10px] font-medium uppercase tracking-widest mt-3 max-w-sm">Institutional assignments have not been established. Contact administration for grid access.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-8">
                            {user.role === 'HOMEROOM' && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <Card className="group relative bg-gradient-to-br from-eduGreen-600 to-emerald-800 border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-eduGreen-950/40 border-t-white/20 h-full flex flex-col">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />

                                        <CardHeader className="p-10 pb-4 relative z-10">
                                            <div className="flex items-start justify-between gap-4 mb-6">
                                                <div className="px-4 py-2 rounded-xl bg-white/15 border border-white/25 text-[9px] font-medium text-white uppercase tracking-[0.2em] backdrop-blur-md">
                                                    Active Authority
                                                </div>
                                                <div className="p-4 bg-white/10 rounded-2x border border-white/20 shadow-xl backdrop-blur-md">
                                                    <Users className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                            <CardTitle className="text-2xl md:text-4xl font-medium text-white tracking-tight leading-none italic uppercase">
                                                Homeroom<br />Authority
                                            </CardTitle>
                                            <p className="text-eduGreen-100/60 font-medium text-[10px] mt-4 uppercase tracking-[0.3em]">Institutional Presence Registry</p>
                                        </CardHeader>

                                        <CardContent className="p-10 pt-4 relative z-10 flex-1">
                                            <p className="text-white/80 text-sm font-medium leading-relaxed">
                                                Execute daily attendance protocols and manage human capital for your assigned cohort.
                                            </p>
                                        </CardContent>

                                        <CardFooter className="p-10 pt-0 relative z-10 mt-auto">
                                            <Link href="/dashboard/homeroom" className="w-full">
                                                <Button className="w-full h-12 bg-zinc-950/50 hover:bg-eduGreen-600 text-white rounded-xl font-medium text-[10px] uppercase tracking-[0.2em] border border-white/10 hover:border-eduGreen-500 transition-all group/btn shadow-2xl shadow-black/40 backdrop-blur-md">
                                                    Launch Console <ArrowRight className="ml-3 w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                                                </Button>
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            )}
                            {classes.map((cls, index) => (
                                <motion.div
                                    key={cls.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * (index + 2) }}
                                >
                                    <Card className="group relative bg-zinc-950/40 backdrop-blur-3xl border-white/5 rounded-3xl overflow-hidden hover:border-eduGreen-500/30 transition-all border-t-white/10 shadow-2xl h-full flex flex-col">
                                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-eduGreen-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <CardHeader className="p-10 pb-4">
                                            <div className="flex items-start justify-between gap-4 mb-6">
                                                <div className="px-4 py-2 rounded-xl bg-eduGreen-950/30 border border-eduGreen-500/20 text-[9px] font-medium text-eduGreen-400 uppercase tracking-[0.2em] backdrop-blur-md">
                                                    GRID SECTOR {cls.className}
                                                </div>
                                                <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 shadow-xl group-hover:border-eduGreen-500/20 transition-colors backdrop-blur-md">
                                                    <BookOpen className="w-6 h-6 text-zinc-600 group-hover:text-eduGreen-400 transition-colors" />
                                                </div>
                                            </div>
                                            <CardTitle className="text-xl md:text-3xl font-medium text-white group-hover:text-eduGreen-400 transition-colors tracking-tight leading-none italic uppercase">
                                                {cls.subjectName}
                                            </CardTitle>
                                            <div className="flex items-center gap-3 mt-4">
                                                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">GRADE {cls.gradeLevel}</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-eduGreen-950" />
                                                <span className="text-[10px] font-medium text-eduGreen-700 uppercase tracking-widest">Academic Node</span>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="p-10 pt-4 flex-1">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="flex flex-col gap-2 p-5 bg-white/[0.02] rounded-3xl border border-white/5 group-hover:bg-white/[0.04] transition-all relative overflow-hidden">
                                                    <span className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.2em] relative z-10">CAPACITY</span>
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <Users className="w-5 h-5 text-eduGreen-600" />
                                                        <span className="text-xl font-medium text-zinc-400 group-hover:text-white transition-colors">{cls.studentCount}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 p-5 bg-white/[0.02] rounded-3xl border border-white/5 group-hover:bg-white/[0.04] transition-all relative overflow-hidden">
                                                    <span className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.2em] relative z-10">PERFORMANCE</span>
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <GraduationCap className="w-5 h-5 text-eduGreen-600" />
                                                        <span className="text-xl font-medium text-zinc-400 group-hover:text-white transition-colors">
                                                            {cls.avgGrade ? `${Math.round(cls.avgGrade)}%` : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>

                                        <CardFooter className="p-10 pt-0">
                                            <Link href={`/dashboard/teacher/attendance?classId=${cls.classId}`} className="w-full">
                                                <Button className="w-full h-12 bg-zinc-900/50 hover:bg-eduGreen-600 text-zinc-500 hover:text-white rounded-xl font-medium text-[10px] uppercase tracking-[0.2em] border border-white/5 hover:border-eduGreen-500 transition-all group/btn backdrop-blur-md shadow-xl">
                                                    Sync Grid <ArrowRight className="ml-3 w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                                                </Button>
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-4 space-y-10"
                >
                    {/* Compact Tracking - Enhanced */}
                    <Card className="bg-zinc-950/40 backdrop-blur-3xl border-white/5 shadow-2xl rounded-3xl overflow-hidden border-t-white/10">
                        <CardHeader className="border-b border-white/5 pb-8 p-10">
                            <CardTitle className="text-[10px] font-medium text-white uppercase tracking-[0.3em] flex items-center gap-3">
                                <Users className="w-4 h-4 text-eduGreen-500" /> Attendance Registry
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 space-y-6">
                            {attendanceSummary.map((stat, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ x: 5 }}
                                    className="flex justify-between items-center p-6 bg-white/[0.03] rounded-3xl border border-white/5 group hover:bg-white/[0.05] transition-all"
                                >
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">{stat.label}</span>
                                        <div className="text-[8px] font-medium text-zinc-700 uppercase tracking-tighter">{stat.trend}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={cn("text-2xl font-medium italic", stat.color)}>{stat.value}</div>
                                    </div>
                                </motion.div>
                            ))}
                            <Link href="/dashboard/teacher/attendance">
                                <Button variant="ghost" className="w-full h-14 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 hover:text-eduGreen-400 hover:bg-eduGreen-950/20 rounded-2xl transition-all">
                                    Full Register <ArrowRight className="w-4 h-4 ml-3" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Homework Monitor - NEW Hub */}
                    <Card className="bg-zinc-950/40 backdrop-blur-3xl border-white/5 shadow-2xl rounded-3xl overflow-hidden border-t-white/10">
                        <CardHeader className="border-b border-white/5 pb-8 p-10">
                            <CardTitle className="text-[10px] font-medium text-white uppercase tracking-[0.3em] flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <ClipboardCheck className="w-4 h-4 text-emerald-500" /> Homework Monitor
                                </div>
                                {pendingEvaluations > 10 && (
                                    <div className="flex items-center gap-2 text-rose-500 animate-pulse">
                                        <AlertCircle className="w-3 h-3" /> <span className="text-[8px] font-black italic">HIGH LOAD</span>
                                    </div>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 space-y-8">
                            <div className="flex items-center justify-between p-8 bg-white/[0.03] rounded-[2rem] border border-white/5 relative overflow-hidden">
                                {pendingEvaluations > 0 && (
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-3xl -mr-12 -mt-12" />
                                )}
                                <div>
                                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">Pending Evaluation</span>
                                    <div className={cn(
                                        "text-4xl font-black italic mt-1",
                                        pendingEvaluations > 0 ? "text-white" : "text-zinc-800"
                                    )}>{pendingEvaluations}</div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-wider block mb-2">Backlog Priority</span>
                                    <div className={cn(
                                        "w-3 h-3 rounded-full ml-auto",
                                        pendingEvaluations > 10 ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]" : 
                                        pendingEvaluations > 0 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-zinc-900"
                                    )} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-zinc-700 uppercase tracking-widest ml-2">Recent Submissions</label>
                                {recentSubmissions.length > 0 ? (
                                    <div className="space-y-3">
                                        {recentSubmissions.map((sub: any) => (
                                            <Link 
                                                key={sub.id} 
                                                href={`/dashboard/teacher/assignments?id=${sub.assignmentId}`}
                                                className="block p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-emerald-500/20 transition-all group"
                                            >
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <h5 className="text-[11px] font-bold text-white uppercase italic group-hover:text-emerald-500 transition-colors">{sub.student?.firstName} {sub.student?.lastName}</h5>
                                                        <p className="text-[9px] font-medium text-zinc-600 uppercase truncate max-w-[150px]">{sub.assignment?.title}</p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-emerald-500 transition-colors" />
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 bg-white/5 border border-dashed border-white/10 rounded-[2rem] text-center">
                                        <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest italic">Neural Registry Clear</p>
                                    </div>
                                )}
                            </div>

                            <Link href="/dashboard/teacher/assignments">
                                <Button className="w-full h-16 bg-white hover:bg-zinc-200 text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
                                    Full Dispatch Hub <ArrowRight className="w-4 h-4 ml-3" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Recent Exams - Restored */}
                    <Card className="bg-zinc-950/40 backdrop-blur-3xl border-white/5 shadow-2xl rounded-3xl overflow-hidden border-t-white/10">
                        <CardHeader className="border-b border-white/5 pb-8 p-10">
                            <CardTitle className="text-[10px] font-medium text-white uppercase tracking-[0.3em] flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-eduGreen-500" /> Scholastic Ledger
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 space-y-5">
                            {exams.length > 0 ? exams.map((exam) => (
                                <motion.div
                                    key={exam.id}
                                    whileHover={{ x: 5 }}
                                    className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 hover:border-eduGreen-500/30 transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-eduGreen-500/5 blur-2xl -mr-8 -mt-8" />

                                    <div className="flex justify-between items-center mb-4 relative z-10">
                                        <span className="text-[9px] font-medium text-eduGreen-600 uppercase tracking-[0.2em]">{exam.subject?.name}</span>
                                        <div className="flex items-center gap-1.5">
                                            <Link href={`/dashboard/teacher/exams/${exam.id}/editor`}>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10">
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                </Button>
                                            </Link>
                                            <Link href={`/dashboard/teacher/gradebook/${exam.id}`}>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-eduGreen-400 hover:bg-eduGreen-500/10">
                                                    <Brain className="w-3.5 h-3.5" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="font-medium text-lg text-white group-hover:text-eduGreen-400 transition-colors flex items-center justify-between relative z-10 italic uppercase tracking-tight">
                                        {exam.title}
                                        <Link href={`/dashboard/teacher/gradebook/${exam.id}`}>
                                            <ArrowRight className="w-4 h-4 text-zinc-800 group-hover:text-eduGreen-400 transition-all translate-x-1 group-hover:translate-x-2" />
                                        </Link>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="text-center py-10 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                                    <p className="text-[10px] font-medium text-zinc-800 uppercase tracking-widest">No recent assessments</p>
                                </div>
                            )}
                            <Link href="/dashboard/teacher/exams">
                                <Button variant="ghost" className="w-full h-14 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 hover:text-eduGreen-400 hover:bg-eduGreen-950/20 rounded-2xl transition-all">
                                    Archive View <ArrowRight className="w-4 h-4 ml-3" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <UpcomingEventsWidget />
                </motion.div>
            </div>
        </div>
    );
}

