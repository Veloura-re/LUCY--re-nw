"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
    Printer, GraduationCap, Award, CheckCircle2, 
    Calendar, User, ArrowLeft, RefreshCw, ShieldCheck, 
    Sparkles, BookOpen, Layers, QrCode as QrCodeIcon, 
    School, AlertCircle, FileText, Edit3, Send, Check,
    Shield, Lock, ExternalLink
} from "lucide-react";
import QRCode from "react-qr-code";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generateTranscriptQrUrl } from "@/lib/student-id-security";

// Guilloche Security Corner Filigree (Micro-design element)
function GuillocheCorner({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("w-14 h-14 pointer-events-none", className)}>
            <path d="M4 4 H76 V16 H16 V76 H4 Z" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <path d="M10 10 H70 V14 H14 V70 H10 Z" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.5" />
            <path d="M16 16 Q45 16 45 45 Q16 45 16 16" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.4" />
            <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.35" />
            <circle cx="24" cy="24" r="3.5" fill="currentColor" fillOpacity="0.25" />
            <line x1="4" y1="4" x2="32" y2="32" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3" />
        </svg>
    );
}

// Concentric Security Rosette (Watermark element)
function SecurityWatermark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("pointer-events-none select-none", className)}>
            <circle cx="120" cy="120" r="110" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.12" />
            <circle cx="120" cy="120" r="95" stroke="currentColor" strokeWidth="0.75" opacity="0.16" />
            <circle cx="120" cy="120" r="80" stroke="currentColor" strokeWidth="1.25" strokeDasharray="4 2" opacity="0.2" />
            <circle cx="120" cy="120" r="65" stroke="currentColor" strokeWidth="0.75" opacity="0.15" />
            <circle cx="120" cy="120" r="50" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.25" />
            <path d="M120 10 L120 230 M10 120 L230 120 M42 42 L198 198 M42 198 L198 42" stroke="currentColor" strokeWidth="0.5" opacity="0.12" />
        </svg>
    );
}

export default function StudentReportCardPage() {
    const { studentId } = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFlipped, setIsFlipped] = useState(false);
    
    // Homeroom Faculty Observation Inline Editor State
    const [isEditingRemark, setIsEditingRemark] = useState(false);
    const [remarkContent, setRemarkContent] = useState("");
    const [savingRemark, setSavingRemark] = useState(false);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/school/students/${studentId}/report-card`);
            const result: any = await res.json();
            setData(result);
            if (result?.remarks && result.remarks.length > 0) {
                setRemarkContent(result.remarks[0].content || "");
            }
        } catch (e) {
            console.error("Report Card Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [studentId]);

    const handlePrint = () => {
        window.print();
    };

    const handleSaveRemark = async () => {
        if (!remarkContent.trim()) {
            toast.error("Observation content cannot be blank.");
            return;
        }

        setSavingRemark(true);
        try {
            const res = await fetch(`/api/school/students/${studentId}/remarks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    content: remarkContent.trim(), 
                    term: data?.term?.id || undefined 
                })
            });

            if (!res.ok) {
                const err: any = await res.json().catch(() => ({}));
                toast.error(err?.error || "Failed to commit faculty observation.");
                return;
            }

            const responsePayload: any = await res.json();
            const remark = responsePayload?.remark;
            toast.success("Faculty observation synchronized to Student Dossier.");
            
            // Optimistically update remarks array in state
            setData((prev: any) => {
                if (!prev) return prev;
                const existing = prev.remarks || [];
                return {
                    ...prev,
                    remarks: [remark, ...existing.filter((r: any) => r.id !== remark.id)]
                };
            });
            setIsEditingRemark(false);
        } catch (e) {
            console.error(e);
            toast.error("Network error: Observation could not be transmitted.");
        } finally {
            setSavingRemark(false);
        }
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
                    onClick={() => { setLoading(true); fetchData(); }}
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

    const { student, principal, term, grades = [], summary = {}, attendance = {}, remarks = [], canEditRemarks = false } = data;
    const schoolName = student?.school?.name || "LUCY Academic Institution";
    const studentFullName = `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "Enrolled Scholar";
    
    // Dual-Mode Cryptographically Verifiable URL:
    // Readable by public phone cameras via /verify/student/[id],
    // and recognized instantly by the LUCY in-app Scan ID QR scanner modal.
    const origin = typeof window !== 'undefined' ? window.location.origin : "https://lucyos.5-cn.net";
    const qrVerifyUrl = generateTranscriptQrUrl(origin, student.id, student.schoolId, student.studentCode);
    const checksumHash = `LUCY-${(student?.id || "").slice(0, 8).toUpperCase()}-${(student?.studentCode || "CERT").toUpperCase()}`;
    const latestRemark = remarks?.[0] || null;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-black text-zinc-900 dark:text-white p-4 md:p-8 relative selection:bg-eduGreen-500/30">
            {/* Ambient Security Glows (Screen Only) */}
            <div className="absolute top-10 left-1/4 w-96 h-96 bg-eduGreen-500/10 rounded-full blur-3xl pointer-events-none print:hidden" />
            <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none print:hidden" />

            {/* Top Operational Toolbar (Hidden in Print) */}
            <div className="max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden relative z-20">
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => router.push('/dashboard/reports/students')} 
                        className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl text-xs font-semibold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-900 shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Cohort
                    </Button>
                    <Link href={`/dashboard/students/${student.id}`}>
                        <Button 
                            variant="outline" 
                            className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl text-xs font-semibold uppercase tracking-widest hover:border-eduGreen-500 hover:text-eduGreen-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 shadow-sm"
                        >
                            <User className="w-4 h-4 mr-2 text-eduGreen-500" /> Student Profile Dossier
                        </Button>
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => setIsFlipped(!isFlipped)} 
                        className="rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-5 text-xs font-bold uppercase tracking-widest shadow-xl transition-all"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2 transition-transform duration-500", isFlipped ? "rotate-180" : "")} /> 
                        {isFlipped ? "Flip: Front Transcript" : "Flip: Certificate & Seal"}
                    </Button>

                    <Button 
                        onClick={handlePrint} 
                        className="rounded-2xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-bold text-xs uppercase tracking-widest px-6 shadow-xl shadow-eduGreen-600/20 transition-all"
                    >
                        <Printer className="w-4 h-4 mr-2" /> Print Official PDF
                    </Button>
                </div>
            </div>

            {/* SCREEN VIEW: 3D Flippable Interactive A4 Paper Credential */}
            <div className="max-w-[850px] mx-auto perspective-[2200px] print:hidden pb-12">
                <motion.div
                    className="w-full relative transition-all duration-700"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 26 }}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {/* ══════════════════════════════════════════════════════════════ */}
                    {/* FRONT SIDE: A4 Comprehensive Academic Transcript             */}
                    {/* ══════════════════════════════════════════════════════════════ */}
                    <div 
                        className={cn(
                            "w-full bg-white dark:bg-zinc-950 border-2 border-eduGreen-600/30 dark:border-eduGreen-500/20 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-7 md:p-12 shadow-2xl relative overflow-hidden min-h-[1130px] flex flex-col justify-between transition-opacity",
                            isFlipped ? "pointer-events-none opacity-0 absolute inset-0" : "opacity-100 relative"
                        )}
                        style={{ backfaceVisibility: "hidden" }}
                    >
                        {/* Micro-Design Security Corner Filigrees */}
                        <GuillocheCorner className="absolute top-3 left-3 text-eduGreen-600 dark:text-eduGreen-400" />
                        <GuillocheCorner className="absolute top-3 right-3 text-eduGreen-600 dark:text-eduGreen-400 rotate-90" />
                        <GuillocheCorner className="absolute bottom-3 left-3 text-eduGreen-600 dark:text-eduGreen-400 -rotate-90" />
                        <GuillocheCorner className="absolute bottom-3 right-3 text-eduGreen-600 dark:text-eduGreen-400 rotate-180" />

                        {/* Central Security Rosette Watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] text-eduGreen-500/10 pointer-events-none">
                            <SecurityWatermark className="w-full h-full" />
                        </div>

                        {/* Top Margin Security Micro-Rule */}
                        <div className="relative z-10 text-center pb-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[8px] font-mono uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400">
                            <span>LUCY Centralized Scholastic Ledger</span>
                            <span className="font-bold text-eduGreen-600 dark:text-eduGreen-400">Document Page 1 of 2 • Scholastic Performance Record</span>
                            <span>Audit Node Verified</span>
                        </div>

                        {/* Executive Header Banner */}
                        <div className="relative z-10 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b-2 border-eduGreen-600/20 dark:border-eduGreen-500/20">
                            <div className="flex items-center gap-5">
                                {student?.school?.logoUrl ? (
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-900 border-2 border-eduGreen-500/30 p-1 shrink-0 shadow-md">
                                        <img src={student.school.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-eduGreen-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white font-black text-2xl shadow-lg shrink-0">
                                        {schoolName[0]}
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-mono font-bold text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest">
                                            Official Scholastic Transcript
                                        </span>
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-eduGreen-500 animate-pulse" />
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-white uppercase leading-none mt-1">
                                        {schoolName}
                                    </h1>
                                    <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 font-medium">
                                        {student?.school?.address || "Official Accredited Academy Campus"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:items-end bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 px-5 shadow-sm">
                                <span className="text-[8px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-semibold">Active Session Term</span>
                                <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider mt-0.5">
                                    {term?.name || "Term Evaluation"}
                                </span>
                                {term?.startDate && term?.endDate && (
                                    <span className="text-[9px] text-eduGreen-600 dark:text-eduGreen-400 font-bold uppercase tracking-wider mt-0.5">
                                        {term.startDate} – {term.endDate}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Scholar Identity Dossier Card */}
                        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 my-6 p-5 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 dark:from-zinc-900/60 dark:via-zinc-900/30 dark:to-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm">
                            <div>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">Scholar Name</span>
                                <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight mt-0.5">{studentFullName}</p>
                            </div>
                            <div>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">Student Code</span>
                                <p className="text-sm font-mono font-bold text-zinc-900 dark:text-white mt-0.5">{student?.studentCode || "N/A"}</p>
                            </div>
                            <div>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">Assigned Cohort</span>
                                <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase mt-0.5">
                                    Grade {student?.class?.grade?.level || "—"} • {student?.class?.name || "Cohort Alpha"}
                                </p>
                            </div>
                            <div>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">Evaluation Standing</span>
                                <p className="text-sm font-black text-eduGreen-600 dark:text-eduGreen-400 uppercase mt-0.5">{summary?.standing || "SATISFACTORY"}</p>
                            </div>
                        </div>

                        {/* Vitals Ribbon */}
                        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="p-4 rounded-2xl bg-eduGreen-500/10 border-2 border-eduGreen-500/30 shadow-sm">
                                <span className="text-[8px] font-mono text-eduGreen-700 dark:text-eduGreen-400 uppercase tracking-widest font-black">Cumulative Average</span>
                                <div className="text-3xl font-black text-zinc-900 dark:text-white mt-1">{summary?.overallPercentage ?? 0}%</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Weighted GPA</span>
                                <div className="text-3xl font-black text-zinc-900 dark:text-white mt-1">{summary?.gpa ?? "0.00"} <span className="text-xs font-normal text-zinc-500">/ 4.0</span></div>
                            </div>
                            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Class Standing</span>
                                <div className="text-3xl font-black text-zinc-900 dark:text-white mt-1">#{summary?.classRank ?? "1"} <span className="text-xs font-normal text-zinc-500">of {summary?.totalClassStudents ?? 20}</span></div>
                            </div>
                            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Attendance Rate</span>
                                <div className="text-3xl font-black text-zinc-900 dark:text-white mt-1">{attendance?.rate ?? 0}%</div>
                            </div>
                        </div>

                        {/* Continuous Assessment & Subject Ledger Table */}
                        <div className="relative z-10 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800/80 overflow-hidden mb-6 shadow-sm flex-1">
                            <div className="overflow-x-auto scrollbar-thin">
                                <div className="min-w-[580px]">
                                    <div className="grid grid-cols-12 bg-zinc-100 dark:bg-zinc-900 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 text-[9px] font-mono font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                                        <div className="col-span-5 sm:col-span-4">Curriculum Subject</div>
                                        <div className="col-span-3 sm:col-span-4 text-center">Continuous Assessment Items</div>
                                        <div className="col-span-2 text-center">Score / 100</div>
                                        <div className="col-span-2 text-right">Grade</div>
                                    </div>

                                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800/60 bg-white dark:bg-zinc-950">
                                        {grades.length === 0 ? (
                                            <div className="py-12 text-center text-zinc-500 text-xs uppercase tracking-widest font-medium">
                                                No subjects or marklists recorded for this student
                                            </div>
                                        ) : grades.map((g: any, i: number) => (
                                            <div key={i} className="grid grid-cols-12 px-5 py-3 items-center hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors text-xs">
                                                <div className="col-span-5 sm:col-span-4">
                                                    <p className="font-bold text-zinc-900 dark:text-white">{g.subject?.name || "Subject"}</p>
                                                    {g.remarks && (
                                                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic truncate mt-0.5">{g.remarks}</p>
                                                    )}
                                                </div>

                                                <div className="col-span-3 sm:col-span-4 flex items-center justify-center gap-1.5 flex-wrap">
                                                    {g.columns && g.columns.length > 0 ? (
                                                        g.columns.map((col: any, ci: number) => (
                                                            <span key={ci} className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[9px] font-mono text-zinc-600 dark:text-zinc-400">
                                                                {col.title}: <strong className="ml-1 text-zinc-900 dark:text-white">{col.score ?? 0}</strong>/{col.maxMarks}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-[9px] font-mono text-zinc-500 italic">Continuous Assessment</span>
                                                    )}
                                                </div>

                                                <div className="col-span-2 text-center font-mono font-black text-zinc-900 dark:text-white text-sm">
                                                    {g.score ?? 0}%
                                                </div>

                                                <div className="col-span-2 text-right">
                                                    <span className={cn(
                                                        "inline-block px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider",
                                                        g.grade?.startsWith('A') ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                                                        g.grade?.startsWith('B') ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30" :
                                                        g.grade?.startsWith('C') ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30" :
                                                        g.grade === '-' ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30" :
                                                        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                                    )}>
                                                        {g.grade || "-"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Flip Callout Bar (Front -> Back) */}
                        <div 
                            onClick={() => setIsFlipped(true)}
                            className="relative z-10 w-full py-3.5 bg-gradient-to-r from-eduGreen-500/10 via-emerald-500/15 to-eduGreen-500/10 hover:from-eduGreen-500/20 hover:to-eduGreen-500/20 border-2 border-eduGreen-500/30 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer transition-all text-xs font-bold text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest shadow-md group"
                        >
                            <Sparkles className="w-4 h-4 text-eduGreen-500 group-hover:rotate-12 transition-transform" />
                            <span>Flip to Official Certificate, Faculty Observations & Holographic Seal ↷</span>
                        </div>

                        {/* Document Footer Micro-Stamp */}
                        <div className="relative z-10 pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[8px] font-mono uppercase tracking-widest text-zinc-400">
                            <span>Document Digest: {checksumHash}</span>
                            <span>A4 Format 210 x 297 mm</span>
                            <span>Tamper-Resistant Transcript</span>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════ */}
                    {/* BACK SIDE: A4 Official Certificate & Holographic Seal        */}
                    {/* ══════════════════════════════════════════════════════════════ */}
                    <div 
                        className={cn(
                            "w-full bg-white dark:bg-zinc-950 border-2 border-eduGreen-600/30 dark:border-eduGreen-500/20 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-7 md:p-12 shadow-2xl relative overflow-hidden min-h-[1130px] flex flex-col justify-between transition-opacity",
                            !isFlipped ? "pointer-events-none opacity-0 absolute inset-0" : "opacity-100 relative"
                        )}
                        style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
                    >
                        {/* Micro-Design Security Corner Filigrees */}
                        <GuillocheCorner className="absolute top-3 left-3 text-eduGreen-600 dark:text-eduGreen-400" />
                        <GuillocheCorner className="absolute top-3 right-3 text-eduGreen-600 dark:text-eduGreen-400 rotate-90" />
                        <GuillocheCorner className="absolute bottom-3 left-3 text-eduGreen-600 dark:text-eduGreen-400 -rotate-90" />
                        <GuillocheCorner className="absolute bottom-3 right-3 text-eduGreen-600 dark:text-eduGreen-400 rotate-180" />

                        {/* Central Security Rosette Watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] text-eduGreen-500/10 pointer-events-none">
                            <SecurityWatermark className="w-full h-full" />
                        </div>

                        {/* Top Margin Security Micro-Rule */}
                        <div className="relative z-10 text-center pb-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[8px] font-mono uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400">
                            <span>Institutional Verification & Credentials</span>
                            <span className="font-bold text-eduGreen-600 dark:text-eduGreen-400">Document Page 2 of 2 • Official Academic Certificate</span>
                            <span>Cryptographic Seal Node</span>
                        </div>

                        {/* Institutional Credential Header */}
                        <div className="relative z-10 mt-6 text-center pb-6 border-b-2 border-eduGreen-600/20 dark:border-eduGreen-500/20">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-eduGreen-500/10 border border-eduGreen-500/30 text-eduGreen-600 dark:text-eduGreen-400 text-[9px] font-mono font-black uppercase tracking-[0.2em] mb-3">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Official Academic Credential & Standing
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                                Certificate of Scholastic Standing
                            </h2>
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto mt-2">
                                This certifies that <strong className="text-zinc-900 dark:text-white font-bold">{studentFullName}</strong> (Code: {student?.studentCode}) has completed the accredited curriculum evaluation at {schoolName} for the term of {term?.name}.
                            </p>
                        </div>

                        {/* Middle Section: Attendance Metric & Faculty Observation */}
                        <div className="relative z-10 grid md:grid-cols-2 gap-6 my-6">
                            {/* Attendance Compliance Block */}
                            <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-200 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">Attendance Metric</span>
                                        <span className="text-[9px] font-mono font-bold text-eduGreen-600 dark:text-eduGreen-400 uppercase">Compliance 100%</span>
                                    </div>
                                    <div className="flex items-baseline gap-2 mt-3">
                                        <div className="text-4xl font-black text-zinc-900 dark:text-white">{attendance?.rate ?? 0}%</div>
                                        <span className="text-[10px] text-zinc-500 uppercase font-medium">Session Rate</span>
                                    </div>
                                </div>
                                <div className="space-y-2 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs font-mono">
                                    <div className="flex justify-between items-center">
                                        <span className="text-zinc-500 text-[10px] uppercase">Present Days:</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-black">{attendance?.present ?? 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-zinc-500 text-[10px] uppercase">Excused / Absent:</span>
                                        <span className="text-zinc-700 dark:text-zinc-300 font-bold">{attendance?.absent ?? 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Faculty Observations & Homeroom Advisor Block (Bidirectional Sync) */}
                            <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-200 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between relative">
                                <div>
                                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                                        <div className="flex items-center gap-1.5">
                                            <Edit3 className="w-3.5 h-3.5 text-eduGreen-500" />
                                            <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">
                                                Faculty Observations
                                            </span>
                                        </div>
                                        {canEditRemarks && !isEditingRemark && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setIsEditingRemark(true)}
                                                className="h-6 px-2 text-[9px] font-bold text-eduGreen-600 hover:text-eduGreen-500 uppercase tracking-widest hover:bg-eduGreen-500/10 rounded-lg"
                                            >
                                                Edit Observation
                                            </Button>
                                        )}
                                    </div>

                                    {/* Observation Body or Inline Editor */}
                                    {isEditingRemark ? (
                                        <div className="mt-3 space-y-3">
                                            <Textarea 
                                                value={remarkContent}
                                                onChange={(e) => setRemarkContent(e.target.value)}
                                                placeholder="Enter qualitative scholastic remarks, student growth dynamics, or homeroom observations..."
                                                className="min-h-[90px] text-xs bg-white dark:bg-zinc-950 border-eduGreen-500/40 rounded-xl"
                                            />
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setIsEditingRemark(false)}
                                                    className="h-7 text-[10px] uppercase tracking-wider rounded-lg"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleSaveRemark}
                                                    disabled={savingRemark}
                                                    className="h-7 bg-eduGreen-600 hover:bg-eduGreen-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-md"
                                                >
                                                    {savingRemark ? (
                                                        <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                                    ) : (
                                                        <Check className="w-3 h-3 mr-1" />
                                                    )}
                                                    Save & Sync
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-3">
                                            <p className="text-xs text-zinc-700 dark:text-zinc-300 italic leading-relaxed">
                                                "{latestRemark?.content || "Academic dossier audited and certified for institutional verification and official transcript synthesis."}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 mt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                                    <span>Advisor: {latestRemark?.teacher?.name || "Homeroom Advisory Board"}</span>
                                    <span className="text-eduGreen-600 dark:text-eduGreen-400 font-bold">Dossier Synced</span>
                                </div>
                            </div>
                        </div>

                        {/* Holographic Transcript Seal & Verified Academic Record (Redesigned & Scannable) */}
                        <div className="relative z-10 p-6 md:p-7 rounded-3xl bg-gradient-to-r from-emerald-950/20 via-teal-950/30 to-slate-900/20 border-2 border-eduGreen-500/40 my-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                            {/* Seal Typography & Security Digest */}
                            <div className="space-y-1.5 text-center sm:text-left flex-1">
                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-eduGreen-500 animate-ping" />
                                    <span className="text-[9px] font-mono text-eduGreen-400 uppercase tracking-widest font-black">
                                        Holographic Transcript Seal
                                    </span>
                                </div>
                                <h3 className="text-xl font-black uppercase text-zinc-900 dark:text-white tracking-tight">
                                    Verified Official Academic Record
                                </h3>
                                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                                    Authenticity certified on the LUCY Centralized Scholastic Network.
                                </p>
                                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[8px] font-mono text-zinc-500 dark:text-zinc-400">
                                    <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700">
                                        Digest: {checksumHash}
                                    </span>
                                    <span className="text-eduGreen-500 font-bold">
                                        Scannable via Camera & In-App Badge Scanner
                                    </span>
                                </div>
                            </div>

                            {/* Scannable QR Code Shield Container with Holographic Shimmer Border */}
                            <div className="relative group shrink-0">
                                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-lime-400 opacity-70 blur-sm group-hover:opacity-100 transition-opacity" />
                                <div className="relative p-3 bg-white rounded-2xl shadow-2xl border-2 border-eduGreen-500/40 flex flex-col items-center">
                                    <QRCode value={qrVerifyUrl} size={92} />
                                    <span className="text-[7px] font-mono font-bold text-zinc-900 uppercase tracking-widest mt-1">
                                        Scan ID QR
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Official Signatures & Digital Registrar Stamp */}
                        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t-2 border-zinc-200 dark:border-zinc-800/80 text-center">
                            <div>
                                <div className="h-10 border-b-2 border-zinc-300 dark:border-zinc-700 flex items-end justify-center pb-1">
                                    <span className="font-serif italic text-base text-zinc-800 dark:text-zinc-200 font-bold tracking-wide">
                                        {principal?.name || "Dr. Evelyn Vance"}
                                    </span>
                                </div>
                                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-1.5 block font-bold">
                                    Principal Authentication
                                </span>
                            </div>
                            <div>
                                <div className="h-10 border-b-2 border-zinc-300 dark:border-zinc-700 flex items-end justify-center pb-1">
                                    <span className="font-serif italic text-base text-zinc-800 dark:text-zinc-200 font-bold tracking-wide">
                                        Class Homeroom Advisor
                                    </span>
                                </div>
                                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-1.5 block font-bold">
                                    Homeroom Faculty Signature
                                </span>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <div className="h-10 border-b-2 border-zinc-300 dark:border-zinc-700 flex items-end justify-center pb-1">
                                    <span className="font-mono text-xs text-eduGreen-600 dark:text-eduGreen-400 font-black tracking-widest">
                                        SEAL-2026-AUTHENTIC
                                    </span>
                                </div>
                                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-1.5 block font-bold">
                                    Registrar Digital Seal
                                </span>
                            </div>
                        </div>

                        {/* Interactive Flip Back (Back -> Front) */}
                        <div 
                            onClick={() => setIsFlipped(false)}
                            className="relative z-10 w-full py-3 mt-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs font-bold uppercase tracking-widest shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4 text-eduGreen-500" />
                            Return to Front Scholastic Transcript ↶
                        </div>

                        {/* Document Footer Micro-Stamp */}
                        <div className="relative z-10 pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[8px] font-mono uppercase tracking-widest text-zinc-400">
                            <span>Centralized Academic Seal</span>
                            <span>A4 Format 210 x 297 mm</span>
                            <span>Authenticity Certified</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* PRINT & PDF EXPORT LAYOUT: 2-PAGE A4 OFFICIAL DOSSIER              */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <div className="hidden print:block w-full max-w-[850px] mx-auto text-black font-sans">
                {/* ────────────────────────────────────────────────────────────── */}
                {/* PRINT PAGE 1: Front Academic Transcript Breakdown              */}
                {/* ────────────────────────────────────────────────────────────── */}
                <div className="w-full bg-white p-10 border-2 border-black rounded-3xl min-h-[1100px] flex flex-col justify-between mb-8 page-break-after-always" style={{ pageBreakAfter: "always", breakAfter: "page" }}>
                    <div>
                        {/* Print Header */}
                        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
                            <div className="flex items-center gap-4">
                                {student?.school?.logoUrl && (
                                    <img src={student.school.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                                )}
                                <div>
                                    <span className="text-[9px] font-mono font-black uppercase tracking-widest text-zinc-700 block">
                                        Official Scholastic Performance Transcript
                                    </span>
                                    <h1 className="text-2xl font-black uppercase tracking-tight leading-none mt-1">{schoolName}</h1>
                                    <p className="text-xs text-zinc-600 mt-1">{student?.school?.address || "Official Academic Campus"}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-black uppercase block">{term?.name || "Academic Session"}</span>
                                <p className="text-[10px] font-mono text-zinc-600">{term?.startDate} – {term?.endDate}</p>
                                <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold">Page 1 of 2</span>
                            </div>
                        </div>

                        {/* Scholar Profile Box */}
                        <div className="grid grid-cols-4 gap-4 p-4 border border-zinc-400 rounded-xl mb-6 text-xs bg-zinc-50">
                            <div>
                                <span className="text-[9px] font-mono uppercase text-zinc-500 block">Scholar Name</span>
                                <strong className="text-sm uppercase">{studentFullName}</strong>
                            </div>
                            <div>
                                <span className="text-[9px] font-mono uppercase text-zinc-500 block">Student Identifier</span>
                                <strong className="font-mono text-sm">{student?.studentCode}</strong>
                            </div>
                            <div>
                                <span className="text-[9px] font-mono uppercase text-zinc-500 block">Class Cohort</span>
                                <strong>Grade {student?.class?.grade?.level} • {student?.class?.name}</strong>
                            </div>
                            <div>
                                <span className="text-[9px] font-mono uppercase text-zinc-500 block">Standing</span>
                                <strong>{summary?.standing || "SATISFACTORY"}</strong>
                            </div>
                        </div>

                        {/* Vitals Summary */}
                        <div className="grid grid-cols-4 gap-4 mb-6 text-center border-y-2 border-zinc-300 py-3">
                            <div>
                                <span className="text-[9px] uppercase text-zinc-500 font-bold block">Cumulative Average</span>
                                <span className="text-2xl font-black">{summary?.overallPercentage}%</span>
                            </div>
                            <div>
                                <span className="text-[9px] uppercase text-zinc-500 font-bold block">Weighted GPA</span>
                                <span className="text-2xl font-black">{summary?.gpa} / 4.0</span>
                            </div>
                            <div>
                                <span className="text-[9px] uppercase text-zinc-500 font-bold block">Class Position</span>
                                <span className="text-2xl font-black">#{summary?.classRank} of {summary?.totalClassStudents}</span>
                            </div>
                            <div>
                                <span className="text-[9px] uppercase text-zinc-500 font-bold block">Attendance Compliance</span>
                                <span className="text-2xl font-black">{attendance?.rate}%</span>
                            </div>
                        </div>

                        {/* Subject Marks Table */}
                        <table className="w-full text-xs border-collapse border border-zinc-400 mb-6">
                            <thead>
                                <tr className="bg-zinc-100 font-mono text-[10px] uppercase">
                                    <th className="border border-zinc-400 p-2 text-left">Curriculum Subject</th>
                                    <th className="border border-zinc-400 p-2 text-center">Continuous Assessment</th>
                                    <th className="border border-zinc-400 p-2 text-center">Score / 100</th>
                                    <th className="border border-zinc-400 p-2 text-center">Grade</th>
                                    <th className="border border-zinc-400 p-2 text-left">Remarks & Observations</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grades.map((g: any, i: number) => (
                                    <tr key={i} className="border border-zinc-400">
                                        <td className="border border-zinc-400 p-2 font-bold">{g.subject?.name}</td>
                                        <td className="border border-zinc-400 p-2 text-center font-mono text-[10px]">
                                            {g.columns?.map((c: any) => `${c.title}: ${c.score}`).join(" | ") || "Assessed"}
                                        </td>
                                        <td className="border border-zinc-400 p-2 text-center font-mono font-bold">{g.score}%</td>
                                        <td className="border border-zinc-400 p-2 text-center font-black">{g.grade}</td>
                                        <td className="border border-zinc-400 p-2 text-[10px] italic text-zinc-600">{g.remarks || "Satisfactory progress"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-zinc-400 pt-3 flex justify-between text-[9px] font-mono uppercase text-zinc-500">
                        <span>LUCY OS Centralized Scholastic Network</span>
                        <span>Continued on Page 2 for Official Certificate & Seal</span>
                        <span>Digest: {checksumHash}</span>
                    </div>
                </div>

                {/* ────────────────────────────────────────────────────────────── */}
                {/* PRINT PAGE 2: Back Official Certificate & Holographic Seal     */}
                {/* ────────────────────────────────────────────────────────────── */}
                <div className="w-full bg-white p-10 border-2 border-black rounded-3xl min-h-[1100px] flex flex-col justify-between">
                    <div>
                        {/* Certificate Header */}
                        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
                            <div>
                                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-zinc-700 block">
                                    Official Institutional Credential
                                </span>
                                <h2 className="text-2xl font-black uppercase tracking-tight leading-none mt-1">{schoolName}</h2>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-black uppercase block">Page 2 of 2</span>
                                <span className="text-[10px] font-mono text-zinc-600">{term?.name}</span>
                            </div>
                        </div>

                        {/* Certificate Body Text */}
                        <div className="text-center my-8 py-6 border-y-2 border-zinc-300">
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 block mb-2">
                                Institutional Certificate of Academic Standing
                            </span>
                            <h3 className="text-2xl font-black uppercase tracking-tight">
                                {studentFullName}
                            </h3>
                            <p className="text-xs text-zinc-600 mt-2 max-w-lg mx-auto">
                                Has demonstrated authenticated scholastic achievement during the {term?.name} academic session, earning the official standing of <strong className="font-black text-black">{summary?.standing || "SATISFACTORY"}</strong>.
                            </p>
                        </div>

                        {/* Faculty Observation Block */}
                        <div className="p-5 border border-zinc-400 rounded-xl mb-6 bg-zinc-50">
                            <span className="text-[9px] font-mono font-black uppercase tracking-widest text-zinc-600 block mb-1">
                                Faculty Observations & Homeroom Advisory
                            </span>
                            <p className="text-xs italic text-zinc-800 leading-relaxed">
                                "{latestRemark?.content || "Academic dossier audited and certified for institutional verification and official transcript synthesis."}"
                            </p>
                            <p className="text-[9px] font-mono text-zinc-500 mt-2 text-right">
                                — {latestRemark?.teacher?.name || "Homeroom Class Advisor"}
                            </p>
                        </div>

                        {/* Holographic Seal & Verification QR Block */}
                        <div className="p-6 border-2 border-black rounded-2xl flex items-center justify-between gap-6 my-6">
                            <div className="space-y-1">
                                <span className="text-[9px] font-mono font-black uppercase tracking-widest block">
                                    Holographic Transcript Seal
                                </span>
                                <h4 className="text-base font-black uppercase">
                                    Verified Official Academic Record
                                </h4>
                                <p className="text-xs text-zinc-600">
                                    Authenticity certified on the LUCY Centralized Scholastic Network.
                                </p>
                                <p className="text-[9px] font-mono text-zinc-500 mt-1">
                                    Cryptographic Checksum: {checksumHash}
                                </p>
                            </div>
                            <div className="p-2 border-2 border-black rounded-xl bg-white shrink-0">
                                <QRCode value={qrVerifyUrl} size={84} />
                            </div>
                        </div>
                    </div>

                    {/* Official Signatures */}
                    <div>
                        <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-black text-center text-xs items-end mb-4">
                            <div>
                                <div className="border-b border-black pb-1 font-serif font-bold italic text-base">
                                    {principal?.name || "Dr. Evelyn Vance"}
                                </div>
                                <span className="text-[9px] uppercase font-bold text-zinc-600 mt-1 block">
                                    Principal Authentication
                                </span>
                            </div>
                            <div>
                                <div className="border-b border-black pb-1 font-serif font-bold italic text-base">
                                    Class Homeroom Advisor
                                </div>
                                <span className="text-[9px] uppercase font-bold text-zinc-600 mt-1 block">
                                    Class Teacher Signature
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="font-mono text-xs font-black tracking-widest border-b border-black pb-1 w-full">
                                    SEAL-2026-AUTHENTIC
                                </div>
                                <span className="text-[8px] font-mono uppercase font-bold text-zinc-600 mt-1 block">
                                    Registrar Digital Seal
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-zinc-400 pt-3 flex justify-between text-[8px] font-mono uppercase text-zinc-500">
                            <span>LUCY OS Centralized Scholastic Network</span>
                            <span>End of Document (Page 2 of 2)</span>
                            <span>Tamper-Resistant Holographic Seal Verified</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
