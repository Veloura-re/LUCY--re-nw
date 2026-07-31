"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Save, Lock, Unlock, Download, Calculator, FileDown, Printer, Sparkles } from "lucide-react";
import Link from "next/link";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { AlertModal } from "@/components/ui/confirmation-modal";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { AssessmentPrint } from "@/components/dashboard/assessment-print";
import { format } from "date-fns";
import { toast } from "sonner";

export default function MarklistEntryPage() {
    const params = useParams();
    const router = useRouter();
    const [exam, setExam] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [generatingFeedbackId, setGeneratingFeedbackId] = useState<string | null>(null);

    // Backup for dirty checking?
    const [initialStudents, setInitialStudents] = useState<any[]>([]);

    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAlert, setShowAlert] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${exam?.title}_${exam?.className}_${new Date().toISOString().slice(0, 10)}`,
    });


    useEffect(() => {
        if (params.id) fetchDetails();
    }, [params.id]);

    const fetchDetails = async () => {
        try {
            const res = await fetch(`/api/school/marklists/${params.id}/marks`);
            const data = await res.json();
            if (data.exam) {
                setExam(data.exam);
                setStudents(data.students);
                setInitialStudents(JSON.parse(JSON.stringify(data.students)));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setFetching(false);
        }
    };

    const handleMarkChange = (id: string, field: 'score' | 'remark', value: string) => {
        setStudents(prev => prev.map(s => {
            if (s.id === id) {
                return { ...s, [field]: value };
            }
            return s;
        }));
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

    const handleGenerateFeedback = async (studentId: string, score: any, exam: any) => {
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
                    maxScore: exam.totalMarks,
                    subject: exam.subjectName
                })
            });
            if (res.ok) {
                const data = await res.json();
                handleMarkChange(studentId, 'remark', data.feedback);
                toast.success("AI Feedback Generated");
            } else {
                toast.error("Failed to generate feedback");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setGeneratingFeedbackId(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Prepare payload
            const marks = students.map(s => ({
                studentId: s.id,
                score: s.score || 0,
                remark: s.remark
            }));

            const res = await fetch(`/api/school/marklists/${params.id}/marks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ marks })
            });

            if (res.ok) {
                setShowAlert(true);
                // Refresh? Or just update initial
                setInitialStudents(JSON.parse(JSON.stringify(students)));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const getStats = () => {
        if (!students.length) return { avg: 0, pass: 0 };
        const scored = students.filter(s => s.score !== null && s.score !== undefined && s.score !== "");
        if (!scored.length) return { avg: 0, pass: 0 };

        const totalScore = scored.reduce((acc, s) => acc + (parseFloat(s.score) || 0), 0);
        const avg = totalScore / scored.length;

        // Assume pass is 40%?
        const pass = scored.filter(s => (parseFloat(s.score) || 0) >= (exam.totalMarks * 0.4)).length;
        const passPct = (pass / scored.length) * 100;

        return { avg, passPct };
    };

    if (fetching) return <div className="min-h-[60vh] flex items-center justify-center"><SpringingLoader message="Loading Grading Sheet" /></div>;
    if (!exam) return <div className="p-10 text-zinc-900 dark:text-white">Assessment not found</div>;

    const stats = getStats();

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 relative z-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/marklist">
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-900">
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-black text-eduGreen-500 uppercase tracking-widest bg-eduGreen-900/10 px-2 py-1 rounded-lg">
                                {exam.category?.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest bg-zinc-100/50 dark:bg-zinc-900/50 px-2 py-1 rounded-lg">
                                {exam.totalMarks} Marks
                            </span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">{exam.title}</h1>
                        <p className="text-zinc-600 dark:text-zinc-500 font-bold text-sm mt-1">{exam.className} • {exam.subjectName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Class Average</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white">{stats.avg.toFixed(1)}</span>
                    </div>


                    <Button
                        onClick={() => handlePrint()}
                        className="h-12 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest bg-eduGreen-600 border-eduGreen-500 text-zinc-900 dark:text-white hover:bg-eduGreen-500 shadow-lg shadow-eduGreen-900/20 active:scale-95 transition-all"
                    >
                        <Printer className="w-4 h-4 mr-2" /> Export PDF Registry
                    </Button>

                    <Button
                        onClick={handleSave}
                        isLoading={saving}
                        disabled={exam.isLocked}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-12 px-8 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-eduGreen-900/20"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Save Grades
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2rem]  border-t-zinc-800/20 shadow-2xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-500">
                                <tr>
                                    <th className="p-6 w-20">#</th>
                                    <th className="p-6">Student</th>
                                    <th className="p-6 w-40 text-center">Score ({exam.totalMarks})</th>
                                    <th className="p-6 w-32 text-center">Percent</th>
                                    <th className="p-6 w-24 text-center">Grade</th>
                                    <th className="p-6 w-1/3">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900/50 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                {students.map((student, idx) => {
                                    const scoreVal = parseFloat(student.score);
                                    const pct = !isNaN(scoreVal) ? ((scoreVal / exam.totalMarks) * 100).toFixed(1) : "-";
                                    const grade = calculateGrade(student.score, exam.totalMarks);

                                    return (
                                        <tr key={student.id} className="hover:bg-zinc-200 dark:hover:bg-zinc-900/30 transition-colors group">
                                            <td className="p-6 text-zinc-600 font-mono text-xs">{idx + 1}</td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center font-black text-zinc-600 text-xs">
                                                        {student.firstName[0]}{student.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <div className="text-zinc-900 dark:text-white">{student.firstName} {student.lastName}</div>
                                                        <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">{student.studentCode}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <Input
                                                    type="number"
                                                    disabled={exam.isLocked}
                                                    value={student.score ?? ""}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value);
                                                        if (val > exam.totalMarks) return; // Prevent > max
                                                        handleMarkChange(student.id, 'score', e.target.value);
                                                    }}
                                                    className={`h-12 text-center font-mono font-black text-lg bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 focus:border-eduGreen-500 rounded-xl transition-all ${student.score === "" ? 'text-zinc-700' : getPerformanceColor(parseFloat(pct)).text
                                                        }`}
                                                />
                                            </td>
                                            <td className={`p-6 text-center font-mono ${pct !== "-" ? getPerformanceColor(parseFloat(pct)).text : 'text-zinc-600 dark:text-zinc-500'}`}>{pct}%</td>
                                            <td className="p-6 text-center">
                                                <span className={`px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900 border text-xs ${pct !== "-" ? `${getPerformanceColor(parseFloat(pct)).text} ${getPerformanceColor(parseFloat(pct)).border}` : 'text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800'}`}>
                                                    {grade}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        disabled={exam.isLocked}
                                                        placeholder="Add remark..."
                                                        value={student.remark || ""}
                                                        onChange={e => handleMarkChange(student.id, 'remark', e.target.value)}
                                                        className="bg-transparent border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-900/50 hover:border-zinc-800 focus:bg-zinc-100 dark:bg-zinc-900 focus:border-eduGreen-800 transition-all placeholder:text-zinc-800 dark:text-zinc-200 text-zinc-600 dark:text-zinc-400"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={exam.isLocked || generatingFeedbackId === student.id}
                                                        onClick={() => handleGenerateFeedback(student.id, student.score, exam)}
                                                        className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 flex-shrink-0"
                                                        title="Generate AI Feedback"
                                                    >
                                                        {generatingFeedbackId === student.id ? (
                                                            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                                        ) : (
                                                            <Sparkles className="w-4 h-4" />
                                                        )}
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

            <AlertModal
                isOpen={showAlert}
                onClose={() => setShowAlert(false)}
                title="Grades Recorded"
                message="Assessment scores have been successfully synchronized to the academic registry."
                variant="success"
            />

            {/* Hidden Print Template */}
            <div className="sr-only" aria-hidden="true">
                <AssessmentPrint ref={printRef} exam={exam} students={students} />
            </div>
        </div>
    );
}
