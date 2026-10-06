"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    BarChart3, TrendingUp, Users, BookOpen, Download, 
    Filter, Sparkles, ShieldCheck, ChevronRight, Activity, 
    UserCircle, Search, DollarSign, History, FileText, 
    GraduationCap, ArrowUpRight
} from "lucide-react";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedGrade, setSelectedGrade] = useState("ALL");
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/school/analytics');
            if (res.status === 403) {
                // Try fetching parent's children instead
                const parentRes = await fetch('/api/parent/children');
                if (parentRes.ok) {
                    const result = (await parentRes.json()) as any;
                    setData({ isParent: true, students: result.students || [] });
                    return;
                }
            }
            if (res.ok) {
                const result = await res.json();
                setData(result);

                // Fetch institutional students for profile linking
                try {
                    setLoadingStudents(true);
                    const stRes = await fetch('/api/school/students');
                    if (stRes.ok) {
                        const stData = await stRes.json() as any;
                        setStudents(stData.students || []);
                    }
                } catch (stErr) {
                    console.error("Students list fetch failed", stErr);
                } finally {
                    setLoadingStudents(false);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <SpringingLoader message="Synthesizing Institutional Intelligence" />
            </div>
        );
    }

    if (data?.isParent) {
        return (
            <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white uppercase italic">
                            Scholar <span className="text-eduGreen-500 not-italic">Reports</span>
                        </h1>
                        <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Family Performance Synthesis & Report Cards</p>
                    </div>
                </div>

                {data.students?.length === 0 ? (
                    <div className="py-24 text-center bg-white/20 dark:bg-zinc-950/20 rounded-[3rem] border border-dashed border-zinc-200 dark:border-zinc-900">
                        <UserCircle className="w-16 h-16 text-zinc-800 dark:text-zinc-200 mx-auto mb-6" />
                        <p className="text-zinc-700 font-medium uppercase tracking-[0.3em] text-[10px]">No Student Profiles Linked to Terminal</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {data.students.map((student: any) => (
                            <Card key={student.id} className="group relative bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[3rem] overflow-hidden hover:border-eduGreen-900/40 transition-all border-t-zinc-800/10 shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-eduGreen-600 via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardContent className="p-8 space-y-6">
                                    <div className="flex items-center gap-4">
                                        {student.photoUrl ? (
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-zinc-300 dark:border-zinc-800 shrink-0">
                                                <img src={student.photoUrl} alt={student.firstName} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-300 dark:border-zinc-800 font-medium text-eduGreen-500 group-hover:border-eduGreen-900/20 transition-all shadow-xl">
                                                {student.firstName?.[0]}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-xl font-medium text-zinc-900 dark:text-white tracking-tight leading-none">{student.firstName} {student.lastName}</h3>
                                            <p className="text-[9px] font-mono font-medium text-zinc-600 uppercase tracking-widest mt-1.5">ID: {student.studentCode} • Grade {student.grade?.level || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-900/50 flex justify-between items-center gap-3">
                                        <div>
                                            <p className="text-[8px] font-medium text-zinc-700 uppercase tracking-widest">Academic Context</p>
                                            <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mt-1">{student.school?.name || "Institution"}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={`/dashboard/students/${student.id}`}>
                                                <Button variant="outline" className="h-10 px-3.5 rounded-xl font-semibold text-[10px] uppercase tracking-wider border-zinc-200 dark:border-zinc-800 hover:border-eduGreen-500 hover:text-eduGreen-500">
                                                    <UserCircle className="w-3.5 h-3.5 mr-1.5" /> Dossier
                                                </Button>
                                            </Link>
                                            <Link href={`/dashboard/reports/${student.id}`}>
                                                <Button className="h-10 px-4 bg-white text-black hover:bg-zinc-200 rounded-xl font-semibold text-[10px] uppercase tracking-widest transition-all">
                                                    Report Card <ChevronRight className="w-4 h-4 ml-1" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const filteredStudents = students.filter((s: any) => {
        const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
            s.studentCode?.toLowerCase().includes(studentSearch.toLowerCase());
        const matchesGrade = selectedGrade === "ALL" || s.grade?.name === selectedGrade;
        return matchesSearch && matchesGrade;
    });

    const gradeNames = Array.from(new Set(students.map(s => s.grade?.name))).filter(Boolean).sort() as string[];

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Predictive <span className="text-eduGreen-500 italic">Analytics</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Institutional Intelligence & Performance Synthesis</p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link href="/dashboard/reports/attendance" className="block group">
                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900 rounded-[2.5rem]  group-hover:border-eduGreen-900/50 transition-all border-t-zinc-800/20 shadow-2xl h-full">
                        <CardContent className="p-8">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-300 dark:border-zinc-800 group-hover:border-eduGreen-900/30 transition-all">
                                    <TrendingUp className="w-5 h-5 text-eduGreen-500" />
                                </div>
                            </div>
                            <div className="text-4xl font-medium text-zinc-900 dark:text-white mb-1 tracking-tighter">{data.summary?.avgAttendance || "100%"}</div>
                            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest flex items-center justify-between">
                                Attendance Velocity
                                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] group h-full">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-300 dark:border-zinc-800 group-hover:border-eduGreen-900/30 transition-all">
                                <BookOpen className="w-5 h-5 text-emerald-500" />
                            </div>
                        </div>
                        <div className="text-4xl font-medium text-zinc-900 dark:text-white mb-1 tracking-tighter">{data.summary?.examCompletion || "0%"}</div>
                        <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Syllabus Saturation</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] group h-full">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-300 dark:border-zinc-800 group-hover:border-eduGreen-900/30 transition-all">
                                <Activity className="w-5 h-5 text-cyan-500" />
                            </div>
                        </div>
                        <div className="text-4xl font-medium text-zinc-900 dark:text-white mb-1 tracking-tighter">{data.summary?.activeNodes || "0"}</div>
                        <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Active Nodes</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] group h-full">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-300 dark:border-zinc-800 group-hover:border-eduGreen-900/30 transition-all">
                                <Users className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                            </div>
                        </div>
                        <div className="text-4xl font-medium text-zinc-900 dark:text-white mb-1 tracking-tighter">{data.summary?.activeReaders || "0"}</div>
                        <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Active Readers</p>
                    </CardContent>
                </Card>
            </div>

            {/* Scholar Profiles & Direct Dossiers Section */}
            <div className="space-y-6 pt-2">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-900 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <GraduationCap className="w-5 h-5 text-eduGreen-500" />
                            <span className="text-[10px] font-bold text-eduGreen-500 uppercase tracking-widest">Dossier Profiles</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-zinc-900 dark:text-white">
                            Student Profiles &amp; Report Dossiers
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-500 text-xs mt-1">
                            Directly inspect individual scholar dossiers, transcripts, and official terminal report cards.
                        </p>
                    </div>
                    <Link href="/dashboard/reports/students" prefetch={false}>
                        <Button variant="outline" className="rounded-xl text-xs font-semibold uppercase tracking-wider px-4 border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500 hover:text-eduGreen-500">
                            Open Full Scholar Registry ({students.length}) <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search scholars by name or student ID..."
                            value={studentSearch}
                            onChange={e => setStudentSearch(e.target.value)}
                            className="h-11 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl pl-10 pr-4 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-eduGreen-500 w-full transition-all"
                        />
                    </div>
                    {gradeNames.length > 0 && (
                        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                            <SelectTrigger className="h-11 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl text-xs w-full sm:w-44 text-zinc-700 dark:text-zinc-300 focus:ring-1 focus:ring-eduGreen-500">
                                <SelectValue placeholder="Grade Filter" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                                <SelectItem value="ALL">All Grades ({students.length})</SelectItem>
                                {gradeNames.map(g => (
                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Students Cards Grid */}
                {loadingStudents ? (
                    <div className="py-16 text-center">
                        <SpringingLoader message="Retrieving Student Profiles" />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="py-16 text-center bg-white/20 dark:bg-zinc-950/20 rounded-[2.5rem] border border-dashed border-zinc-200 dark:border-zinc-900">
                        <UserCircle className="w-12 h-12 text-zinc-600 dark:text-zinc-400 mx-auto mb-3 opacity-40" />
                        <p className="text-zinc-600 font-medium uppercase tracking-widest text-xs">No Scholars Matching Query</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredStudents.slice(0, 6).map((s: any) => (
                            <Card key={s.id} className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-900/60 rounded-3xl p-5 hover:border-eduGreen-500/50 transition-all flex flex-col justify-between group shadow-xl">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3.5">
                                        {s.photoUrl ? (
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0">
                                                <img src={s.photoUrl} alt={s.firstName} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-2xl bg-eduGreen-950/30 border border-eduGreen-900/40 flex items-center justify-center text-lg font-bold text-eduGreen-500 shrink-0">
                                                {s.firstName?.[0] || "S"}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                                {s.firstName} {s.lastName}
                                            </h4>
                                            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">
                                                {s.studentCode || "NO-ID"}
                                            </p>
                                            <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">
                                                {s.class?.name || "Unassigned"} · {s.grade?.name || "Grade"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-900/40 mt-4 flex items-center gap-2">
                                    <Link href={`/dashboard/students/${s.id}`} className="flex-1">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full rounded-xl text-[10px] font-bold uppercase tracking-wider h-9 border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500 hover:text-eduGreen-500"
                                        >
                                            <UserCircle className="w-3.5 h-3.5 mr-1" /> Dossier
                                        </Button>
                                    </Link>
                                    <Link href={`/dashboard/reports/${s.id}`} className="flex-1">
                                        <Button 
                                            size="sm" 
                                            className="w-full rounded-xl text-[10px] font-bold uppercase tracking-wider h-9 bg-eduGreen-600 hover:bg-eduGreen-500 text-white"
                                        >
                                            <FileText className="w-3.5 h-3.5 mr-1" /> Report Card
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Secondary Analytics Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Attendance Trends */}
                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900 rounded-[3rem] border-t-zinc-800/20 shadow-2xl">
                    <CardHeader className="p-6 md:p-10 border-b border-zinc-200 dark:border-zinc-900/50">
                        <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight">Attendance Trajectory</CardTitle>
                        <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">5-day historical synthesis</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 md:p-10 flex items-end justify-between h-64 gap-2">
                        {data.attendance?.length > 0 ? data.attendance.map((a: any, i: number) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-4 group h-full justify-end">
                                <span className="text-[10px] font-medium text-zinc-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">{a.rate.toFixed(0)}%</span>
                                <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-t-xl relative overflow-hidden group-hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-colors" style={{ height: '100%', minHeight: '10px' }}>
                                    <div 
                                        className="absolute bottom-0 w-full bg-gradient-to-t from-eduGreen-600 to-emerald-400 rounded-t-xl shadow-[0_0_15px_rgba(20,122,82,0.3)] transition-all duration-1000 ease-out" 
                                        style={{ height: `${a.rate}%` }} 
                                    />
                                </div>
                                <span className="text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{a.date}</span>
                            </div>
                        )) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600 uppercase tracking-widest font-medium">No Recent Data</div>
                        )}
                    </CardContent>
                </Card>

                {/* Financial Synthesis (Admin Only) */}
                {data.userRole === 'SUPERADMIN' ? (
                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900 rounded-[3rem] border-t-zinc-800/20 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                        <CardHeader className="p-6 md:p-10 border-b border-zinc-200 dark:border-zinc-900/50 relative z-10">
                            <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight flex items-center justify-between">
                                Financial Synthesis
                                <span className="text-[9px] font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Admin</span>
                            </CardTitle>
                            <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Institutional revenue flows</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 md:p-10 space-y-10 relative z-10">
                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Capital Acquired</span>
                                    <span className="text-4xl font-medium text-zinc-900 dark:text-white tracking-tighter">${data.summary?.collectedFees?.toLocaleString() || "0"}</span>
                                </div>
                                <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-300 dark:border-zinc-800">
                                    <div className="h-full bg-emerald-500 rounded-full w-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Pending Clearances</span>
                                    <span className="text-4xl font-medium text-zinc-900 dark:text-white tracking-tighter">${data.summary?.pendingFees?.toLocaleString() || "0"}</span>
                                </div>
                                <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-300 dark:border-zinc-800">
                                    <div className="h-full bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)]" style={{ width: (data.summary?.collectedFees + data.summary?.pendingFees) > 0 ? `${(data.summary.pendingFees / (data.summary.collectedFees + data.summary.pendingFees)) * 100}%` : '0%' }} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900 rounded-[3rem] border-t-zinc-800/20 shadow-2xl flex flex-col">
                         <CardHeader className="p-6 md:p-10 border-b border-zinc-200 dark:border-zinc-900/50">
                            <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight">Institutional Action Stream</CardTitle>
                            <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Real-time systemic updates</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 md:p-10 flex-1 overflow-y-auto max-h-[300px] space-y-4">
                            {data.recentActivity?.map((act: any) => (
                                <div key={act.id} className="flex gap-4 items-start p-4 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200 dark:border-zinc-900">
                                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                        <History className="w-4 h-4 text-eduGreen-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-900 dark:text-white font-medium"><span className="text-eduGreen-400">{act.user}</span> {act.action.toLowerCase()} <span className="text-zinc-600 dark:text-zinc-400">{act.resource.toLowerCase()}</span></p>
                                        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-1">{new Date(act.time).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                            {(!data.recentActivity || data.recentActivity.length === 0) && (
                                <div className="text-center py-8">
                                    <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">No recent network activity</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Bottom Alert */}
            <div className="p-6 md:p-10 bg-eduGreen-950/10 border border-eduGreen-900/20 rounded-[3rem] flex flex-col md:flex-row md:items-center gap-6 md:gap-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-eduGreen-500/5 blur-3xl rounded-full" />
                <div className="w-16 md:w-20 h-16 md:h-20 rounded-[2rem] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 flex items-center justify-center shrink-0 shadow-2xl group-hover:scale-110 transition-transform">
                    <Sparkles className="w-10 h-10 text-eduGreen-500 animate-pulse" />
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="w-4 h-4 text-eduGreen-500" />
                        <h4 className="text-xs font-medium text-zinc-900 dark:text-white uppercase tracking-widest italic">Smart Insights <span className="not-italic opacity-40 ml-1">Beta</span></h4>
                    </div>
                    <p className="text-[10px] font-medium text-zinc-600 leading-relaxed uppercase max-w-2xl">
                        {data?.performanceBySubject?.length > 0 ? (
                            <>
                                AI-driven correlation identifies that <span className="text-zinc-900 dark:text-white">
                                    {data.performanceBySubject.reduce((min: any, s: any) => (s.avg < min.avg ? s : min), data.performanceBySubject[0]).name}
                                </span> shows high variance this cycle. Institutional resource reallocation is suggested to stabilize performance.
                            </>
                        ) : (
                            "Institutional grid synchronization active. Real-time predictive metrics will appear once sufficient academic records are aggregated."
                        )}
                    </p>
                </div>
            </div>

            {/* Student Report Drilldown Link */}
            <Link href="/dashboard/reports/students" className="block group">
                <div className="p-6 md:p-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-[3rem] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-eduGreen-900/50 transition-all">
                    <div>
                        <h2 className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight">Full Student Report Cards Directory</h2>
                        <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-[9px] mt-1">Browse all student marks, exam vitals & official grade transcripts</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0 group-hover:bg-eduGreen-600 transition-colors">
                        <ChevronRight className="w-5 h-5 text-zinc-900 dark:text-white" />
                    </div>
                </div>
            </Link>
        </div>
    );
}

