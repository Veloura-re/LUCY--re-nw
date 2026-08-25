"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    GraduationCap,
    BookOpen,
    Calendar,
    Sparkles,
    ArrowRight,
    Trophy,
    Clock,
    BarChart3,
    Target,
    LayoutDashboard,
    MessageSquare,
    Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { UpcomingEventsWidget } from "./upcoming-events";

import { Gender, Role } from "@prisma/client";

interface StudentProps {
    user: {
        id: string;
        name: string;
        role: Role;
        gender?: Gender | null;
    };
}

export function StudentView({ user }: StudentProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [studentData, setStudentData] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/user/stats');
                const data = await res.json();
                setStudentData(data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <SpringingLoader message="Initializing High-Bandwidth Interface" />
            </div>
        );
    }

    const stats = [
        { label: "Academic GPA", value: studentData?.gpa || "0.0", icon: Trophy, color: "text-amber-600 dark:text-amber-500", trend: "Active" },
        { label: "Attendance", value: `${Math.round(studentData?.attendanceRate || 100)}%`, icon: Target, color: "text-eduGreen-500", trend: "Live" },
        { label: "Pending Tasks", value: studentData?.assignments?.pendingCount || "0", icon: BookOpen, color: "text-blue-500", trend: "Sync" },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-3.5 sm:space-y-8 md:space-y-12 animate-in fade-in duration-300 relative z-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-3 sm:pb-6 md:pb-10">
                <div>
                    <h1 className="text-xl sm:text-3xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Scholarly <span className="text-eduGreen-500 italic capitalize">Sanctum</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-[8px] sm:text-[10px] mt-1 sm:mt-3">Student Portal & Active Connection</p>
                </div>

                <div className="flex items-center gap-2 mb-0.5">
                    <Link href="/dashboard/sanctuary">
                        <Button variant="outline" className="rounded-lg sm:rounded-2xl border-eduGreen-500/30 bg-eduGreen-950/20 hover:bg-eduGreen-950/40 hover:border-eduGreen-500 transition-all h-8 sm:h-10 md:h-14 px-2.5 sm:px-4 md:px-6 font-medium text-[8px] sm:text-[10px] uppercase tracking-widest text-eduGreen-400 hover:text-white shadow-sm">
                            <Shield className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4 text-eduGreen-400" /> Sanctuary
                        </Button>
                    </Link>
                    <Link href="/dashboard/messages">
                        <Button variant="outline" className="rounded-lg sm:rounded-2xl border-zinc-200 dark:border-zinc-900 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 hover:border-eduGreen-500/30 transition-all h-8 sm:h-10 md:h-14 px-2.5 sm:px-4 md:px-6 font-medium text-[8px] sm:text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                            <MessageSquare className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" /> Secure Comms
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Quick Stats — Compact 3-col Bar on Mobile */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 hover:border-eduGreen-500/30 transition-all duration-300 overflow-hidden group border-t-zinc-800/10 shadow-lg sm:shadow-2xl rounded-xl sm:rounded-[2.5rem]">
                        <div className="absolute inset-0 bg-gradient-to-br from-eduGreen-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-4 space-y-0 relative z-10 px-2.5 sm:px-8 pt-2.5 sm:pt-8">
                            <CardTitle className="text-[7px] sm:text-[10px] font-medium uppercase tracking-wider sm:tracking-[0.2em] text-zinc-600 dark:text-zinc-500 group-hover:text-eduGreen-500 transition-colors truncate">
                                {stat.label}
                            </CardTitle>
                            <stat.icon className={cn("h-3 w-3 sm:h-4 sm:w-4 transition-all group-hover:scale-110 shrink-0 ml-1", stat.color)} />
                        </CardHeader>
                        <CardContent className="relative z-10 px-2.5 sm:px-8 pb-2.5 sm:pb-8">
                            <div className="text-base sm:text-3xl md:text-4xl font-medium text-zinc-900 dark:text-white mb-0.5 sm:mb-2 tracking-tighter">{stat.value}</div>
                            <div className="text-[7px] sm:text-[9px] font-medium text-zinc-700 uppercase tracking-widest flex items-center gap-1 sm:gap-2">
                                <span className={cn(stat.trend.startsWith('+') ? "text-emerald-500" : "text-zinc-700")}>{stat.trend}</span>
                                <span className="hidden sm:inline text-[7px]">Institutional Sync Active</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-3.5 sm:space-y-8">
                    {/* Courses / Subjects */}
                    <Card className="bg-white/30 dark:bg-zinc-950/30 backdrop-blur-2xl border-zinc-200 dark:border-zinc-900 rounded-xl sm:rounded-[2.5rem] overflow-hidden border-t-zinc-800/10 shadow-2xl">
                        <CardHeader className="p-3.5 sm:p-6 md:p-10 border-b border-zinc-200 dark:border-zinc-900/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 sm:gap-5">
                                    <div className="p-2 sm:p-4 bg-eduGreen-950/20 rounded-lg sm:rounded-2xl border border-eduGreen-900/30">
                                        <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-eduGreen-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm sm:text-2xl font-medium text-zinc-900 dark:text-white tracking-tight leading-none">Intelligence Metrics</CardTitle>
                                        <CardDescription className="text-[8px] sm:text-[9px] font-medium uppercase tracking-widest text-zinc-600 mt-1 sm:mt-2">Active Subject Enrollment</CardDescription>
                                    </div>
                                </div>
                                <Link href="/dashboard/student/grades">
                                    <Button variant="ghost" className="text-[8px] sm:text-[10px] font-medium uppercase tracking-widest text-zinc-600 hover:text-zinc-900 dark:hover:text-white group p-1.5 sm:p-4 h-7 sm:h-auto">
                                        Curriculum <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3.5 sm:p-6 md:p-10">
                            <div className="grid gap-2.5 sm:gap-6">
                                {studentData?.subjectStats?.map((subject: any, idx: number) => (
                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-7 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-lg sm:rounded-[2rem] border border-zinc-200 dark:border-zinc-900 group hover:border-eduGreen-900/30 transition-all gap-2 sm:gap-8">
                                        <div className="flex items-center gap-2.5 sm:gap-5">
                                            <div className="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 flex items-center justify-center font-medium text-eduGreen-500 shadow-lg group-hover:border-eduGreen-900/20 transition-all text-xs sm:text-base shrink-0">
                                                {subject.name[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-medium text-zinc-900 dark:text-white text-xs sm:text-lg tracking-tight truncate">{subject.name}</h4>
                                                <p className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5 truncate">{subject.teacher}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-10 mt-1 sm:mt-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-zinc-200/50 dark:border-zinc-800/50">
                                            <div className="text-left sm:text-right">
                                                <p className="text-[7px] sm:text-[8px] font-medium text-zinc-700 uppercase tracking-widest mb-0.5">Mean Grade</p>
                                                <p className="text-xs sm:text-xl font-medium text-eduGreen-500">{subject.gradeLabel}</p>
                                            </div>
                                            <div className="text-left sm:text-right">
                                                <p className="text-[7px] sm:text-[8px] font-medium text-zinc-700 uppercase tracking-widest mb-0.5">Performance</p>
                                                <p className="text-xs sm:text-xl font-medium text-zinc-900 dark:text-white">{Math.round(subject.avgGrade)}%</p>
                                            </div>
                                            <Link href="/dashboard/student/grades">
                                                <Button size="icon" variant="ghost" className="text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-lg sm:rounded-xl transition-all h-6 w-6 sm:h-10 sm:w-10">
                                                    <ArrowRight className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                                {(studentData?.subjectStats?.length || 0) === 0 && (
                                    <div className="text-center py-6 sm:py-20 text-zinc-800 dark:text-zinc-200 font-medium uppercase tracking-[0.3em] text-[10px] sm:text-xs">No Academic Units Linked</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar area */}
                <div className="lg:col-span-4 space-y-3.5 sm:space-y-8">
                    {/* My Schedule Preview */}
                    <Card className="bg-white/30 dark:bg-zinc-950/30 backdrop-blur-2xl border-zinc-200 dark:border-zinc-900 rounded-xl sm:rounded-[2.5rem] overflow-hidden border-t-zinc-800/10 shadow-2xl">
                        <CardHeader className="p-3.5 sm:p-6 md:p-10 pb-2 sm:pb-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-eduGreen-500" />
                                <CardTitle className="text-[10px] sm:text-xs font-medium text-zinc-900 dark:text-white uppercase tracking-widest">Upcoming Session</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="px-3.5 sm:px-6 md:px-10 pb-3.5 sm:pb-6 md:pb-10">
                            {studentData?.nextSession ? (
                                <div className="p-3 sm:p-6 bg-eduGreen-600 rounded-lg sm:rounded-[2rem] border border-eduGreen-500/50 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-300 dark:bg-white/10 blur-[40px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-300" />
                                    <div className="relative z-10">
                                        <div className="text-[7px] sm:text-[9px] font-medium text-eduGreen-200 uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-1.5 sm:mb-4 leading-none">
                                            {studentData.nextSession.startsIn < 60
                                                ? `Starting in ${studentData.nextSession.startsIn} Minutes`
                                                : `Starts at ${studentData.nextSession.startTime}`}
                                        </div>
                                        <h4 className="text-sm sm:text-xl font-medium text-zinc-900 dark:text-white tracking-tight leading-tight">{studentData.nextSession.subjectName}</h4>
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-eduGreen-200 text-[8px] sm:text-[10px] font-medium mt-1.5 sm:mt-3 uppercase tracking-widest">
                                            <LayoutDashboard className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                            <span>Room {studentData.nextSession.room}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 sm:p-8 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-xl sm:rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center">
                                    <p className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest">No Sessions Imminent</p>
                                </div>
                            )}
                            <Link href="/dashboard/student/timetable">
                                <Button variant="ghost" className="w-full mt-2.5 sm:mt-8 text-[8px] sm:text-[10px] font-medium uppercase tracking-widest text-zinc-600 hover:text-zinc-900 dark:hover:text-white group h-7 sm:h-auto">
                                    Full Schedule <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1.5 sm:ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <UpcomingEventsWidget />
                </div>
            </div>
        </div>
    );
}

