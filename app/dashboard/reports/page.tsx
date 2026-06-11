"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Users, BookOpen, Download, Filter, Sparkles, ShieldCheck, ChevronRight, Activity, UserCircle, Search, DollarSign, History } from "lucide-react";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedGrade, setSelectedGrade] = useState("ALL");
    const [selectedClass, setSelectedClass] = useState("ALL");

    useEffect(() => {
        fetchAnalytics();
        fetch('/api/school/students')
            .then(r => r.json())
            .then((d: any) => setStudents(d.students || []))
            .finally(() => setLoadingStudents(false));
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/school/analytics');
            const result = await res.json();
            setData(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const exportCoreData = () => {
        if (!data) return;

        const headers = ["Category", "Metric", "Value"];
        const rows = [
            ["Summary", "Average Attendance", data.summary?.avgAttendance || "100%"],
            ["Summary", "Syllabus Saturation", data.summary?.examCompletion || "0%"],
            ["Summary", "Active Nodes", data.summary?.activeNodes || "0"],
            ["Summary", "Active Readers", data.summary?.activeReaders || "0"],
            ["Architecture", "School Name", data.summary?.schoolInfo?.name || ""],
            ["Architecture", "School Code", data.summary?.schoolInfo?.schoolCode || ""],
            ["Architecture", "Status", data.summary?.schoolInfo?.status || ""],
            ["Architecture", "System Domain", data.summary?.schoolInfo?.domain || "unassigned"],
            ["Architecture", "Genesis Date", data.summary?.schoolInfo?.createdAt ? new Date(data.summary.schoolInfo.createdAt).toLocaleDateString() : ""],
            ...(data.userRole === 'SUPERADMIN' ? [
                ["Financial", "Capital Acquired", `$${data.summary?.collectedFees || 0}`],
                ["Financial", "Pending Clearances", `$${data.summary?.pendingFees || 0}`]
            ] : []),
            ...data.performanceBySubject?.map((s: any) => ["Academic Performance", s.name, `${s.avg?.toFixed(1) || 0}%`]) || [],
            ...data.teacherWorkload?.map((t: any) => ["Faculty Overload", t.name, `${t.periods} Weekly Periods`]) || []
        ];

        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `LUCY_Institutional_Core_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <SpringingLoader message="Synthesizing Institutional Intelligence" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-900 pb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-white">
                        Predictive <span className="text-eduGreen-500 italic">Analytics</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Institutional Intelligence & Performance Synthesis</p>
                </div>

                <div className="flex items-center gap-4 mb-2">
                    <Button 
                        onClick={() => setShowFilters(!showFilters)}
                        variant="outline" 
                        className={cn(
                            "rounded-2xl border-zinc-900 bg-zinc-950/50 hover:border-eduGreen-500/30 transition-all h-12 px-6 text-[10px] font-medium uppercase tracking-widest text-zinc-500",
                            showFilters && "border-eduGreen-500/50 text-eduGreen-500 bg-eduGreen-500/5"
                        )}
                    >
                        <Filter className="w-4 h-4 mr-2" /> Filter Stream
                    </Button>
                    <Button
                        onClick={exportCoreData}
                        className="bg-eduGreen-600 text-white hover:bg-eduGreen-500 h-12 px-8 rounded-2xl font-medium text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95 shadow-eduGreen-900/20"
                    >
                        <Download className="w-4 h-4 mr-2" /> Export Core
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link href="/dashboard/reports/attendance" className="block group">
                    <Card className="bg-zinc-950/40 backdrop-blur-xl border-zinc-900 rounded-[2.5rem]  group-hover:border-eduGreen-900/50 transition-all border-t-zinc-800/20 shadow-2xl h-full">
                        <CardContent className="p-8">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 group-hover:border-eduGreen-900/30 transition-all">
                                    <TrendingUp className="w-5 h-5 text-eduGreen-500" />
                                </div>
                            </div>
                            <div className="text-4xl font-medium text-white mb-1 tracking-tighter">{data.summary?.avgAttendance || "100%"}</div>
                            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest flex items-center justify-between">
                                Attendance Velocity
                                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="bg-zinc-950/40 backdrop-blur-md border-zinc-900 rounded-[2.5rem] group h-full">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 group-hover:border-eduGreen-900/30 transition-all">
                                <BookOpen className="w-5 h-5 text-emerald-500" />
                            </div>
                        </div>
                        <div className="text-4xl font-medium text-white mb-1 tracking-tighter">{data.summary?.examCompletion || "0%"}</div>
                        <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Syllabus Saturation</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-950/40 backdrop-blur-md border-zinc-900 rounded-[2.5rem] group h-full">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 group-hover:border-eduGreen-900/30 transition-all">
                                <Activity className="w-5 h-5 text-cyan-500" />
                            </div>
                        </div>
                        <div className="text-4xl font-medium text-white mb-1 tracking-tighter">{data.summary?.activeNodes || "0"}</div>
                        <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Active Nodes</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-950/40 backdrop-blur-md border-zinc-900 rounded-[2.5rem] group h-full">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 group-hover:border-eduGreen-900/30 transition-all">
                                <Users className="w-5 h-5 text-amber-500" />
                            </div>
                        </div>
                        <div className="text-4xl font-medium text-white mb-1 tracking-tighter">{data.summary?.activeReaders || "0"}</div>
                        <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Active Readers</p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Analytics Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Attendance Trends */}
                <Card className="bg-zinc-950/40 backdrop-blur-xl border-zinc-900 rounded-[3rem] border-t-zinc-800/20 shadow-2xl">
                    <CardHeader className="p-6 md:p-10 border-b border-zinc-900/50">
                        <CardTitle className="text-2xl font-medium text-white tracking-tight">Attendance Trajectory</CardTitle>
                        <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">5-day historical synthesis</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 md:p-10 flex items-end justify-between h-64 gap-2">
                        {data.attendance?.length > 0 ? data.attendance.map((a: any, i: number) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-4 group h-full justify-end">
                                <span className="text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">{a.rate.toFixed(0)}%</span>
                                <div className="w-full bg-zinc-900 rounded-t-xl relative overflow-hidden group-hover:bg-zinc-800 transition-colors" style={{ height: '100%', minHeight: '10px' }}>
                                    <div 
                                        className="absolute bottom-0 w-full bg-gradient-to-t from-eduGreen-600 to-emerald-400 rounded-t-xl shadow-[0_0_15px_rgba(20,122,82,0.3)] transition-all duration-1000 ease-out" 
                                        style={{ height: `${a.rate}%` }} 
                                    />
                                </div>
                                <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-widest">{a.date}</span>
                            </div>
                        )) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600 uppercase tracking-widest font-medium">No Recent Data</div>
                        )}
                    </CardContent>
                </Card>

                {/* Financial Synthesis (Admin Only) */}
                {data.userRole === 'SUPERADMIN' ? (
                    <Card className="bg-zinc-950/40 backdrop-blur-xl border-zinc-900 rounded-[3rem] border-t-zinc-800/20 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                        <CardHeader className="p-6 md:p-10 border-b border-zinc-900/50 relative z-10">
                            <CardTitle className="text-2xl font-medium text-white tracking-tight flex items-center justify-between">
                                Financial Synthesis
                                <span className="text-[9px] font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Admin</span>
                            </CardTitle>
                            <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Institutional revenue flows</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 md:p-10 space-y-10 relative z-10">
                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Capital Acquired</span>
                                    <span className="text-4xl font-medium text-white tracking-tighter">${data.summary?.collectedFees?.toLocaleString() || "0"}</span>
                                </div>
                                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                                    <div className="h-full bg-emerald-500 rounded-full w-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Pending Clearances</span>
                                    <span className="text-4xl font-medium text-white tracking-tighter">${data.summary?.pendingFees?.toLocaleString() || "0"}</span>
                                </div>
                                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                                    <div className="h-full bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)]" style={{ width: (data.summary?.collectedFees + data.summary?.pendingFees) > 0 ? `${(data.summary.pendingFees / (data.summary.collectedFees + data.summary.pendingFees)) * 100}%` : '0%' }} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-zinc-950/40 backdrop-blur-xl border-zinc-900 rounded-[3rem] border-t-zinc-800/20 shadow-2xl flex flex-col">
                         <CardHeader className="p-6 md:p-10 border-b border-zinc-900/50">
                            <CardTitle className="text-2xl font-medium text-white tracking-tight">Institutional Action Stream</CardTitle>
                            <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Real-time systemic updates</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 md:p-10 flex-1 overflow-y-auto max-h-[300px] space-y-4">
                            {data.recentActivity?.map((act: any) => (
                                <div key={act.id} className="flex gap-4 items-start p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                                        <History className="w-4 h-4 text-eduGreen-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white font-medium"><span className="text-eduGreen-400">{act.user}</span> {act.action.toLowerCase()} <span className="text-zinc-400">{act.resource.toLowerCase()}</span></p>
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

            <div className="grid lg:grid-cols-12 gap-8">
                {/* School Architecture */}
                <Card className="lg:col-span-4 bg-zinc-950/40 backdrop-blur-xl border-zinc-900 rounded-[3rem] border-t-zinc-800/20 shadow-2xl flex flex-col">
                    <CardHeader className="p-8 border-b border-zinc-900/50">
                        <CardTitle className="text-lg font-medium text-white tracking-tight uppercase tracking-widest text-[10px]">Institutional Architecture</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex-1">
                        <div className="space-y-5">
                            <div className="flex justify-between items-center border-b border-zinc-900/50 pb-3">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Core Node</span>
                                <span className="text-xs text-white font-medium">{data.summary?.schoolInfo?.name}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-zinc-900/50 pb-3">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Access Code</span>
                                <span className="text-[10px] text-eduGreen-400 font-mono bg-eduGreen-950/20 px-2 py-0.5 rounded-lg">{data.summary?.schoolInfo?.schoolCode}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-zinc-900/50 pb-3">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Domain Space</span>
                                <span className="text-[10px] text-zinc-400 font-medium">{data.summary?.schoolInfo?.domain || "Unassigned"}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-zinc-900/50 pb-3">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">System State</span>
                                <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-widest font-medium">{data.summary?.schoolInfo?.status}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Genesis Date</span>
                                <span className="text-[10px] text-zinc-400 font-medium">{data.summary?.schoolInfo?.createdAt ? new Date(data.summary.schoolInfo.createdAt).toLocaleDateString() : ""}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Performance by Subject */}
                <Card className="lg:col-span-5 bg-zinc-950/40 backdrop-blur-xl border-zinc-900 rounded-[3rem]  border-t-zinc-800/20 shadow-2xl">
                    <CardHeader className="p-6 md:p-8 border-b border-zinc-900/50">
                        <CardTitle className="text-xl font-medium text-white tracking-tight">Academic Index</CardTitle>
                        <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Mean subject progression</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8">
                        <div className="space-y-6">
                            {data?.performanceBySubject?.map((s: any, i: number) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-medium uppercase tracking-widest">
                                        <span className="text-zinc-400">{s.name}</span>
                                        <span className="text-white">{s.avg?.toFixed(1) || 0}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                                        <div
                                            className="h-full bg-gradient-to-r from-eduGreen-600 to-emerald-400 rounded-full transition-all duration-300"
                                            style={{ width: `${s.avg || 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Faculty Load */}
                <Card className="lg:col-span-3 bg-zinc-950/40 backdrop-blur-xl border-zinc-900 rounded-[3rem]  border-t-zinc-800/20 shadow-2xl flex flex-col">
                    <CardHeader className="p-8 border-b border-zinc-900/50">
                        <CardTitle className="text-lg font-medium text-white tracking-tight uppercase tracking-widest text-[10px]">Faculty Overload Pulse</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex-1 flex flex-col">
                        <div className="space-y-4 flex-1">
                            {data?.teacherWorkload?.map((t: any, i: number) => (
                                <div key={i} className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900 hover:border-eduGreen-900/30 transition-all flex items-center justify-between group">
                                    <div>
                                        <h5 className="font-medium text-xs text-zinc-100 group-hover:text-white transition-colors">{t.name}</h5>
                                        <p className="text-[8px] font-medium text-zinc-600 uppercase tracking-widest mt-1">{t.periods} Weekly Periods</p>
                                    </div>
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        t.periods > 25 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-eduGreen-500 shadow-[0_0_10px_rgba(33,201,141,0.5)]"
                                    )} />
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full mt-4 text-[9px] font-medium uppercase tracking-widest text-zinc-600 hover:text-white group">
                            Full Resource Map <ChevronRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Alert */}
            <div className="p-6 md:p-10 bg-eduGreen-950/10 border border-eduGreen-900/20 rounded-[3rem] flex flex-col md:flex-row md:items-center gap-6 md:gap-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-eduGreen-500/5 blur-3xl rounded-full" />
                <div className="w-16 md:w-20 h-16 md:h-20 rounded-[2rem] bg-zinc-950 border border-zinc-900 flex items-center justify-center shrink-0 shadow-2xl group-hover:scale-110 transition-transform">
                    <Sparkles className="w-10 h-10 text-eduGreen-500 animate-pulse" />
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="w-4 h-4 text-eduGreen-500" />
                        <h4 className="text-xs font-medium text-white uppercase tracking-widest italic">Neural Insights <span className="not-italic opacity-40 ml-1">Beta</span></h4>
                    </div>
                    <p className="text-[10px] font-medium text-zinc-600 leading-relaxed uppercase max-w-2xl">
                        {data?.performanceBySubject?.length > 0 ? (
                            <>
                                AI-driven correlation identifies that <span className="text-white">
                                    {data.performanceBySubject.reduce((min: any, s: any) => (s.avg < min.avg ? s : min), data.performanceBySubject[0]).name}
                                </span> shows high variance this cycle. Institutional resource reallocation is suggested to stabilize performance.
                            </>
                        ) : (
                            "Institutional grid synchronization active. Real-time predictive metrics will appear once sufficient academic records are aggregated."
                        )}
                    </p>
                </div>
            </div>
            {/* Student Report Drilldown */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
                    <div>
                        <h2 className="text-2xl font-medium text-white tracking-tight">Student Report Cards</h2>
                        <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-[9px] mt-1">Individual academic synthesis</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {showFilters && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Select value={selectedGrade} onValueChange={(val) => { setSelectedGrade(val); setSelectedClass("ALL"); }}>
                                    <SelectTrigger className="h-11 bg-zinc-950 border border-zinc-900 rounded-2xl text-xs w-32 text-zinc-400">
                                        <SelectValue placeholder="Grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Grades</SelectItem>
                                        {Array.from(new Set(students.map(s => s.grade?.name))).filter(Boolean).sort().map(gradeName => (
                                            <SelectItem key={gradeName as string} value={gradeName as string}>{gradeName as string}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedClass} onValueChange={setSelectedClass} disabled={selectedGrade === "ALL"}>
                                    <SelectTrigger className="h-11 bg-zinc-950 border border-zinc-900 rounded-2xl text-xs w-32 text-zinc-400">
                                        <SelectValue placeholder="Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Classes</SelectItem>
                                        {Array.from(new Set(students.filter(s => selectedGrade === "ALL" || s.grade?.name === selectedGrade).map(s => s.class?.name))).filter(Boolean).sort().map(className => (
                                            <SelectItem key={className as string} value={className as string}>{className as string}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                                className="h-11 bg-zinc-950 border border-zinc-900 rounded-2xl pl-10 pr-4 text-white text-xs focus:outline-none focus:ring-1 focus:ring-eduGreen-500 w-full md:w-64"
                            />
                        </div>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loadingStudents ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-24 bg-zinc-900/30 rounded-3xl animate-pulse border border-zinc-900" />
                        ))
                    ) : (
                        students
                            .filter((s: any) => {
                                const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                    s.studentCode?.toLowerCase().includes(studentSearch.toLowerCase());
                                const matchesGrade = selectedGrade === "ALL" || s.grade?.name === selectedGrade;
                                const matchesClass = selectedClass === "ALL" || s.class?.name === selectedClass;
                                return matchesSearch && matchesGrade && matchesClass;
                            })
                            .slice(0, 48)
                            .map((s: any) => (
                                <Link key={s.id} href={`/dashboard/reports/${s.id}`} className="group">
                                    <Card className="bg-zinc-950/40 border-zinc-900 rounded-3xl hover:border-eduGreen-900/40 transition-all">
                                        <CardContent className="p-5 flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-eduGreen-950/30 border border-eduGreen-900/30 flex items-center justify-center text-lg font-black text-eduGreen-500 shrink-0 group-hover:border-eduGreen-700/50 transition-colors">
                                                {s.firstName?.[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white font-medium text-sm truncate">{s.firstName} {s.lastName}</p>
                                                <p className="text-zinc-600 text-[9px] uppercase tracking-widest font-mono mt-0.5">{s.studentCode}</p>
                                                <p className="text-zinc-700 text-[9px] mt-0.5">{s.class?.name} · {s.grade?.name}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-eduGreen-500 ml-auto shrink-0 transition-colors" />
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))
                    )}
                </div>
            </div>
        </div>
    );
}

