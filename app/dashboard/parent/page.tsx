"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    GraduationCap, TrendingUp, Calendar, CreditCard,
    ChevronRight, Loader2, AlertCircle, Users, ArrowRight,
    BookOpen, ClipboardCheck
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";

export default function ParentDashboard() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/parent/children')
            .then(r => r.json())
            .then(d => setStudents(d.students || []))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <Loader2 className="w-10 h-10 text-eduGreen-500 animate-spin" />
            <p className="text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-[0.4em] text-[10px]">Syncing Family Node Matrix...</p>
        </div>
    );

    return (
        <div className="space-y-12 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Family <span className="text-eduGreen-500 italic">Command</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">
                        {students.length} Linked Node{students.length !== 1 ? 's' : ''} · Live Academic Feed
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/parent/authorizations">
                        <Button variant="outline" className="rounded-2xl border-zinc-200 dark:border-zinc-900 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 hover:border-eduGreen-500/30 h-12 px-6 text-[10px] font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-500 hover:text-white">
                            <ClipboardCheck className="w-4 h-4 mr-2" /> Absence Permits
                        </Button>
                    </Link>
                    <Link href="/dashboard/finance">
                        <Button variant="outline" className="rounded-2xl border-zinc-200 dark:border-zinc-900 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 hover:border-eduGreen-500/30 h-12 px-6 text-[10px] font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-500 hover:text-white">
                            <CreditCard className="w-4 h-4 mr-2" /> Billing
                        </Button>
                    </Link>
                </div>
            </div>

            {students.length === 0 ? (
                <div className="text-center py-32 border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-[3rem]">
                    <Users className="w-16 h-16 text-zinc-900 dark:text-white mx-auto mb-6" />
                    <h3 className="text-zinc-600 font-black uppercase tracking-[0.5em] text-lg italic">No Nodes Linked</h3>
                    <p className="text-zinc-800 dark:text-zinc-200 mt-4 text-[10px] font-bold uppercase tracking-[0.4em]">Contact your school to link your children to this account.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {students.map((student: any, idx: number) => {
                        const attendancePct = parseFloat(student.stats?.attendancePct || "100");
                        const avgScore = parseFloat(student.stats?.averageScore || "0");
                        const outstanding = parseFloat(student.stats?.totalOutstanding || "0");

                        const attendanceColor = attendancePct >= 90 ? "text-eduGreen-500" : attendancePct >= 75 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
                        const gradeColor = avgScore >= 80 ? "text-eduGreen-500" : avgScore >= 60 ? "text-blue-400" : avgScore >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

                        return (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] overflow-hidden hover:border-zinc-800 transition-all shadow-2xl group">
                                    <CardContent className="p-7 md:p-10">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                            {/* Identity */}
                                            <div className="flex items-center gap-6">
                                                <div className="relative shrink-0">
                                                    {student.photoUrl ? (
                                                        <div className="relative w-20 h-20 overflow-hidden rounded-[1.5rem] border-2 border-zinc-300 dark:border-zinc-800">
                                                            <Image src={student.photoUrl} alt="" fill sizes="80px" className="object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-20 h-20 rounded-[1.5rem] bg-eduGreen-950/30 border-2 border-eduGreen-900/30 flex items-center justify-center text-2xl font-black text-eduGreen-500">
                                                            {student.firstName[0]}
                                                        </div>
                                                    )}
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-eduGreen-500 border-2 border-zinc-300 dark:border-zinc-950 shadow-sm" />
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">{student.firstName} {student.lastName}</h2>
                                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                        <Badge className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 font-mono text-[8px] tracking-widest">{student.studentCode}</Badge>
                                                        {student.class && (
                                                            <Badge className="bg-eduGreen-950/30 text-eduGreen-500 border-eduGreen-900/30 text-[8px] tracking-widest">
                                                                {student.grade?.name} · {student.class?.name}
                                                            </Badge>
                                                        )}
                                                        {student.class?.homeroomTeacher && (
                                                            <span className="text-[9px] text-zinc-600 uppercase tracking-widest">
                                                                Homeroom: {student.class.homeroomTeacher.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="flex flex-wrap gap-4 lg:gap-6">
                                                <div className="text-center min-w-[80px]">
                                                    <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Attendance</p>
                                                    <p className={cn("text-2xl font-black tracking-tighter", attendanceColor)}>{attendancePct.toFixed(0)}%</p>
                                                </div>
                                                <div className="w-px bg-zinc-100 dark:bg-zinc-900 hidden md:block" />
                                                <div className="text-center min-w-[80px]">
                                                    <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Avg Grade</p>
                                                    <p className={cn("text-2xl font-black tracking-tighter", gradeColor)}>{avgScore.toFixed(0)}%</p>
                                                </div>
                                                {outstanding > 0 && (
                                                    <>
                                                        <div className="w-px bg-zinc-100 dark:bg-zinc-900 hidden md:block" />
                                                        <div className="text-center min-w-[80px]">
                                                            <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Outstanding</p>
                                                            <p className="text-2xl font-black tracking-tighter text-amber-600 dark:text-amber-400">${outstanding.toFixed(0)}</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Action Links */}
                                            <div className="flex flex-col gap-2 min-w-[160px]">
                                                <Link href={`/dashboard/reports/${student.id}`}>
                                                    <Button className="w-full h-11 rounded-xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-medium text-[10px] uppercase tracking-widest">
                                                        <BookOpen className="w-4 h-4 mr-2" /> Report Card
                                                    </Button>
                                                </Link>
                                                <Link href={`/dashboard/parent/authorizations?studentId=${student.id}`}>
                                                    <Button variant="ghost" className="w-full h-11 rounded-xl text-zinc-600 dark:text-zinc-500 hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-900 text-[10px] uppercase tracking-widest">
                                                        <ClipboardCheck className="w-4 h-4 mr-2" /> Absence Permit
                                                        <ChevronRight className="w-3 h-3 ml-auto" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Recent Invoices strip */}
                                        {student.recentInvoices?.length > 0 && (
                                            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-900/50 flex items-center gap-3 flex-wrap">
                                                <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">Recent Bills:</span>
                                                {student.recentInvoices.map((inv: any) => (
                                                    <Badge key={inv.studentId + inv.amount} className={cn(
                                                        "text-[9px] font-bold border",
                                                        inv.status === 'PAID' ? "bg-eduGreen-950/20 text-eduGreen-600 border-eduGreen-900/30" :
                                                            inv.status === 'OVERDUE' ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-500 border-red-200 dark:border-red-900/30" :
                                                                "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-900/30"
                                                    )}>
                                                        ${parseFloat(inv.amount).toFixed(0)} · {inv.status}
                                                    </Badge>
                                                ))}
                                                <Link href="/dashboard/finance" className="text-[9px] text-eduGreen-500 hover:text-eduGreen-400 font-bold uppercase tracking-widest flex items-center gap-1 ml-auto">
                                                    View All <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        )}
                                    </CardContent>

                                    {/* Bottom bar */}
                                    <div className="h-[2px] bg-gradient-to-r from-eduGreen-600/40 via-transparent to-transparent group-hover:from-eduGreen-500/60 transition-all duration-300" />
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: "Messages", href: "/dashboard/messages", icon: "💬" },
                    { label: "Events", href: "/dashboard/events", icon: "📅" },
                    { label: "Billing", href: "/dashboard/finance", icon: "💳" },
                    { label: "Homework", href: "/dashboard/student/assignments", icon: "📝" },
                    { label: "Absence Permits", href: "/dashboard/parent/authorizations", icon: "📋" },
                ].map(({ label, href, icon }) => (
                    <Link key={href} href={href}>
                        <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 rounded-[2rem] hover:border-zinc-800 transition-all cursor-pointer group">
                            <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                                <span className="text-2xl">{icon}</span>
                                <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-500 group-hover:text-zinc-300 uppercase tracking-widest transition-colors">{label}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
