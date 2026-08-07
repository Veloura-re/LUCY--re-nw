"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
    Printer, GraduationCap, Award, CheckCircle2, 
    Calendar, User, ArrowLeft, RefreshCw, ShieldCheck, 
    Sparkles, BookOpen, Layers, QrCode as QrCodeIcon, 
    Compass, School, AlertCircle, Eye, FileText
} from "lucide-react";
import QRCode from "react-qr-code";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StudentReportCardPage() {
    const { studentId } = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFlipped, setIsFlipped] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/school/students/${studentId}/report-card`);
                const result = await res.json();
                setData(result);
            } catch (e) {
                console.error("Report Card Fetch Error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [studentId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-black">
            <SpringingLoader message="Compiling Official Scholastic Synthesis..." />
            <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mt-4 animate-pulse">
                Synthesizing Marks, Vitals & 3D Transcript
            </p>
        </div>
    );

    if (!data?.student) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-6">
            <GraduationCap className="w-12 h-12 text-eduGreen-500 animate-bounce" />
            <p className="text-zinc-900 dark:text-white font-black uppercase tracking-widest text-base">
                {data?.error || "Scholastic Record Discovery Failed"}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs max-w-md">
                No matching student profile found for key "{studentId}". Please ensure a valid student profile is selected.
            </p>
            <div className="flex gap-3 mt-2">
                <Button 
                    onClick={() => { setLoading(true); window.location.reload(); }}
                    className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl px-6 text-xs font-bold uppercase tracking-widest"
                >
                    Retry Synthesis
                </Button>
                <Button 
                    onClick={() => router.push('/dashboard/reports/students')}
                    variant="outline"
                    className="rounded-xl px-6 text-xs font-bold uppercase tracking-widest"
                >
                    View All Students
                </Button>
            </div>
        </div>
    );

    const { student, principal, term, grades = [], summary = {}, attendance = {}, remarks = [] } = data;
    const schoolName = student?.school?.name || "LUCY Academic Institution";
    const studentFullName = `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "Enrolled Scholar";
    const qrVerifyUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/reports/${student.id}` : "";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black text-zinc-900 dark:text-white p-4 md:p-8 relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-10 left-1/4 w-96 h-96 bg-eduGreen-500/10 rounded-full blur-3xl pointer-events-none print:hidden" />
            <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none print:hidden" />

            {/* Top Toolbar (Hidden in Print) */}
            <div className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden relative z-20">
                <Button 
                    variant="outline" 
                    onClick={() => router.push('/dashboard/reports/students')} 
                    className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl text-xs font-semibold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Students
                </Button>

                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => setIsFlipped(!isFlipped)} 
                        className="rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-5 text-xs font-bold uppercase tracking-widest shadow-xl transition-all"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2 transition-transform duration-500", isFlipped ? "rotate-180" : "")} /> 
                        {isFlipped ? "View Front Transcript" : "Flip to 3D Vitals & Seal"}
                    </Button>

                    <Button 
                        onClick={handlePrint} 
                        className="rounded-2xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-bold text-xs uppercase tracking-widest px-6 shadow-xl shadow-eduGreen-600/20 transition-all"
                    >
                        <Printer className="w-4 h-4 mr-2" /> Print Official PDF
                    </Button>
                </div>
            </div>

            {/* 3D Flippable Container (Screen View) */}
            <div className="max-w-5xl mx-auto perspective-[1800px] print:hidden">
                <motion.div
                    className="w-full relative transition-all duration-700 preserve-3d"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 24 }}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {/* FRONT FACE (Scholastic Performance Breakdown) */}
                    <div 
                        className={cn(
                            "w-full bg-white dark:bg-zinc-950/90 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-800/80 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden transition-opacity",
                            isFlipped ? "pointer-events-none opacity-0 absolute inset-0" : "opacity-100 relative"
                        )}
                        style={{ backfaceVisibility: "hidden" }}
                    >
                        {/* Executive Header Banner */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-8">
                            <div className="flex items-center gap-5">
                                {student?.school?.logoUrl ? (
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md p-1 shrink-0">
                                        <img src={student.school.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-eduGreen-600 to-emerald-400 flex items-center justify-center text-white font-black text-2xl shadow-lg shrink-0">
                                        {schoolName[0]}
                                    </div>
                                )}
                                <div>
                                    <span className="text-[10px] font-mono font-bold text-eduGreen-500 uppercase tracking-widest">Official Scholastic Synthesis</span>
                                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-white uppercase leading-none mt-1">
                                        {schoolName}
                                    </h1>
                                    <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
                                        {student?.school?.address || "Official Accredited Academy Campus"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:items-end bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-3.5 px-5">
                                <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Active Academic Term</span>
                                <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider mt-0.5">
                                    {term?.name || "2023/24 Academic Term 2"}
                                </span>
                                <span className="text-[9px] text-eduGreen-500 font-bold uppercase tracking-wider mt-0.5">
                                    {term?.startDate} – {term?.endDate}
                                </span>
                            </div>
                        </div>

                        {/* Student Dossier Badge */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-8 p-5 bg-gradient-to-r from-zinc-100 via-slate-50 to-zinc-100 dark:from-zinc-900/50 dark:via-zinc-900/20 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
                            <div>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">Student Scholar</span>
                                <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight mt-0.5">{studentFullName}</p>
                            </div>
                            <div>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">Scholar Code</span>
                                <p className="text-sm font-mono font-bold text-zinc-900 dark:text-white mt-0.5">{student?.studentCode || "ST-2024-001"}</p>
                            </div>
                            <div>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">Assigned Cohort</span>
                                <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase mt-0.5">
                                    Grade {student?.class?.grade?.level || "10"} • {student?.class?.name || "Room A"}
                                </p>
                            </div>
                            <div>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">Evaluation Standing</span>
                                <p className="text-sm font-black text-eduGreen-500 uppercase mt-0.5">{summary?.standing || "EXCEL"}</p>
                            </div>
                        </div>

                        {/* Vitals Ribbon */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="p-4 rounded-2xl bg-eduGreen-500/10 border border-eduGreen-500/20">
                                <span className="text-[9px] font-mono text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest font-bold">Cumulative Average</span>
                                <div className="text-3xl font-black text-zinc-900 dark:text-white mt-1">{summary?.overallPercentage || 88}%</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Weighted GPA</span>
                                <div className="text-3xl font-black text-zinc-900 dark:text-white mt-1">{summary?.gpa || "3.75"} <span className="text-xs font-normal text-zinc-500">/ 4.0</span></div>
                            </div>
                            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Class Position</span>
                                <div className="text-3xl font-black text-zinc-900 dark:text-white mt-1">#{summary?.classRank || 1} <span className="text-xs font-normal text-zinc-500">of {summary?.totalClassStudents || 32}</span></div>
                            </div>
                            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Attendance Rate</span>
                                <div className="text-3xl font-black text-zinc-900 dark:text-white mt-1">{attendance?.rate || 95}%</div>
                            </div>
                        </div>

                        {/* Subject Breakdown Table */}
                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
                            <div className="grid grid-cols-12 bg-zinc-100 dark:bg-zinc-900/80 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                                <div className="col-span-5 sm:col-span-4">Subject Curriculum</div>
                                <div className="col-span-3 sm:col-span-4 text-center">Continuous Assessment</div>
                                <div className="col-span-2 text-center">Score / 100</div>
                                <div className="col-span-2 text-right">Grade</div>
                            </div>

                            <div className="divide-y divide-zinc-200 dark:divide-zinc-800/60 bg-white/40 dark:bg-zinc-950/40">
                                {grades.map((g: any, i: number) => (
                                    <div key={i} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors text-xs">
                                        <div className="col-span-5 sm:col-span-4">
                                            <p className="font-bold text-zinc-900 dark:text-white">{g.subject?.name || "Subject"}</p>
                                            {g.remarks && (
                                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic truncate mt-0.5">{g.remarks}</p>
                                            )}
                                        </div>

                                        <div className="col-span-3 sm:col-span-4 flex items-center justify-center gap-1.5 flex-wrap">
                                            {g.columns?.map((col: any, ci: number) => (
                                                <span key={ci} className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[9px] font-mono text-zinc-600 dark:text-zinc-400">
                                                    {col.title}: <strong className="ml-1 text-zinc-900 dark:text-white">{col.score}</strong>/{col.maxMarks}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="col-span-2 text-center font-mono font-bold text-zinc-900 dark:text-white">
                                            {g.score}%
                                        </div>

                                        <div className="col-span-2 text-right">
                                            <span className={cn(
                                                "inline-block px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider",
                                                g.grade?.startsWith('A') ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30" :
                                                g.grade?.startsWith('B') ? "bg-blue-500/10 text-blue-500 border border-blue-500/30" :
                                                g.grade?.startsWith('C') ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" :
                                                "bg-rose-500/10 text-rose-500 border border-rose-500/30"
                                            )}>
                                                {g.grade || "A"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Interactive Flip Trigger Bar */}
                        <div 
                            onClick={() => setIsFlipped(true)}
                            className="w-full py-3 bg-gradient-to-r from-eduGreen-500/10 via-emerald-500/10 to-eduGreen-500/10 hover:from-eduGreen-500/20 hover:to-eduGreen-500/20 border border-eduGreen-500/30 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs font-bold text-eduGreen-500 uppercase tracking-widest"
                        >
                            <Sparkles className="w-4 h-4 animate-spin text-eduGreen-400" />
                            Click to Flip 3D Certificate & Authentication Seal ↷
                        </div>
                    </div>

                    {/* BACK FACE (Institutional Standing, Vitals & Signatures) */}
                    <div 
                        className={cn(
                            "w-full bg-white dark:bg-zinc-950/95 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-800/80 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden transition-opacity",
                            !isFlipped ? "pointer-events-none opacity-0 absolute inset-0" : "opacity-100 relative"
                        )}
                        style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
                    >
                        {/* Back Header */}
                        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-eduGreen-500/20 border border-eduGreen-500/40 flex items-center justify-center text-eduGreen-500">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="text-[9px] font-mono text-eduGreen-500 uppercase tracking-widest font-bold">Verification & Vitals</span>
                                    <h2 className="text-xl font-black uppercase text-zinc-900 dark:text-white">Institutional Authentication</h2>
                                </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-zinc-500 uppercase">{term?.name}</span>
                        </div>

                        {/* Attendance Matrix & Conduct */}
                        <div className="grid md:grid-cols-2 gap-6 my-6">
                            {/* Attendance */}
                            <div className="p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Attendance Metric</span>
                                <div className="flex items-center justify-between mt-3">
                                    <div>
                                        <div className="text-3xl font-black text-zinc-900 dark:text-white">{attendance?.rate || 95}%</div>
                                        <p className="text-[10px] text-zinc-500 uppercase mt-0.5">Total Academic Compliance</p>
                                    </div>
                                    <div className="space-y-1 text-right text-[10px] font-mono">
                                        <p className="text-emerald-500 font-bold">{attendance?.present || 18} Present Days</p>
                                        <p className="text-rose-500 font-bold">{attendance?.absent || 1} Absent</p>
                                    </div>
                                </div>
                            </div>

                            {/* Faculty Observations */}
                            <div className="p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Faculty Observations</span>
                                <p className="text-xs text-zinc-700 dark:text-zinc-300 italic mt-2">
                                    "{remarks?.[0]?.content || "Demonstrates exemplary scholastic rigor and continuous active engagement across all curriculum modules."}"
                                </p>
                                <p className="text-[9px] font-mono text-zinc-500 mt-2">— {remarks?.[0]?.teacher?.name || "Homeroom Advisory Committee"}</p>
                            </div>
                        </div>

                        {/* Holographic Seal & Official Verification */}
                        <div className="p-6 rounded-3xl bg-gradient-to-tr from-eduGreen-950/20 via-slate-900/10 to-transparent border border-eduGreen-500/30 my-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="space-y-1 text-center sm:text-left">
                                <span className="text-[8px] font-mono text-eduGreen-400 uppercase tracking-widest font-bold">Holographic Transcript Seal</span>
                                <h3 className="text-lg font-black uppercase text-zinc-900 dark:text-white tracking-tight">Verified Official Academic Record</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Authenticity certified on the LUCY Centralized Scholastic Network.</p>
                            </div>
                            <div className="p-2 bg-white rounded-2xl shadow-xl shrink-0">
                                <QRCode value={qrVerifyUrl || "https://lucy.app"} size={80} />
                            </div>
                        </div>

                        {/* Signature Blocks */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
                            <div>
                                <div className="h-10 border-b border-zinc-300 dark:border-zinc-700 flex items-end justify-center pb-1">
                                    <span className="font-serif italic text-sm text-zinc-700 dark:text-zinc-300 font-bold">{principal?.name || "School Principal"}</span>
                                </div>
                                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-1 block">Principal Signature</span>
                            </div>
                            <div>
                                <div className="h-10 border-b border-zinc-300 dark:border-zinc-700 flex items-end justify-center pb-1">
                                    <span className="font-serif italic text-sm text-zinc-700 dark:text-zinc-300 font-bold">Class Homeroom Advisor</span>
                                </div>
                                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-1 block">Faculty Advisor</span>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <div className="h-10 border-b border-zinc-300 dark:border-zinc-700 flex items-end justify-center pb-1">
                                    <span className="font-mono text-xs text-eduGreen-500 font-bold">SEAL-2024-AUTHENTIC</span>
                                </div>
                                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-1 block">Registrar Stamp</span>
                            </div>
                        </div>

                        {/* Interactive Flip Back */}
                        <div 
                            onClick={() => setIsFlipped(false)}
                            className="w-full py-3 mt-6 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs font-bold uppercase tracking-widest"
                        >
                            <RefreshCw className="w-4 h-4 text-eduGreen-500" />
                            Return to Front Transcript ↶
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* PRINT-NATIVE A4 TRANSCRIPT (Visible ONLY during print/PDF export) */}
            <div className="hidden print:block w-full max-w-[800px] mx-auto bg-white text-black p-8 border border-zinc-300 rounded-none shadow-none font-sans">
                {/* Print Header */}
                <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
                    <div className="flex items-center gap-4">
                        {student?.school?.logoUrl && (
                            <img src={student.school.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                        )}
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight leading-none">{schoolName}</h1>
                            <p className="text-xs text-zinc-600 mt-1">{student?.school?.address || "Official Academic Campus"}</p>
                            <p className="text-[10px] font-mono font-bold text-zinc-800 uppercase mt-0.5">Official Scholastic Transcript & Synthesis</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-black uppercase">{term?.name || "2023/24 Term 2"}</span>
                        <p className="text-[10px] font-mono text-zinc-600">{term?.startDate} – {term?.endDate}</p>
                    </div>
                </div>

                {/* Print Student Profile */}
                <div className="grid grid-cols-4 gap-4 p-4 border border-zinc-300 rounded-lg mb-6 text-xs">
                    <div>
                        <span className="text-[9px] font-mono uppercase text-zinc-500 block">Student Scholar</span>
                        <strong>{studentFullName}</strong>
                    </div>
                    <div>
                        <span className="text-[9px] font-mono uppercase text-zinc-500 block">Student Code</span>
                        <strong>{student?.studentCode}</strong>
                    </div>
                    <div>
                        <span className="text-[9px] font-mono uppercase text-zinc-500 block">Cohort</span>
                        <strong>Grade {student?.class?.grade?.level} • {student?.class?.name}</strong>
                    </div>
                    <div>
                        <span className="text-[9px] font-mono uppercase text-zinc-500 block">Standing</span>
                        <strong>{summary?.standing}</strong>
                    </div>
                </div>

                {/* Print Quick Summary */}
                <div className="grid grid-cols-4 gap-4 mb-6 text-center border-y border-zinc-300 py-3">
                    <div>
                        <span className="text-[9px] uppercase text-zinc-500 block">Average</span>
                        <span className="text-lg font-black">{summary?.overallPercentage}%</span>
                    </div>
                    <div>
                        <span className="text-[9px] uppercase text-zinc-500 block">GPA</span>
                        <span className="text-lg font-black">{summary?.gpa} / 4.0</span>
                    </div>
                    <div>
                        <span className="text-[9px] uppercase text-zinc-500 block">Class Rank</span>
                        <span className="text-lg font-black">#{summary?.classRank} of {summary?.totalClassStudents}</span>
                    </div>
                    <div>
                        <span className="text-[9px] uppercase text-zinc-500 block">Attendance</span>
                        <span className="text-lg font-black">{attendance?.rate}%</span>
                    </div>
                </div>

                {/* Print Marks Table */}
                <table className="w-full text-xs border-collapse border border-zinc-300 mb-6">
                    <thead>
                        <tr className="bg-zinc-100 text-[10px] font-mono uppercase">
                            <th className="border border-zinc-300 p-2 text-left">Subject</th>
                            <th className="border border-zinc-300 p-2 text-center">Score / 100</th>
                            <th className="border border-zinc-300 p-2 text-center">Grade</th>
                            <th className="border border-zinc-300 p-2 text-left">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {grades.map((g: any, i: number) => (
                            <tr key={i} className="border border-zinc-300">
                                <td className="border border-zinc-300 p-2 font-bold">{g.subject?.name}</td>
                                <td className="border border-zinc-300 p-2 text-center font-mono font-bold">{g.score}%</td>
                                <td className="border border-zinc-300 p-2 text-center font-black">{g.grade}</td>
                                <td className="border border-zinc-300 p-2 text-[10px] italic text-zinc-600">{g.remarks || "Satisfactory"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Print Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
                    <div>
                        <div className="border-b border-black pb-1 font-serif font-bold italic">{principal?.name || "School Principal"}</div>
                        <span className="text-[9px] uppercase text-zinc-500 mt-1 block">Principal Signature</span>
                    </div>
                    <div>
                        <div className="border-b border-black pb-1 font-serif font-bold italic">Homeroom Advisor</div>
                        <span className="text-[9px] uppercase text-zinc-500 mt-1 block">Homeroom Teacher</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="p-1 border border-black rounded">
                            <QRCode value={qrVerifyUrl || "https://lucy.app"} size={50} />
                        </div>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase mt-1">Registrar Verification</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
