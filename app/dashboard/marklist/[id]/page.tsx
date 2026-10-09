"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Save, Lock, Unlock, Download, Calculator, FileDown, Printer, Sparkles } from "lucide-react";
import Link from "next/link";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { AlertModal } from "@/components/ui/confirmation-modal";
import { useReactToPrint } from "react-to-print";
import { AssessmentPrint } from "@/components/dashboard/assessment-print";
import { format } from "date-fns";
import { toast } from "sonner";
import { getClientCache, setClientCache } from "@/lib/cache-client";
import { NetworkRetryState } from "@/components/ui/network-retry-state";
import { CachedSyncBadge } from "@/components/ui/cached-sync-badge";

export default function MarklistEntryPage() {
    const params = useParams();
    const router = useRouter();
    const marklistId = params.id as string;

    const [exam, setExam] = useState<any>(() => {
        if (typeof window !== "undefined" && marklistId) {
            const cached = getClientCache<any>(`marklist_exam_${marklistId}`);
            return cached?.exam || null;
        }
        return null;
    });
    const [students, setStudents] = useState<any[]>(() => {
        if (typeof window !== "undefined" && marklistId) {
            const cached = getClientCache<any>(`marklist_exam_${marklistId}`);
            return cached?.students || [];
        }
        return [];
    });
    const [generatingFeedbackId, setGeneratingFeedbackId] = useState<string | null>(null);
    const [initialStudents, setInitialStudents] = useState<any[]>([]);

    const [fetching, setFetching] = useState(() => {
        if (typeof window !== "undefined" && marklistId) {
            return !getClientCache<any>(`marklist_exam_${marklistId}`);
        }
        return true;
    });
    const [isRevalidating, setIsRevalidating] = useState(false);
    const [isFromCache, setIsFromCache] = useState(() => {
        if (typeof window !== "undefined" && marklistId) {
            return !!getClientCache<any>(`marklist_exam_${marklistId}`);
        }
        return false;
    });
    const [isTimeoutError, setIsTimeoutError] = useState(false);
    const [retryAttemptCount, setRetryAttemptCount] = useState(0);
    const [saving, setSaving] = useState(false);
    const [showAlert, setShowAlert] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${exam?.title}_${exam?.className}_${new Date().toISOString().slice(0, 10)}`,
    });

    useEffect(() => {
        if (marklistId) fetchDetails(0);
    }, [marklistId]);

    const fetchDetails = async (attempt = 0) => {
        setRetryAttemptCount(attempt);
        if (exam) setIsRevalidating(true);
        else setFetching(true);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        try {
            const res = await fetch(`/api/school/marklists/${marklistId}/marks`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) {
                if (res.status === 404) {
                    setIsTimeoutError(false);
                    setExam(null);
                    return;
                }

                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 1500 * Math.pow(1.5, attempt)));
                    return fetchDetails(attempt + 1);
                }

                setIsTimeoutError(true);
                return;
            }

            const data: any = await res.json();
            clearTimeout(timeoutId);

            if (data?.exam) {
                setExam(data.exam);
                setStudents(data.students || []);
                setInitialStudents(JSON.parse(JSON.stringify(data.students || [])));
                setIsTimeoutError(false);
                setIsFromCache(false);

                // Cache for offline resilience
                setClientCache(`marklist_exam_${marklistId}`, data, 15 * 60 * 1000, true);
            }
        } catch (e: any) {
            clearTimeout(timeoutId);
            console.error("fetchDetails error:", e);
            if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 1500 * Math.pow(1.5, attempt)));
                return fetchDetails(attempt + 1);
            }
            setIsTimeoutError(true);
        } finally {
            setFetching(false);
            setIsRevalidating(false);
        }
    };

    const handleMarkChange = (id: string, field: 'score' | 'remark', value: string) => {
        setStudents(prev => {
            const updated = prev.map(s => {
                if (s.id === id) {
                    return { ...s, [field]: value };
                }
                return s;
            });
            // Update local offline draft cache
            if (exam) {
                setClientCache(`marklist_exam_${marklistId}`, { exam, students: updated }, 15 * 60 * 1000, true);
            }
            return updated;
        });
    };

    const getPerformanceColor = (pct: number) => {
        if (pct >= 80) return { text: "text-emerald-500", border: "border-emerald-900/30", bg: "bg-emerald-900/10" };
        if (pct >= 60) return { text: "text-blue-500", border: "border-blue-900/30", bg: "bg-blue-900/10" };
        if (pct >= 40) return { text: "text-amber-600 dark:text-amber-500", border: "border-amber-900/30", bg: "bg-amber-900/10" };
        return { text: "text-rose-500", border: "border-rose-900/30", bg: "bg-rose-900/10" };
    };

    const calculateGrade = (score: any, total: number) => {
        if (!score && score !== 0) return "-";
        const num = parseFloat(score);
        if (isNaN(num)) return "-";
        const pct = (num / total) * 100;

        if (pct >= 90) return "A+";
        if (pct >= 80) return "A";
        if (pct >= 70) return "B";
        if (pct >= 60) return "C";
        if (pct >= 50) return "D";
        return "F";
    };

    const handleGenerateFeedback = async (studentId: string, score: any, examObj: any) => {
        if (score === null || score === undefined || score === "") {
            toast.error("Please enter a score first");
            return;
        }
        const numScore = parseFloat(score);
        if (isNaN(numScore)) return;

        setGeneratingFeedbackId(studentId);
        try {
            const res = await fetch('/api/teacher/grades/ai-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score: numScore,
                    maxScore: examObj.totalMarks,
                    subject: examObj.subjectName
                })
            });
            if (res.ok) {
                const data: any = await res.json();
                handleMarkChange(studentId, 'remark', data.feedback);
                toast.success("AI feedback generated!");
            } else {
                toast.error("Failed to generate AI feedback");
            }
        } catch (error) {
            toast.error("Error connecting to AI service");
        } finally {
            setGeneratingFeedbackId(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/school/marklists/${marklistId}/marks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ marks: students })
            });

            if (res.ok) {
                toast.success("All grades secured & synced to campus ledger!");
                setInitialStudents(JSON.parse(JSON.stringify(students)));
                // Update persistent cache
                setClientCache(`marklist_exam_${marklistId}`, { exam, students }, 15 * 60 * 1000, true);
            } else {
                const data: any = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to save grades");
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error while saving. Draft saved locally.");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleLock = async () => {
        try {
            const res = await fetch(`/api/school/marklists/${marklistId}/lock`, {
                method: "POST"
            });
            if (res.ok) {
                const updated = { ...exam, isLocked: !exam.isLocked };
                setExam(updated);
                setClientCache(`marklist_exam_${marklistId}`, { exam: updated, students }, 15 * 60 * 1000, true);
                toast.success(exam.isLocked ? "Assessment Unlocked" : "Assessment Locked & Finalized");
            }
        } catch (e) {
            toast.error("Failed to toggle assessment lock");
        }
    };

    const getStats = () => {
        if (!students.length) return { avg: 0, passPct: 0 };
        const scored = students.filter(s => s.score !== null && s.score !== undefined && s.score !== "");
        if (!scored.length) return { avg: 0, passPct: 0 };

        const totalScore = scored.reduce((acc, s) => acc + (parseFloat(s.score) || 0), 0);
        const avg = totalScore / scored.length;
        const pass = scored.filter(s => (parseFloat(s.score) || 0) >= (exam?.totalMarks * 0.4)).length;
        const passPct = (pass / scored.length) * 100;

        return { avg, passPct };
    };

    if (fetching && !exam) return <div className="min-h-[60vh] flex items-center justify-center"><SpringingLoader message="Loading Grading Sheet" /></div>;
    
    if (!exam) {
        if (isTimeoutError) {
            return (
                <div className="min-h-[60vh] flex items-center justify-center p-6">
                    <NetworkRetryState
                        title="Assessment Sync In Progress"
                        description="Connection to the grading ledger is slow or interrupted. Your data is protected."
                        retryAttempt={retryAttemptCount}
                        onRetry={() => fetchDetails(0)}
                    />
                </div>
            );
        }

        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-8">
                <h2 className="text-xl font-bold uppercase tracking-wide text-zinc-900 dark:text-white">
                    Assessment Not Found
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md">
                    This assessment record could not be found in your school&apos;s active term ledger.
                </p>
                <div className="flex items-center gap-3 mt-4">
                    <Button
                        onClick={() => fetchDetails(0)}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest h-11"
                    >
                        Retry Connection
                    </Button>
                    <Button
                        onClick={() => router.push('/dashboard/marklist')}
                        variant="outline"
                        className="rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest h-11"
                    >
                        Return to Marklists
                    </Button>
                </div>
            </div>
        );
    }

    const stats = getStats();
    const isTermCompleted = Boolean(exam.isTermCompleted);
    const isReadOnly = Boolean(exam.isLocked || isTermCompleted || exam.canEdit === false);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 relative z-10 pb-20">
            {/* Term Completed Read-Only Banner */}
            {isTermCompleted && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-medium">
                    <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>
                            <strong>Term Completed - Read Only:</strong> This assessment belongs to a finalized academic term{exam.term?.name ? ` (${exam.term.name})` : ""}. Grade records are locked for audit preservation.
                        </span>
                    </div>
                    <Link href="/dashboard/marklist/archive" className="underline font-bold text-[10px] uppercase tracking-wider shrink-0">
                        View Archive
                    </Link>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/marklist">
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-900">
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <span className="text-[10px] font-black text-eduGreen-500 uppercase tracking-widest bg-eduGreen-900/10 px-2 py-1 rounded-lg">
                                {exam.category?.replace('_', ' ')}
                            </span>
                            {exam.term?.name && (
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border ${
                                    isTermCompleted
                                        ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-500"
                                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                }`}>
                                    {exam.term.name} {isTermCompleted ? "(Concluded)" : "(Live)"}
                                </span>
                            )}
                            <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest bg-zinc-100/50 dark:bg-zinc-900/50 px-2 py-1 rounded-lg">
                                {exam.totalMarks} Marks
                            </span>
                            <CachedSyncBadge
                                isRevalidating={isRevalidating}
                                isFromCache={isFromCache}
                                retryAttempt={retryAttemptCount}
                                onSync={() => fetchDetails(0)}
                            />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">{exam.title}</h1>
                        <p className="text-zinc-600 dark:text-zinc-500 font-bold text-sm mt-1">{exam.className} • {exam.subjectName}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Class Average</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white">{stats.avg.toFixed(1)}</span>
                    </div>

                    <Button
                        onClick={() => handlePrint()}
                        className="h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest bg-eduGreen-600 border-eduGreen-500 text-zinc-900 dark:text-white hover:bg-eduGreen-500 shadow-lg shadow-eduGreen-900/20 active:scale-95 transition-all"
                    >
                        <Printer className="w-4 h-4 mr-2" /> Export PDF Registry
                    </Button>

                    <Button
                        onClick={handleSave}
                        disabled={saving || isReadOnly}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-12 px-8 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-eduGreen-900/20 disabled:opacity-50"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Securing..." : isTermCompleted ? "Term Concluded" : exam.isLocked ? "Locked" : "Save Grades"}
                    </Button>
                </div>
            </div>

            {/* Hidden Print Target */}
            <div className="hidden">
                <AssessmentPrint
                    ref={printRef}
                    exam={exam}
                    students={students}
                />
            </div>

            {/* Table */}
            <Card className="border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-zinc-800 text-[10px] font-black tracking-widest text-slate-500 dark:text-zinc-400 uppercase bg-slate-50/50 dark:bg-zinc-950/50">
                                    <th className="p-4 sm:p-5">Scholar</th>
                                    <th className="p-4 sm:p-5 text-center w-36">Score (/{exam.totalMarks})</th>
                                    <th className="p-4 sm:p-5 text-center w-28">Grade</th>
                                    <th className="p-4 sm:p-5">Feedback & Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-sm font-medium">
                                {students.map((student, idx) => {
                                    const scoreNum = parseFloat(student.score);
                                    const pct = !isNaN(scoreNum) ? (scoreNum / exam.totalMarks) * 100 : 0;
                                    const perf = getPerformanceColor(pct);

                                    return (
                                        <tr key={student.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                                            <td className="p-4 sm:p-5">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {student.name || `${student.firstName || ''} ${student.lastName || ''}`}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                                                    {student.studentCode || student.code || "REG-#" + (idx + 1)}
                                                </div>
                                            </td>
                                            <td className="p-4 sm:p-5 text-center">
                                                <Input
                                                    type="number"
                                                    disabled={isReadOnly}
                                                    readOnly={isReadOnly}
                                                    value={student.score ?? ""}
                                                    onChange={(e) => handleMarkChange(student.id, 'score', e.target.value)}
                                                    placeholder="-"
                                                    max={exam.totalMarks}
                                                    min={0}
                                                    className="w-24 mx-auto text-center font-bold text-base h-10 rounded-xl bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 disabled:opacity-80 disabled:cursor-not-allowed"
                                                />
                                            </td>
                                            <td className="p-4 sm:p-5 text-center">
                                                <span className={`inline-flex items-center justify-center font-black px-3 py-1 rounded-lg text-xs border ${perf.bg} ${perf.border} ${perf.text}`}>
                                                    {calculateGrade(student.score, exam.totalMarks)}
                                                </span>
                                            </td>
                                            <td className="p-4 sm:p-5">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        disabled={isReadOnly}
                                                        readOnly={isReadOnly}
                                                        value={student.remark ?? ""}
                                                        onChange={(e) => handleMarkChange(student.id, 'remark', e.target.value)}
                                                        placeholder={isReadOnly ? "No observations recorded" : "Add academic remarks..."}
                                                        className="h-10 rounded-xl bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-xs flex-1 disabled:opacity-80 disabled:cursor-not-allowed"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        disabled={isReadOnly || generatingFeedbackId === student.id}
                                                        onClick={() => handleGenerateFeedback(student.id, student.score, exam)}
                                                        className="h-10 w-10 shrink-0 rounded-xl border-slate-200 dark:border-zinc-800 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30 disabled:opacity-40"
                                                        title="Generate AI Academic Remark"
                                                    >
                                                        <Sparkles className={`w-4 h-4 ${generatingFeedbackId === student.id ? 'animate-spin text-emerald-500' : ''}`} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
