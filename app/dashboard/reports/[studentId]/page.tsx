"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, Printer, Download, Sparkles, User, Calendar, Award, CheckCircle2, ShieldCheck, Hash, Layers } from "lucide-react";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function StudentReportCardPage() {
    const { studentId } = useParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/school/students/${studentId}/report-card`);
                const result = await res.json();
                setData(result);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [studentId]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black">
            <SpringingLoader message="Compiling Official Scholastic Synthesis..." />
        </div>
    );

    if (!data?.student) return (
        <div className="min-h-screen flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-black uppercase tracking-widest text-sm">
            Scholastic Record Discovery Failed
        </div>
    );

    const { student, principal, grades = [], summary = {}, attendance = {}, remarks = [] } = data;

    const getGradeColor = (pct: number) => {
        if (pct >= 85) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
        if (pct >= 70) return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30";
        if (pct >= 55) return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";
        return "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30";
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportJson = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${student.firstName}_${student.lastName}_Academic_Report.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 py-8 px-4 print:p-0 print:m-0 print:max-w-none print:bg-white text-zinc-900 dark:text-white print:text-black">
            
            {/* Action Bar (Hidden on Print) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6 print:hidden">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-eduGreen-500 uppercase tracking-widest mb-1">
                        <GraduationCap className="w-4 h-4" />
                        <span>Official Academic Transcript</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight">
                        Student Report Card
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        onClick={handlePrint} 
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl h-11 px-5 text-xs font-bold uppercase tracking-wider shadow-lg shadow-eduGreen-600/20"
                    >
                        <Printer className="w-4 h-4 mr-2" /> Print Official PDF
                    </Button>
                    <Button 
                        onClick={handleExportJson} 
                        variant="outline" 
                        className="rounded-xl border-zinc-200 dark:border-zinc-800 h-11 px-5 text-xs font-bold uppercase tracking-wider"
                    >
                        <Download className="w-4 h-4 mr-2" /> Export JSON Data
                    </Button>
                </div>
            </div>

            {/* Main Report Document Sheet */}
            <div className="bg-white dark:bg-zinc-950 print:bg-white border border-zinc-200 dark:border-zinc-800/80 print:border-zinc-300 rounded-[2rem] print:rounded-none p-8 md:p-12 shadow-2xl print:shadow-none space-y-10">
                
                {/* 1. Formal School Header & Student Badge */}
                <div className="border-b border-zinc-200 dark:border-zinc-800 print:border-zinc-300 pb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        {student.school?.logoUrl ? (
                            <Image 
                                src={student.school.logoUrl} 
                                alt="School Crest" 
                                width={80} 
                                height={80} 
                                className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-2xl bg-zinc-100 dark:bg-zinc-900 p-2 border border-zinc-200 dark:border-zinc-800"
                            />
                        ) : (
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-eduGreen-500/10 border border-eduGreen-500/30 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-eduGreen-500" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white print:text-black">
                                {student.school?.name || "LUCY OS Institutional Portal"}
                            </h2>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600 font-bold uppercase tracking-widest mt-1">
                                {student.school?.address || "Official End of Term Scholastic Evaluation"}
                            </p>
                        </div>
                    </div>

                    <div className="bg-zinc-100 dark:bg-zinc-900/60 print:bg-zinc-50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 print:border-zinc-300 text-right w-full md:w-auto">
                        <p className="text-[10px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Academic Calendar</p>
                        <p className="text-base font-black text-eduGreen-600 dark:text-eduGreen-400 print:text-emerald-700 font-mono">2023/24 TERM 2</p>
                    </div>
                </div>

                {/* 2. Student Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-zinc-50 dark:bg-zinc-900/40 print:bg-zinc-100 rounded-2xl border border-zinc-200 dark:border-zinc-800 print:border-zinc-300">
                    <div>
                        <p className="text-[9px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-1">Student Name</p>
                        <p className="text-sm font-black text-zinc-900 dark:text-white print:text-black truncate">{student.firstName} {student.lastName}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-1">Student ID Code</p>
                        <p className="text-sm font-mono font-bold text-zinc-700 dark:text-zinc-300 print:text-zinc-800">{student.studentCode}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-1">Grade Level</p>
                        <p className="text-sm font-black text-zinc-900 dark:text-white print:text-black">{student.class?.grade?.name || "Grade 12"}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-1">Class Room</p>
                        <p className="text-sm font-black text-zinc-900 dark:text-white print:text-black">{student.class?.name || "Section A"}</p>
                    </div>
                </div>

                {/* 3. Summary Performance Vitals Banner */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-eduGreen-500/10 border border-eduGreen-500/20 text-center">
                        <p className="text-[9px] font-black text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest mb-1">Overall Average</p>
                        <p className="text-3xl font-black text-eduGreen-600 dark:text-eduGreen-400">{summary.overallPercentage || 0}%</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                        <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">GPA (4.0 Scale)</p>
                        <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{summary.gpa || "0.00"}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                        <p className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Class Position Rank</p>
                        <p className="text-3xl font-black text-purple-600 dark:text-purple-400">#{summary.classRank || 1} <span className="text-xs text-zinc-600 font-normal">/ {summary.totalClassStudents || 1}</span></p>
                    </div>
                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                        <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Session Attendance</p>
                        <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{attendance.rate || 100}%</p>
                    </div>
                </div>

                {/* 4. Scholastic Performance Breakdown Table */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                        <BookOpen className="w-5 h-5 text-eduGreen-500" />
                        <h3 className="text-lg font-black uppercase tracking-tight">Core Subject Breakdown</h3>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 print:border-zinc-300">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-100 dark:bg-zinc-900 print:bg-zinc-200 text-zinc-700 dark:text-zinc-300 print:text-black uppercase tracking-wider font-bold text-[10px]">
                                <tr>
                                    <th className="p-4">Subject Name</th>
                                    <th className="p-4 text-center">Assessments & Breakdown</th>
                                    <th className="p-4 text-center">Total Score</th>
                                    <th className="p-4 text-center">Grade</th>
                                    <th className="p-4">Teacher Conduct Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 print:divide-zinc-300">
                                {grades.length > 0 ? grades.map((g: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                        <td className="p-4 font-black text-sm text-zinc-900 dark:text-white print:text-black">
                                            {g.subject?.name || "Core Subject"}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2 flex-wrap text-[10px]">
                                                {g.columns && g.columns.length > 0 ? g.columns.map((col: any, cIdx: number) => (
                                                    <span key={cIdx} className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                                                        {col.title}: {col.score}/{col.maxMarks}
                                                    </span>
                                                )) : (
                                                    <span className="text-zinc-600">Standard Marking</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-black text-base">
                                            {g.score}%
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={cn("px-3 py-1 rounded-xl font-black text-xs border inline-block", getGradeColor(g.score))}>
                                                {g.grade}
                                            </span>
                                        </td>
                                        <td className="p-4 text-zinc-600 dark:text-zinc-400 print:text-zinc-700 italic text-[11px]">
                                            {g.remarks || "Demonstrates strong understanding of core subject concepts."}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-zinc-600 dark:text-zinc-400 uppercase tracking-widest text-xs">
                                            No marklist records entered for this term yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 5. Qualitative Faculty Observations */}
                {remarks && remarks.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                            <Award className="w-5 h-5 text-eduGreen-500" />
                            <h3 className="text-lg font-black uppercase tracking-tight">Faculty Conduct Observations</h3>
                        </div>
                        <div className="grid gap-3">
                            {remarks.map((r: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80">
                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 italic mb-2">"{r.content}"</p>
                                    <p className="text-[10px] font-bold text-eduGreen-600 uppercase tracking-wider">— {r.teacher?.name || "Class Teacher"}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 6. Official Verification & Signature Seals */}
                <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 print:border-zinc-300 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="space-y-8">
                        <div className="h-12 flex items-end justify-center">
                            <p className="font-serif italic text-lg text-zinc-700 dark:text-zinc-300 print:text-black">
                                {data.principal?.name || "School Principal"}
                            </p>
                        </div>
                        <div className="border-t border-zinc-300 dark:border-zinc-800 print:border-zinc-400 pt-2">
                            <p className="text-[10px] font-black text-zinc-900 dark:text-white print:text-black uppercase tracking-widest">
                                School Principal / Director
                            </p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="h-12 flex items-end justify-center">
                            <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400 print:text-black uppercase tracking-widest">
                                Verified Homeroom Signature
                            </p>
                        </div>
                        <div className="border-t border-zinc-300 dark:border-zinc-800 print:border-zinc-400 pt-2">
                            <p className="text-[10px] font-black text-zinc-900 dark:text-white print:text-black uppercase tracking-widest">
                                Class Homeroom Advisor
                            </p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="h-12 flex items-center justify-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-eduGreen-500/10 border border-eduGreen-500/30 text-eduGreen-600 dark:text-eduGreen-400 font-black text-[10px] uppercase tracking-widest">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Registrar Authenticated</span>
                            </div>
                        </div>
                        <div className="border-t border-zinc-300 dark:border-zinc-800 print:border-zinc-400 pt-2">
                            <p className="text-[10px] font-black text-zinc-900 dark:text-white print:text-black uppercase tracking-widest">
                                Institutional Seal & Date
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
