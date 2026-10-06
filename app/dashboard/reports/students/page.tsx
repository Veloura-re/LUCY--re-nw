"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, Filter, UserCircle, FileText } from "lucide-react";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function StudentReportsPage() {
    const router = useRouter();
    const [students, setStudents] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [selectedGrade, setSelectedGrade] = useState("ALL");
    const [selectedClass, setSelectedClass] = useState("ALL");

    useEffect(() => {
        fetch('/api/school/students')
            .then(res => {
                if (res.status === 403) {
                    router.push('/dashboard/reports');
                    return null;
                }
                return res.json();
            })
            .then((d: any) => {
                if (d) setStudents(d.students || []);
            })
            .catch(() => {})
            .finally(() => setLoadingStudents(false));
    }, [router]);

    if (loadingStudents) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <SpringingLoader message="Aggregating Scholar Records" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Student <span className="text-eduGreen-500 italic">Reports</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Individual Academic Synthesis &amp; Profiles</p>
                </div>
            </div>

            {/* Student Report Drilldown */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-900 pb-6">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-zinc-600 dark:text-zinc-500" />
                        <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Filter Stream</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Select value={selectedGrade} onValueChange={(val) => { setSelectedGrade(val); setSelectedClass("ALL"); }}>
                                <SelectTrigger className="h-11 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl text-xs w-32 text-zinc-600 dark:text-zinc-400 focus:ring-1 focus:ring-eduGreen-500">
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
                                <SelectTrigger className="h-11 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl text-xs w-32 text-zinc-600 dark:text-zinc-400 focus:ring-1 focus:ring-eduGreen-500">
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
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input
                                type="text"
                                placeholder="Search scholars..."
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                                className="h-11 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl pl-10 pr-4 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-eduGreen-500 w-full md:w-64 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {students
                        .filter((s: any) => {
                            const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                s.studentCode?.toLowerCase().includes(studentSearch.toLowerCase());
                            const matchesGrade = selectedGrade === "ALL" || s.grade?.name === selectedGrade;
                            const matchesClass = selectedClass === "ALL" || s.class?.name === selectedClass;
                            return matchesSearch && matchesGrade && matchesClass;
                        })
                        .map((s: any) => (
                            <Card key={s.id} className="bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-900 rounded-3xl hover:border-eduGreen-900/40 transition-all p-5 flex flex-col justify-between group">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3.5">
                                        {s.photoUrl ? (
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0">
                                                <img src={s.photoUrl} alt={s.firstName} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-2xl bg-eduGreen-950/30 border border-eduGreen-900/30 flex items-center justify-center text-lg font-black text-eduGreen-500 shrink-0 group-hover:border-eduGreen-700/50 transition-colors">
                                                {s.firstName?.[0] || "S"}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-zinc-900 dark:text-white font-medium text-sm truncate">{s.firstName} {s.lastName}</p>
                                            <p className="text-zinc-600 text-[9px] uppercase tracking-widest font-mono mt-0.5">{s.studentCode || "NO-ID"}</p>
                                            <p className="text-zinc-700 dark:text-zinc-400 text-[9px] mt-0.5 truncate">{s.class?.name || "Unassigned"} · {s.grade?.name || "Unassigned"}</p>
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
            </div>
        </div>
    );
}
