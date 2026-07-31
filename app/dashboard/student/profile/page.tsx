"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    GraduationCap, Calendar, BookOpen, CheckCircle2, XCircle,
    Clock, Loader2, School, User, Phone, MapPin, Award, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import Image from "next/image";
import SpringingLoader from "@/components/dashboard/springing-loader";

export default function StudentProfilePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/student/profile')
            .then(r => r.json())
            .then(d => setData(d))
            .catch(() => toast.error("Failed to load profile"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <SpringingLoader message="Querying Student Profile System..." />
        </div>
    );

    if (!data?.student) return (
        <div className="flex items-center justify-center min-h-[60vh] text-zinc-600 uppercase tracking-widest text-sm">
            Profile not found
        </div>
    );

    const { student, stats } = data;
    const attendancePct = parseFloat(stats?.attendancePct || "100");
    const avgScore = parseFloat(stats?.avgScore || "0");

    const attendanceColor = attendancePct >= 90 ? "text-eduGreen-500" : attendancePct >= 75 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
    const gradeColor = avgScore >= 80 ? "text-eduGreen-500" : avgScore >= 60 ? "text-blue-400" : avgScore >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        My <span className="text-eduGreen-500 italic">Profile</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Academic Identity Node</p>
                </div>
            </div>

            <div className="grid md:grid-cols-12 gap-8">
                {/* Identity Card */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] overflow-hidden">
                        <CardContent className="p-8 text-center">
                            <div className="relative inline-block mb-6">
                                {student.photoUrl ? (
                                    <div className="relative w-28 h-28 mx-auto">
                                        <Image src={student.photoUrl} alt="" fill sizes="112px" className="rounded-[2rem] object-cover border-2 border-zinc-300 dark:border-zinc-800" />
                                    </div>
                                ) : (
                                    <div className="w-28 h-28 rounded-[2rem] bg-eduGreen-950/30 border-2 border-eduGreen-900/30 flex items-center justify-center text-5xl font-black text-eduGreen-500 mx-auto">
                                        {student.firstName?.[0]}
                                    </div>
                                )}
                                <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-eduGreen-500 border-2 border-zinc-300 dark:border-zinc-950" />
                            </div>
                            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">{student.firstName} {student.lastName}</h2>
                            <Badge className="mt-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 font-mono text-[9px] tracking-widest">{student.studentCode}</Badge>

                            <div className="mt-6 space-y-3 text-left">
                                {[
                                    { icon: School, label: "School", val: student.school?.name },
                                    { icon: GraduationCap, label: "Grade", val: student.grade?.name },
                                    { icon: BookOpen, label: "Class", val: student.class?.name || "Unassigned" },
                                    { icon: User, label: "Homeroom", val: student.class?.homeroomTeacher?.name || "—" },
                                    { icon: Calendar, label: "Enrolled", val: student.enrolledAt ? format(new Date(student.enrolledAt), 'MMM yyyy') : "—" },
                                    ...(student.guardianName ? [{ icon: User, label: "Guardian", val: student.guardianName }] : []),
                                    ...(student.guardianPhone ? [{ icon: Phone, label: "Phone", val: student.guardianPhone }] : []),
                                    ...(student.address ? [{ icon: MapPin, label: "Address", val: student.address }] : []),
                                ].map(({ icon: Icon, label, val }) => (
                                    <div key={label} className="flex items-center gap-3 text-sm">
                                        <Icon className="w-4 h-4 text-zinc-700 shrink-0" />
                                        <span className="text-zinc-600 text-[10px] uppercase tracking-widest font-medium w-16 shrink-0">{label}</span>
                                        <span className="text-zinc-700 dark:text-zinc-300 text-[11px] font-medium truncate">{val || "—"}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 rounded-[2rem] text-center">
                            <CardContent className="p-6">
                                <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Attendance</p>
                                <p className={cn("text-3xl font-black tracking-tighter", attendanceColor)}>{attendancePct.toFixed(0)}%</p>
                                <p className="text-[8px] text-zinc-700 mt-1 uppercase tracking-widest">{stats.presentCount}/{stats.totalRecords} sessions</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 rounded-[2rem] text-center">
                            <CardContent className="p-6">
                                <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Avg Grade</p>
                                <p className={cn("text-3xl font-black tracking-tighter", gradeColor)}>{avgScore.toFixed(0)}%</p>
                                <p className="text-[8px] text-zinc-700 mt-1 uppercase tracking-widest">{student.gradeRecords?.length || 0} exams</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Grades + Authorization history */}
                <div className="md:col-span-8 space-y-8">
                    {/* Recent Grades */}
                    <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 rounded-[2.5rem]">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-3 mb-6 border-b border-zinc-200 dark:border-zinc-900 pb-4">
                                <Award className="w-5 h-5 text-eduGreen-500" />
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight">Recent Grades</h3>
                            </div>
                            {student.gradeRecords?.length > 0 ? (
                                <div className="space-y-3">
                                    {student.gradeRecords.map((g: any, i: number) => {
                                        const scoreColor = g.score >= 80 ? "text-eduGreen-500" : g.score >= 60 ? "text-blue-400" : g.score >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
                                        const grade = g.score >= 90 ? 'A+' : g.score >= 80 ? 'A' : g.score >= 70 ? 'B' : g.score >= 60 ? 'C' : g.score >= 50 ? 'D' : 'F';
                                        return (
                                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200 dark:border-zinc-900">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-xs font-black text-eduGreen-500">{g.subject?.name?.[0]}</div>
                                                    <div>
                                                        <p className="text-zinc-900 dark:text-white font-medium text-sm">{g.subject?.name}</p>
                                                        <p className="text-zinc-600 text-[9px] uppercase tracking-widest">{g.exam?.title}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={cn("text-xl font-black tracking-tighter", scoreColor)}>{g.score}%</span>
                                                    <Badge className={cn("text-[9px] font-black border", scoreColor, "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800")}>{grade}</Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center py-8 text-zinc-700 uppercase tracking-widest text-[10px]">No grade records yet</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Absence Permits */}
                    <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 rounded-[2.5rem]">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-3 mb-6 border-b border-zinc-200 dark:border-zinc-900 pb-4">
                                <CheckCircle2 className="w-5 h-5 text-eduGreen-500" />
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight">Recent Absence Permits</h3>
                            </div>
                            {student.absenceAuthorizations?.length > 0 ? (
                                <div className="space-y-3">
                                    {student.absenceAuthorizations.map((a: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200 dark:border-zinc-900">
                                            <div>
                                                <p className="text-zinc-900 dark:text-white font-medium text-sm">{a.reason || "No reason stated"}</p>
                                                <p className="text-zinc-600 text-[9px] uppercase tracking-widest mt-1">
                                                    {format(new Date(a.startDate), 'MMM dd')} → {format(new Date(a.endDate), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                            <Badge className={cn(
                                                "text-[9px] font-bold border uppercase tracking-widest",
                                                a.status === 'APPROVED' ? "bg-eduGreen-950/20 text-eduGreen-500 border-eduGreen-900/30" :
                                                    a.status === 'REJECTED' ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-500 border-red-200 dark:border-red-900/30" :
                                                        "bg-blue-950/20 text-blue-400 border-blue-900/30"
                                            )}>
                                                {a.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-8 text-zinc-700 uppercase tracking-widest text-[10px]">No absence permits on record</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
