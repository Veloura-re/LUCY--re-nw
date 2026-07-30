"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BarChart, FileText, Calendar as CalendarIcon, ArrowRight, Sparkles, Brain, Search, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";

function ExamsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get("tab") === "dossier" ? "dossier" : "registry";

    const setActiveTab = (tab: string) => {
        router.push(`/dashboard/teacher/exams?tab=${tab}`);
    };
    const [exams, setExams] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [registryLoading, setRegistryLoading] = useState(false);

    // Form State
    const [newExam, setNewExam] = useState({ title: "", classId: "", subjectId: "", date: "", maxScore: "100", duration: "", isLocked: true });
    const [selectedClassSubjects, setSelectedClassSubjects] = useState<any[]>([]);

    // Dossier State
    const [dossierStudents, setDossierStudents] = useState<any[]>([]);
    const [dossierLoading, setDossierLoading] = useState(false);
    const [dossierSearch, setDossierSearch] = useState("");
    const [dossierSubjectId, setDossierSubjectId] = useState("");

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (newExam.classId && classes.length) {
            fetchExams(newExam.classId);
            fetchDossierStudents(newExam.classId);
            // Filter subjects for this class from teacher's assignments
            const subjects = classes
                .filter(c => c.classId === newExam.classId)
                .map(c => ({ id: c.subjectId, name: c.subjectName }));
            // Dedupe by name
            const unique = subjects.filter((s, i, a) => a.findIndex(t => t.name === s.name) === i);
            setSelectedClassSubjects(unique);

            // Auto-select first subject for the dossier
            if (unique.length > 0) {
                setDossierSubjectId(unique[0].id);
            } else {
                setDossierSubjectId("");
            }
        }
    }, [newExam.classId, classes]);

    const fetchDossierStudents = async (classId: string) => {
        setDossierLoading(true);
        try {
            const res = await fetch(`/api/school/students?classId=${classId}`);
            const data = (await res.json()) as any;
            if (data.students) {
                setDossierStudents(data.students);
            } else {
                setDossierStudents([]);
            }
        } catch (err) {
            console.error("Failed to fetch students for class dossier:", err);
            setDossierStudents([]);
        } finally {
            setDossierLoading(false);
        }
    };

    const fetchClasses = async () => {
        const res = await fetch('/api/teacher/classes');
        const data = (await res.json()) as any;
        if (data.classes) setClasses(data.classes);
        // Auto-select first class?
        if (data.classes.length > 0) {
            setNewExam(prev => ({ ...prev, classId: data.classes[0].classId }));
        }
    };

    const fetchExams = async (classId: string) => {
        setRegistryLoading(true);
        try {
            const res = await fetch(`/api/teacher/exams?classId=${classId}`);
            const data = (await res.json()) as any;
            if (data.exams) setExams(data.exams);
        } catch (e) {
            console.error(e);
        } finally {
            setRegistryLoading(false);
        }
    };

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            await fetch('/api/teacher/exams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newExam)
            });
            setIsCreating(false);
            setNewExam({ ...newExam, title: "", date: "", duration: "" });
            if (newExam.classId) fetchExams(newExam.classId);
        } finally {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setCreateLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (dossierStudents.length === 0) return;
        
        const currentSubject = classes.find(c => c.subjectId === dossierSubjectId)?.subjectName || "Subject";
        const className = classes.find(c => c.classId === newExam.classId)?.className || "Class";
        
        const subjectExams = exams.filter(e => e.subjectId === dossierSubjectId);
        const sortedSubjectExams = [...subjectExams].sort((a, b) => {
            const dateA = a.dueAt ? new Date(a.dueAt).getTime() : new Date(a.createdAt).getTime();
            const dateB = b.dueAt ? new Date(b.dueAt).getTime() : new Date(b.createdAt).getTime();
            return dateA - dateB;
        });
        
        const headers = ["Student Name", "Student Code", ...sortedSubjectExams.map(e => `${e.title} (Max: ${e.totalMarks || e.config?.maxScore || 100})`), "Subject Average (%)"];
        
        const filteredStudents = dossierStudents.filter(student => {
            const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
            return fullName.includes(dossierSearch.toLowerCase()) || student.studentCode?.toLowerCase().includes(dossierSearch.toLowerCase());
        });

        const rows = filteredStudents.map(student => {
            const rowData: string[] = [
                `${student.firstName} ${student.lastName}`,
                student.studentCode || ""
            ];
            
            let totalScore = 0;
            let totalMax = 0;
            
            sortedSubjectExams.forEach(exam => {
                const record = exam.gradeRecords?.find((r: any) => r.studentId === student.id)
                    || exam.attempts?.find((a: any) => a.studentId === student.id);
                const max = exam.totalMarks || exam.config?.maxScore || 100;
                
                if (record) {
                    rowData.push(record.score.toString());
                    totalScore += record.score;
                    totalMax += max;
                } else {
                    const isPastDue = exam.dueAt ? new Date(exam.dueAt) < new Date() : false;
                    if (isPastDue) {
                        rowData.push("0");
                        totalMax += max;
                    } else {
                        rowData.push("-");
                    }
                }
            });
            
            const average = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : "N/A";
            rowData.push(average);
            return rowData;
        });
        
        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
        ].join("\n");
        
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Dossier_${className.replace(/\s+/g, '_')}_${currentSubject.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const subjectExams = exams.filter(e => e.subjectId === dossierSubjectId);
    const sortedSubjectExams = [...subjectExams].sort((a, b) => {
        const dateA = a.dueAt ? new Date(a.dueAt).getTime() : new Date(a.createdAt).getTime();
        const dateB = b.dueAt ? new Date(b.dueAt).getTime() : new Date(b.createdAt).getTime();
        return dateA - dateB;
    });

    const filteredStudents = dossierStudents.filter(student => {
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
        return fullName.includes(dossierSearch.toLowerCase()) || student.studentCode?.toLowerCase().includes(dossierSearch.toLowerCase());
    });

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10 pb-40">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white uppercase italic">
                        Academic <span className="text-eduGreen-500 not-italic">Progress</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-[10px] mt-3">Institutional Examination & Assessment Terminal</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/teacher/exams/create?mode=ai" passHref>
                        <Button
                            variant="outline"
                            className="border-zinc-300 dark:border-zinc-800 text-purple-400 hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-900 h-14 px-8 rounded-2xl font-medium text-[10px] uppercase tracking-widest transition-all mb-1 gap-2"
                        >
                            <Sparkles className="h-4 w-4" /> Start Writing
                        </Button>
                    </Link>
                    <Link href="/dashboard/teacher/exams/create" passHref>
                        <Button
                            className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-14 px-10 rounded-2xl font-medium text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95 mb-1 shadow-eduGreen-900/20 gap-2"
                        >
                            <Plus className="h-4 w-4" /> Add Exam
                        </Button>
                    </Link>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900/60 pb-6">
                    {/* Class Selector Tab/Filter */}
                    <div className="flex bg-white dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-900 shadow-2xl w-fit">
                        {classes.filter((c, i, a) => a.findIndex(t => t.classId === c.classId) === i).map((cls) => (
                            <button
                                key={cls.classId}
                                onClick={() => setNewExam({ ...newExam, classId: cls.classId })}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all",
                                    newExam.classId === cls.classId
                                        ? "bg-eduGreen-600 text-white shadow-lg shadow-eduGreen-900/20"
                                        : "text-zinc-600 hover:text-white"
                                )}
                            >
                                {cls.className}
                            </button>
                        ))}
                    </div>

                    <TabsList className="bg-white dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-900 shadow-2xl">
                        <TabsTrigger value="registry">Exam Registry</TabsTrigger>
                        <TabsTrigger value="dossier">Class Dossier</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="registry" className="space-y-8">
                    {registryLoading ? (
                        <div className="py-20 flex justify-center items-center scale-90">
                            <SpringingLoader message="Retrieving Exam Registry" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {exams.map((exam) => (
                            <Card key={exam.id} className="group relative bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 hover:border-eduGreen-900/30 transition-all rounded-[2.5rem]  shadow-2xl border-t-zinc-800/10">
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-eduGreen-600 via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="absolute top-6 left-10">
                                    {exam.isPublished ? (
                                        <span className="text-[8px] font-medium px-3 py-1 bg-eduGreen-950/20 border border-eduGreen-900/30 text-eduGreen-500 rounded-lg uppercase tracking-widest">
                                            Published
                                        </span>
                                    ) : exam.isLocked ? (
                                        <span className="text-[8px] font-medium px-3 py-1 bg-amber-950/20 border border-amber-900/30 text-amber-500 rounded-lg uppercase tracking-widest">
                                            Graded / Locked
                                        </span>
                                    ) : new Date(exam.dueAt) < new Date() ? (
                                        <span className="text-[8px] font-medium px-3 py-1 bg-red-950/20 border border-red-900/30 text-red-500 rounded-lg uppercase tracking-widest">
                                            Pending Grades
                                        </span>
                                    ) : (
                                        <span className="text-[8px] font-medium px-3 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-500 rounded-lg uppercase tracking-widest">
                                            Active / Upcoming
                                        </span>
                                    )}
                                </div>

                                <div className="absolute top-6 right-8">
                                    <span className="text-[8px] font-medium px-3 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-500 rounded-lg uppercase tracking-widest group-hover:border-eduGreen-900/30 transition-all">
                                        {exam.subject?.name}
                                    </span>
                                </div>

                                <CardHeader className="p-10 pb-4">
                                    <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight leading-tight group-hover:text-eduGreen-500 transition-colors pt-4">
                                        {exam.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-10 pt-0 space-y-8">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-zinc-500 font-medium text-[10px] uppercase tracking-[0.2em]">
                                            <CalendarIcon className="w-4 h-4 text-zinc-800" />
                                            {exam.dueAt ? new Date(exam.dueAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Pending Assignment'}
                                        </div>
                                        <div className="flex items-center gap-3 text-zinc-500 font-medium text-[10px] uppercase tracking-[0.2em]">
                                            <BarChart className="w-4 h-4 text-zinc-800" />
                                            Max Quantum: {exam.totalMarks || exam.config?.maxScore || 100}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Link href={`/dashboard/teacher/exams/${exam.id}/editor`} passHref>
                                            <Button variant="outline" className="w-full h-14 border-zinc-300 dark:border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-900 font-medium text-[10px] uppercase tracking-widest rounded-2xl group/edit overflow-hidden relative">
                                                <div className="absolute inset-0 bg-purple-500/5 group-hover/edit:bg-purple-500/10 transition-colors" />
                                                <span className="relative z-10 flex items-center gap-2">
                                                    <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Neural Editor
                                                </span>
                                            </Button>
                                        </Link>
                                        <Link href={`/dashboard/teacher/gradebook/${exam.id}`} passHref>
                                            <Button className="w-full h-14 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all rounded-2xl group-hover:border-eduGreen-900/20 group-hover:bg-white dark:bg-zinc-950">
                                                Registry Hub <Brain className="ml-2 w-3.5 h-3.5 text-eduGreen-500" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {exams.length === 0 && (
                            <div className="col-span-full py-40 rounded-[3rem] border-4 border-dashed border-zinc-200 dark:border-zinc-900/50 flex flex-col items-center justify-center text-zinc-800 gap-6">
                                <div className="p-6 bg-white dark:bg-zinc-950 rounded-full border border-zinc-200 dark:border-zinc-900 opacity-20">
                                    <FileText className="w-12 h-12" />
                                </div>
                                <p className="font-medium uppercase tracking-[0.4em] text-xs italic">No Institutional Assessments Harvested</p>
                            </div>
                        )}
                    </div>
                )}
                </TabsContent>

                <TabsContent value="dossier" className="space-y-8">
                    {/* Controls */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-900/60 p-6 rounded-3xl backdrop-blur-xl">
                        <div className="flex flex-wrap items-center gap-4">
                            {selectedClassSubjects.length > 1 ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Subject:</span>
                                    <Select value={dossierSubjectId} onValueChange={setDossierSubjectId}>
                                        <SelectTrigger className="h-11 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-900 rounded-xl px-4 font-medium text-xs text-zinc-900 dark:text-white focus:ring-0 focus:border-eduGreen-600 transition-all w-48">
                                            <SelectValue placeholder="Select Subject" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-2xl shadow-3xl">
                                            {selectedClassSubjects.map((s: any) => (
                                                <SelectItem
                                                    key={s.id}
                                                    value={s.id}
                                                    className="hover:bg-zinc-200 dark:hover:bg-zinc-900 focus:bg-zinc-100 dark:bg-zinc-900 rounded-xl m-1 py-2 text-zinc-600 dark:text-zinc-400 focus:text-zinc-900 dark:text-white transition-all font-medium uppercase tracking-widest text-[9px]"
                                                >
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : selectedClassSubjects.length === 1 ? (
                                <div className="flex items-center gap-2 bg-zinc-100/40 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-800/60 px-4 py-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 font-medium uppercase tracking-wider text-[10px]">
                                    Subject Focus: <span className="text-zinc-900 dark:text-white font-semibold">{selectedClassSubjects[0].name}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-zinc-100/40 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-800/60 px-4 py-2.5 rounded-xl text-zinc-500 font-medium uppercase tracking-wider text-[10px]">
                                    No Subject Focus Assigned
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                <Input
                                    placeholder="Search student..."
                                    value={dossierSearch}
                                    onChange={e => setDossierSearch(e.target.value)}
                                    className="h-11 pl-11 w-64 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-900 rounded-xl focus:border-eduGreen-600 transition-all font-medium text-xs text-zinc-900 dark:text-white placeholder:text-zinc-700"
                                />
                            </div>

                            <Button
                                onClick={handleExportCSV}
                                disabled={dossierStudents.length === 0}
                                variant="outline"
                                className="border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-900 h-11 px-5 rounded-xl font-medium text-[10px] uppercase tracking-widest transition-all gap-2"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export CSV
                            </Button>
                        </div>
                    </div>

                    {/* Loader */}
                    {dossierLoading ? (
                        <div className="py-20 flex justify-center items-center scale-90">
                            <SpringingLoader message="Synthesizing Class Dossier" />
                        </div>
                    ) : dossierStudents.length === 0 ? (
                        <div className="py-32 rounded-[2.5rem] border-4 border-dashed border-zinc-200 dark:border-zinc-900/50 flex flex-col items-center justify-center text-zinc-800 gap-6">
                            <div className="p-6 bg-white dark:bg-zinc-950 rounded-full border border-zinc-200 dark:border-zinc-900 opacity-20">
                                <FileText className="w-12 h-12" />
                            </div>
                            <p className="font-medium uppercase tracking-[0.4em] text-xs italic">No Enrolled Students Harvested</p>
                        </div>
                    ) : sortedSubjectExams.length === 0 ? (
                        <div className="py-32 rounded-[2.5rem] border-4 border-dashed border-zinc-200 dark:border-zinc-900/50 flex flex-col items-center justify-center text-zinc-800 gap-6">
                            <div className="p-6 bg-white dark:bg-zinc-950 rounded-full border border-zinc-200 dark:border-zinc-900 opacity-20">
                                <FileText className="w-12 h-12" />
                            </div>
                            <p className="font-medium uppercase tracking-[0.4em] text-xs italic">No Exams Configured for Selected Subject</p>
                        </div>
                    ) : (
                        <div className="rounded-[2.5rem] border border-zinc-200 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-900/80 bg-white/60 dark:bg-zinc-950/60">
                                            <th className="py-5 px-8 font-medium text-[10px] uppercase tracking-[0.2em] text-zinc-500 min-w-[220px]">Student Name</th>
                                            <th className="py-5 px-8 font-medium text-[10px] uppercase tracking-[0.2em] text-zinc-500 min-w-[140px]">Student Code</th>
                                            {sortedSubjectExams.map(exam => (
                                                <th key={exam.id} className="py-5 px-6 font-medium text-[10px] uppercase tracking-[0.2em] text-zinc-500 min-w-[170px] text-center border-l border-zinc-200 dark:border-zinc-900/40">
                                                    <Link href={`/dashboard/teacher/gradebook/${exam.id}`} className="hover:text-eduGreen-500 transition-colors block">
                                                        <div className="truncate max-w-[150px] font-semibold">{exam.title}</div>
                                                        <div className="text-[8px] text-zinc-600 mt-1.5 font-normal tracking-widest uppercase">
                                                            MAX: {exam.totalMarks || exam.config?.maxScore || 100} PTS
                                                        </div>
                                                    </Link>
                                                </th>
                                            ))}
                                            <th className="py-5 px-8 font-medium text-[10px] uppercase tracking-[0.2em] text-zinc-500 min-w-[160px] text-center border-l border-zinc-200 dark:border-zinc-900/40 bg-white/50 dark:bg-zinc-950/50">
                                                Subject Average
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900/30">
                                        {filteredStudents.map(student => {
                                            let totalScore = 0;
                                            let totalMax = 0;
                                            
                                            return (
                                                <tr key={student.id} className="hover:bg-zinc-200 dark:hover:bg-zinc-900/10 transition-colors group">
                                                    <td className="py-5 px-8 font-medium text-sm text-zinc-700 dark:text-zinc-300">
                                                        <Link href={`/dashboard/students/${student.id}`} className="hover:text-eduGreen-500 transition-colors flex items-center gap-2">
                                                            {student.firstName} {student.lastName}
                                                            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-eduGreen-500" />
                                                        </Link>
                                                    </td>
                                                    <td className="py-5 px-8 text-xs text-zinc-500 font-mono tracking-wider">
                                                        {student.studentCode}
                                                    </td>
                                                    {sortedSubjectExams.map(exam => {
                                                        const record = exam.gradeRecords?.find((r: any) => r.studentId === student.id)
                                                            || exam.attempts?.find((a: any) => a.studentId === student.id);
                                                        const max = exam.totalMarks || exam.config?.maxScore || 100;
                                                        const isPastDue = exam.dueAt ? new Date(exam.dueAt) < new Date() : false;
                                                        
                                                        let cellText = "-";
                                                        let pct = 0;
                                                        let colorClass = "text-zinc-600 bg-zinc-100/10 dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-900/30";
                                                        
                                                        if (record) {
                                                            pct = (record.score / max) * 100;
                                                            cellText = `${record.score}/${max}`;
                                                            totalScore += record.score;
                                                            totalMax += max;
                                                            
                                                            if (pct >= 80) {
                                                                colorClass = "text-emerald-400 bg-emerald-500/5 border-emerald-500/10";
                                                            } else if (pct >= 60) {
                                                                colorClass = "text-blue-400 bg-blue-500/5 border-blue-500/10";
                                                            } else if (pct >= 40) {
                                                                colorClass = "text-amber-400 bg-amber-500/5 border-amber-500/10";
                                                            } else {
                                                                colorClass = "text-rose-400 bg-rose-500/5 border-rose-500/10";
                                                            }
                                                        } else if (isPastDue) {
                                                            cellText = `0/${max}`;
                                                            totalMax += max;
                                                            colorClass = "text-rose-500 bg-rose-950/10 border-rose-900/20 font-semibold";
                                                        }
                                                        
                                                        return (
                                                            <td key={exam.id} className="py-4 px-6 border-l border-zinc-200 dark:border-zinc-900/40 text-center">
                                                                <div className={cn(
                                                                    "inline-flex items-center justify-center px-3 py-1.5 rounded-lg border text-xs font-medium tracking-wide min-w-[75px]",
                                                                    colorClass
                                                                )}>
                                                                    {cellText === "-" ? (
                                                                        <span className="text-[9px] text-zinc-700 tracking-widest font-normal uppercase">Pending</span>
                                                                    ) : (
                                                                        cellText
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    
                                                    {/* Running Average */}
                                                    {(() => {
                                                        const average = totalMax > 0 ? (totalScore / totalMax) * 100 : null;
                                                        let colorClass = "text-zinc-600 bg-zinc-100/10 dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-900/30";
                                                        if (average !== null) {
                                                            if (average >= 80) {
                                                                colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]";
                                                            } else if (average >= 60) {
                                                                colorClass = "text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.15)]";
                                                            } else if (average >= 40) {
                                                                colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)]";
                                                            } else {
                                                                colorClass = "text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)]";
                                                            }
                                                        }
                                                        return (
                                                            <td className="py-4 px-8 border-l border-zinc-200 dark:border-zinc-900/40 text-center bg-white/30 dark:bg-zinc-950/30 font-semibold">
                                                                <div className={cn(
                                                                    "inline-flex items-center justify-center px-4 py-2 rounded-xl border text-sm font-bold tracking-tight min-w-[90px]",
                                                                    colorClass
                                                                )}>
                                                                    {average !== null ? `${average.toFixed(1)}%` : "N/A"}
                                                                </div>
                                                            </td>
                                                        );
                                                    })()}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[85vh] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-3xl border-zinc-200 dark:border-zinc-900 rounded-[3rem] p-0 overflow-y-auto shadow-[0_0_100px_-20px_rgba(31,210,135,0.1)]">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-eduGreen-600 to-transparent opacity-50" />

                    <DialogHeader className="p-12 pb-8 border-b border-zinc-200 dark:border-zinc-900/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-eduGreen-950/20 rounded-xl border border-eduGreen-900/30 text-eduGreen-500">
                                <Plus className="w-6 h-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-3xl font-medium text-zinc-900 dark:text-white tracking-tighter uppercase italic">
                                    New <span className="text-eduGreen-500 not-italic">Assessment</span>
                                </DialogTitle>
                                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600 mt-1">Establishing academic measuring protocol</p>
                            </div>
                        </div>
                    </DialogHeader>

                    {createLoading ? (
                        <div className="py-20 flex justify-center items-center scale-90">
                            <SpringingLoader message="Initializing Assessment Matrix" />
                        </div>
                    ) : (
                        <form onSubmit={handleCreateExam} className="p-12 space-y-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest ml-1">Assessment Label</label>
                                <Input
                                    placeholder="e.g. Neural Networks Midterm"
                                    value={newExam.title}
                                    onChange={e => setNewExam({ ...newExam, title: e.target.value })}
                                    required
                                    className="h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-900 rounded-2xl focus:border-eduGreen-600 transition-all font-medium text-lg text-zinc-900 dark:text-white placeholder:text-zinc-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest ml-1">Subject Focus</label>
                                    <Select onValueChange={(val: string) => setNewExam({ ...newExam, subjectId: val })}>
                                        <SelectTrigger className="h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-900 rounded-2xl px-6 font-medium text-zinc-900 dark:text-white focus:ring-0 focus:border-eduGreen-600 transition-all">
                                            <SelectValue placeholder="Select Target Subject" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-2xl shadow-3xl">
                                            {selectedClassSubjects.map((s: any) => (
                                                <SelectItem
                                                    key={s.id}
                                                    value={s.id}
                                                    className="hover:bg-zinc-200 dark:hover:bg-zinc-900 focus:bg-zinc-100 dark:bg-zinc-900 rounded-xl m-1 py-3 text-zinc-600 dark:text-zinc-400 focus:text-zinc-900 dark:text-white transition-all font-medium uppercase tracking-widest text-[10px]"
                                                >
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest ml-1">Deadline Date</label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-eduGreen-600" />
                                        <Input
                                            type="date"
                                            value={newExam.date}
                                            onChange={e => setNewExam({ ...newExam, date: e.target.value })}
                                            required
                                            className="h-14 pl-14 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-900 rounded-2xl focus:border-eduGreen-600 transition-all font-medium uppercase text-xs tracking-widest text-zinc-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest ml-1">Time Limit (Minutes)</label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 45"
                                        value={newExam.duration}
                                        onChange={e => setNewExam({ ...newExam, duration: e.target.value })}
                                        className="h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-900 rounded-2xl focus:border-eduGreen-600 transition-all font-medium text-lg text-zinc-900 dark:text-white placeholder:text-zinc-700"
                                    />
                                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1">Leave empty for untimed exams</p>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest ml-1">Lock Status</label>
                                    <button
                                        type="button"
                                        onClick={() => setNewExam({ ...newExam, isLocked: !newExam.isLocked })}
                                        className={cn(
                                            "w-full h-14 rounded-2xl border flex items-center justify-center gap-3 font-medium text-[10px] uppercase tracking-widest transition-all",
                                            newExam.isLocked 
                                                ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                                                : "bg-eduGreen-500/10 border-eduGreen-500/30 text-eduGreen-500"
                                        )}
                                    >
                                        {newExam.isLocked ? "🔒 Exam is Locked (Hidden)" : "🔓 Exam is Unlocked (Visible)"}
                                    </button>
                                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1">Locked exams cannot be taken until deployed</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={createLoading}
                                    onClick={() => setIsCreating(false)}
                                    className="h-16 flex-1 border border-zinc-200 dark:border-zinc-900 text-zinc-600 hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-2xl font-medium text-[10px] uppercase tracking-[0.2em] transition-all"
                                >
                                    Abort Protocol
                                </Button>
                                <Button
                                    type="submit"
                                    isLoading={createLoading}
                                    className="h-16 flex-[2] bg-white text-black hover:bg-zinc-200 rounded-2xl font-medium text-[10px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-white/5 active:scale-[0.98]"
                                >
                                    Authorize Assessment hub
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function ExamsPage() {
    return (
        <Suspense fallback={
            <div className="max-w-5xl mx-auto py-40 flex flex-col items-center justify-center scale-90">
                <SpringingLoader message="Initializing Assessment Matrix" />
            </div>
        }>
            <ExamsPageContent />
        </Suspense>
    );
}

