"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertModal } from "@/components/ui/confirmation-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
    Save, ArrowLeft, CheckCircle, List, AlignLeft,
    FileText, CheckCircle2, XCircle, Loader2, Zap, Brain, MessageSquare,
    History, Edit, Printer, Search, Filter, ShieldAlert, Check, X, Award, BarChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";
import { AssessmentPrint } from "@/components/dashboard/assessment-print";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function GradebookPage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.examId as string;

    const [exam, setExam] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [grades, setGrades] = useState<{ [studentId: string]: string }>({});
    const [attendance, setAttendance] = useState<{ [studentId: string]: string }>({});
    const [reasons, setReasons] = useState<{ [studentId: string]: string }>({});
    const [remarks, setRemarks] = useState<{ [studentId: string]: string }>({});
    const [statuses, setStatuses] = useState<{ [studentId: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });

    // Filter and Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${exam?.title}_Results_${format(new Date(), 'yyyy-MM-dd')}`,
    });

    useEffect(() => {
        if (examId) fetchData();
    }, [examId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/teacher/grades?examId=${examId}`);
            const data = (await res.json()) as any;

            if (data.exam) {
                setExam(data.exam);
                setAttempts(data.attempts || []);

                // Fetch only the students in this exam's class directly
                const resStudents = await fetch(`/api/school/students?classId=${data.exam.classId}`);
                const studentsData = (await resStudents.json()) as any;
                if (studentsData.students) {
                    setStudents(studentsData.students);
                }

                const gradeMap: any = {};
                const remarkMap: any = {};
                const statusMap: any = {};

                if (data.graderecords) {
                    data.graderecords.forEach((g: any) => {
                        gradeMap[g.studentId] = g.score.toString();
                        remarkMap[g.studentId] = g.remark || "";
                        statusMap[g.studentId] = g.status || "SUBMITTED";
                    });
                }

                // Pre-populate grades from attempts if no grade record exists
                if (data.attempts) {
                    data.attempts.forEach((att: any) => {
                        if (gradeMap[att.studentId] === undefined) {
                            gradeMap[att.studentId] = att.score.toString();
                            statusMap[att.studentId] = att.status || "SUBMITTED";
                        }
                    });
                }

                setGrades(gradeMap);
                setRemarks(remarkMap);
                setStatuses(statusMap);

                const resAtt = await fetch(`/api/teacher/attendance?examId=${examId}`);
                const attData = (await resAtt.json()) as any;
                if (attData.records) {
                    const attMap: any = {};
                    const reasonMap: any = {};
                    attData.records.forEach((r: any) => {
                        attMap[r.studentId] = r.status;
                        reasonMap[r.studentId] = r.reason || "";
                    });
                    setAttendance(attMap);
                    setReasons(reasonMap);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const gradesToSubmit = Object.entries(grades).map(([studentId, score]) => ({
                studentId,
                score,
                remark: remarks[studentId] || "",
                status: statuses[studentId] || "SUBMITTED"
            }));

            const attendanceToSubmit = Object.entries(attendance).map(([studentId, status]) => ({
                studentId,
                status,
                reason: reasons[studentId] || ""
            }));

            await fetch('/api/teacher/grades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId,
                    grades: gradesToSubmit,
                    attendance: attendanceToSubmit
                })
            });
            setAlertConfig({
                title: "Academic Data Archived",
                message: "Institutional performance records have been successfully encrypted and finalized.",
                isOpen: true,
                variant: "success"
            });
            fetchData();
        } catch (e) {
            console.error(e);
            setAlertConfig({
                title: "Data Integrity Fault",
                message: "The synchronization sequence for performance records was interrupted.",
                isOpen: true,
                variant: "error"
            });
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!confirm("Are you sure you want to publish these results? This will make them visible to students and parents.")) return;
        setSaving(true);
        try {
            await fetch(`/api/teacher/exams/${examId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: true, isLocked: true })
            });
            setAlertConfig({ title: "Results Published", message: "Broadcasting finalized data...", isOpen: true, variant: "success" });
            fetchData();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleBulkReview = () => {
        const newStatuses = { ...statuses };
        students.forEach((s: any) => {
            if (attendance[s.id] !== 'ABSENT') newStatuses[s.id] = 'REVIEWED';
        });
        setStatuses(newStatuses);
        toast.success("All active records marked as reviewed.");
    };

    const handleApplyAllAiScores = () => {
        const newGrades = { ...grades };
        attempts.forEach(att => {
            if (att.studentId && att.score !== undefined) {
                newGrades[att.studentId] = att.score.toString();
            }
        });
        setGrades(newGrades);
        toast.success("AI auto-grades mapped to official records.");
    };

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <SpringingLoader message="Querying Assessment Registry..." />
        </div>
    );
    if (!exam) return <div className="p-20 text-center text-zinc-500 uppercase tracking-widest font-black">Exam Not Discovered</div>;

    const isLocked = exam.isLocked;
    const maxScore = exam.totalMarks || exam.config?.maxScore || 100;

    // Calculate dynamic stats
    const totalCount = students.length;
    const activeStudents = students.filter(s => attendance[s.id] !== 'ABSENT');
    const presentCount = activeStudents.length;
    const gradedCount = students.filter(s => grades[s.id] !== undefined && grades[s.id] !== "" && attendance[s.id] !== 'ABSENT').length;
    const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    const sumScores = students.reduce((acc, s) => {
        if (attendance[s.id] === 'ABSENT' || !grades[s.id]) return acc;
        const sc = parseFloat(grades[s.id]);
        return acc + (isNaN(sc) ? 0 : sc);
    }, 0);
    const classAverage = presentCount > 0 ? (sumScores / presentCount).toFixed(1) : "0.0";
    const averagePercentage = maxScore > 0 ? Math.round((parseFloat(classAverage) / maxScore) * 100) : 0;

    // Filtered list
    const filteredStudents = students.filter((student) => {
        const name = `${student.firstName} ${student.lastName}`.toLowerCase();
        const code = (student.studentCode || "").toLowerCase();
        const matchesSearch = name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());

        const isGraded = grades[student.id] !== undefined && grades[student.id] !== "";
        const isAbsent = attendance[student.id] === "ABSENT";

        let matchesFilter = true;
        if (statusFilter === "GRADED") {
            matchesFilter = isGraded && !isAbsent;
        } else if (statusFilter === "PENDING") {
            matchesFilter = !isGraded && !isAbsent;
        } else if (statusFilter === "ABSENT") {
            matchesFilter = isAbsent;
        }

        return matchesSearch && matchesFilter;
    });

    const getPerformanceColor = (pct: number) => {
        if (pct >= 80) return "text-emerald-500";
        if (pct >= 60) return "text-blue-500";
        if (pct >= 40) return "text-amber-500";
        return "text-rose-500";
    };

    const getPerformanceBorder = (pct: number) => {
        if (pct >= 80) return "border-l-emerald-500";
        if (pct >= 60) return "border-l-blue-500";
        if (pct >= 40) return "border-l-amber-500";
        return "border-l-rose-500";
    };

    const SubmissionReviewModal = ({ student }: { student: any }) => {
        const attempt = attempts.find((a: any) => a.studentId === student.id);
        const questions = exam.questions || [];
        const gradingDetails = (attempt?.metadata?.gradingDetails) || [];
        const aiScore = attempt ? parseFloat(attempt.score.toString()).toFixed(1) : "0.0";

        const applyAiScore = () => {
            setGrades(prev => ({ ...prev, [student.id]: aiScore }));
            setAlertConfig({
                title: "Score Synchronized",
                message: `${student.firstName}'s automated score has been transferred to the official record.`,
                isOpen: true,
                variant: "success"
            });
            setIsReviewOpen(false);
        };

        return (
            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-900 rounded-[2.5rem] p-10 shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-eduGreen-900/20 rounded-2xl flex items-center justify-center border border-eduGreen-500/20">
                                <Brain className="w-6 h-6 text-eduGreen-500 animate-pulse" />
                            </div>
                            <div>
                                <DialogTitle className="text-3xl font-black text-white italic uppercase">{student.firstName}'s Audit</DialogTitle>
                                <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Neural Assessment Breakdown</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {!attempt ? (
                        <div className="text-center py-20 text-zinc-600 font-bold uppercase tracking-widest">No valid submission record found.</div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-3 gap-6">
                                <Card className="bg-zinc-900/40 border-zinc-900 rounded-3xl p-6 relative group overflow-hidden">
                                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Auto-Score</div>
                                    <div className="text-4xl font-black text-white italic">
                                        {aiScore} <span className="text-lg text-zinc-500">/ {maxScore}</span>
                                        <span className="ml-3 text-sm text-emerald-500 font-medium">({((parseFloat(aiScore) / maxScore) * 100).toFixed(0)}%)</span>
                                    </div>
                                    <div className="absolute inset-0 bg-eduGreen-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <Button onClick={applyAiScore} variant="ghost" className="text-eduGreen-400 font-black uppercase text-[10px] tracking-widest gap-2">
                                            <Zap className="w-3 h-3" /> Apply to Record
                                        </Button>
                                    </div>
                                </Card>
                                <Card className="bg-zinc-900/40 border-zinc-900 rounded-3xl p-6">
                                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Submitted</div>
                                    <div className="text-xl font-bold text-zinc-300">{new Date(attempt.submittedAt).toLocaleTimeString()}</div>
                                </Card>
                                <Card className="bg-zinc-900/40 border-zinc-900 rounded-3xl p-6">
                                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Verdict</div>
                                    <div className="text-xl font-bold text-zinc-300">VALIDATED</div>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                {questions.map((q: any, i: number) => {
                                    const studentAns = attempt.answers[q.id];
                                    const grading = gradingDetails.find((d: any) => d.id === q.id);

                                    return (
                                        <div key={q.id} className="bg-zinc-900/20 border border-zinc-900 rounded-3xl p-8 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="border-zinc-800 text-zinc-600 font-black">Q{i + 1}</Badge>
                                                    <h4 className="font-bold text-zinc-200">{q.text}</h4>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-black text-eduGreen-500 italic">{grading?.score || 0}/{q.points}</div>
                                                    <div className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Points Secured</div>
                                                </div>
                                            </div>

                                            <div className="pl-4 border-l-2 border-zinc-800 space-y-2">
                                                <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Student Response</div>
                                                <p className="text-sm text-zinc-400 italic">"{studentAns || "No response provided"}"</p>
                                            </div>

                                            {grading?.feedback && (
                                                <div className="bg-eduGreen-950/20 border border-eduGreen-900/30 rounded-2xl p-4 flex gap-3">
                                                    <Brain className="w-5 h-5 text-eduGreen-500 shrink-0" />
                                                    <div>
                                                        <div className="text-[9px] font-black text-eduGreen-500 uppercase tracking-widest mb-1">Neural Grading Logic</div>
                                                        <p className="text-xs text-zinc-300 italic">"{grading.feedback}"</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between items-center pt-6 border-t border-zinc-900">
                                <Button onClick={applyAiScore} className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-black uppercase tracking-widest px-8 rounded-2xl h-14 gap-2">
                                    <Save className="w-4 h-4" /> Authorize AI Score
                                </Button>
                                <Button onClick={() => setIsReviewOpen(false)} variant="ghost" className="text-zinc-500 hover:text-white font-black uppercase tracking-widest px-10 rounded-2xl h-14">
                                    Exit Audit
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        );
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-300 pb-40">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900 pb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/teacher/exams">
                        <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-white rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-white italic uppercase tracking-tight">
                                {exam.title}
                            </h1>
                            {exam.isPublished ? (
                                <Badge className="bg-eduGreen-600 text-white border-0 uppercase text-[9px] font-black tracking-widest px-3 py-1 rounded-lg">Published</Badge>
                            ) : exam.isLocked ? (
                                <Badge className="bg-amber-600 text-white border-0 uppercase text-[9px] font-black tracking-widest px-3 py-1 rounded-lg">Finalized</Badge>
                            ) : (
                                <Badge className="bg-zinc-800 text-zinc-400 border-0 uppercase text-[9px] font-black tracking-widest px-3 py-1 rounded-lg">Draft Mode</Badge>
                            )}
                        </div>
                        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-1">
                            {exam.subject?.name} • Class {exam.class?.name}
                        </p>
                    </div>
                </div>

                {!exam.isPublished && (
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => handlePrint()}
                            className="bg-zinc-950 border border-zinc-900 hover:border-eduGreen-500/30 text-white h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[9px] gap-2 transition-all"
                        >
                            <Printer className="w-4 h-4 text-eduGreen-500" /> Export PDF Registry
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleBulkReview}
                            className="bg-zinc-950 border border-zinc-900 text-zinc-500 hover:text-white h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all"
                        >
                            Secure All
                        </Button>
                        <Button
                            onClick={handleSave}
                            isLoading={saving}
                            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[9px] gap-2 transition-all"
                        >
                            <History className="w-4 h-4 text-zinc-400" /> Log Draft
                        </Button>
                        <Button
                            onClick={handlePublish}
                            isLoading={saving}
                            className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-12 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-eduGreen-900/20 active:scale-95 transition-all"
                        >
                            Authorize & Publish
                        </Button>
                    </div>
                )}
            </div>

            {/* Performance Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-zinc-950/40 backdrop-blur-md border-zinc-900 rounded-[2rem] p-6 flex flex-col justify-between group hover:border-zinc-800 transition-all">
                    <div>
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-zinc-500" /> Grading Progress
                        </span>
                        <div className="text-3xl font-black text-white italic tracking-tight mt-2">
                            {gradedCount} <span className="text-zinc-600 text-lg">/ {totalCount}</span>
                        </div>
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-eduGreen-500 rounded-full transition-all duration-500"
                            style={{ width: `${totalCount > 0 ? (gradedCount / totalCount) * 100 : 0}%` }}
                        />
                    </div>
                </Card>

                <Card className="bg-zinc-950/40 backdrop-blur-md border-zinc-900 rounded-[2rem] p-6 flex flex-col justify-between group hover:border-zinc-800 transition-all">
                    <div>
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-zinc-500" /> Class Average
                        </span>
                        <div className="text-3xl font-black text-white italic tracking-tight mt-2">
                            {classAverage} <span className="text-zinc-600 text-lg">/ {maxScore}</span>
                        </div>
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${averagePercentage}%` }}
                        />
                    </div>
                </Card>

                <Card className="bg-zinc-950/40 backdrop-blur-md border-zinc-900 rounded-[2rem] p-6 flex flex-col justify-between group hover:border-zinc-800 transition-all">
                    <div>
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-zinc-500" /> Participation
                        </span>
                        <div className="text-3xl font-black text-white italic tracking-tight mt-2">
                            {attendanceRate}%
                        </div>
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${attendanceRate}%` }}
                        />
                    </div>
                </Card>

                <Card className="bg-zinc-950/40 backdrop-blur-md border-zinc-900 rounded-[2rem] p-6 flex flex-col justify-between group hover:border-zinc-800 transition-all">
                    <div>
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-zinc-500" /> MCQ Attempts
                        </span>
                        <div className="text-3xl font-black text-white italic tracking-tight mt-2">
                            {attempts.length} <span className="text-zinc-600 text-lg">Synced</span>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-3 items-center">
                        <Button
                            type="button"
                            onClick={handleApplyAllAiScores}
                            disabled={isLocked || attempts.length === 0}
                            className="h-7 w-full bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                        >
                            Sync All AI Scores
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-zinc-950/40 border border-zinc-900/60 p-4 rounded-3xl backdrop-blur-xl">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-eduGreen-500 transition-colors" />
                    <Input
                        placeholder="Search student by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-12 pl-12 bg-zinc-900/40 border-zinc-900 rounded-2xl focus:border-eduGreen-600 text-xs text-white transition-all placeholder:text-zinc-700"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-12 bg-zinc-900/40 border-zinc-900 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500 w-full md:w-48">
                            <div className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5" />
                                <SelectValue placeholder="FILTER" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-900 text-white rounded-2xl">
                            <SelectItem value="ALL">All Entries</SelectItem>
                            <SelectItem value="GRADED">Graded</SelectItem>
                            <SelectItem value="PENDING">Pending Grade</SelectItem>
                            <SelectItem value="ABSENT">Absent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Registry List Grid */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filteredStudents.map((student: any, idx: number) => {
                        const currentStatus = attendance[student.id] || "PRESENT";
                        const isAbsent = currentStatus === 'ABSENT';
                        const attempt = attempts.find((a: any) => a.studentId === student.id);
                        
                        const score = isAbsent ? "" : (grades[student.id] || "");
                        const pct = score ? Math.min(100, Math.max(0, (parseFloat(score) / maxScore) * 100)) : 0;

                        let cardBorderClass = "border-l-zinc-900";
                        let textColor = "text-zinc-500";
                        let barColor = "bg-zinc-800";

                        if (!isAbsent && score) {
                            cardBorderClass = getPerformanceBorder(pct);
                            textColor = getPerformanceColor(pct);
                            if (pct >= 80) barColor = "bg-emerald-500 shadow-[0_0_10px_#10b981]";
                            else if (pct >= 60) barColor = "bg-blue-500 shadow-[0_0_10px_#3b82f6]";
                            else if (pct >= 40) barColor = "bg-amber-500 shadow-[0_0_10px_#f59e0b]";
                            else barColor = "bg-rose-500 shadow-[0_0_10px_#f43f5e]";
                        } else if (isAbsent) {
                            cardBorderClass = "border-l-rose-950/40";
                        }

                        return (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className={cn(
                                    "p-6 rounded-[2rem] bg-zinc-950/40 border border-zinc-900/60 backdrop-blur-xl border-l-4 transition-all duration-300 hover:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative group overflow-hidden",
                                    cardBorderClass,
                                    isAbsent && "opacity-60 bg-red-950/5"
                                )}
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center font-black text-zinc-500 text-xs italic">
                                        #{String(idx + 1).padStart(2, '0')}
                                    </div>
                                    <div>
                                        <Link href={`/dashboard/students/${student.id}`} className="font-black text-white hover:text-eduGreen-500 transition-all text-base uppercase tracking-tight block">
                                            {student.firstName} {student.lastName}
                                        </Link>
                                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest font-mono mt-0.5 block">{student.studentCode}</span>
                                    </div>
                                </div>

                                {/* Attendance Segment Controller */}
                                <div className="flex bg-zinc-950/60 p-1 rounded-xl border border-zinc-900 w-fit shrink-0">
                                    <button
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => setAttendance({ ...attendance, [student.id]: 'PRESENT' })}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                            currentStatus === 'PRESENT'
                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                : "text-zinc-600 hover:text-zinc-400 border border-transparent"
                                        )}
                                    >
                                        Present
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => {
                                            setAttendance({ ...attendance, [student.id]: 'ABSENT' });
                                            setGrades({ ...grades, [student.id]: "" });
                                        }}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                            currentStatus === 'ABSENT'
                                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                : "text-zinc-600 hover:text-zinc-400 border border-transparent"
                                        )}
                                    >
                                        Absent
                                    </button>
                                </div>

                                {/* MCQ Attempt Info */}
                                <div className="flex items-center gap-4 shrink-0 min-w-[200px]">
                                    {attempt ? (
                                        <div className="flex items-center gap-2">
                                            <div className="px-3 py-1.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-purple-400 font-black uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                                                <Brain className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                                                AI Score: {parseFloat(attempt.score.toString()).toFixed(1)} / {maxScore}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => { setSelectedStudent(student); setIsReviewOpen(true); }}
                                                className="h-8 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all text-[8px] uppercase tracking-widest"
                                            >
                                                Audit Detail
                                            </Button>
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-bold text-zinc-700 uppercase italic tracking-widest">No MCQ Attempt</span>
                                    )}
                                </div>

                                {/* Grading and visual gauge */}
                                <div className="flex items-center gap-6 shrink-0">
                                    <div className="flex flex-col gap-2 w-48">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                disabled={isLocked || isAbsent}
                                                type="number"
                                                min="0"
                                                max={maxScore}
                                                step="0.5"
                                                placeholder="—"
                                                className={cn(
                                                    "text-right font-black font-mono h-11 bg-zinc-950 border-zinc-900 w-24 rounded-xl focus:border-eduGreen-500 text-sm",
                                                    !isAbsent && grades[student.id] ? textColor : "text-zinc-500"
                                                )}
                                                value={isAbsent ? "" : (grades[student.id] || "")}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (parseFloat(val) > maxScore) return;
                                                    setGrades({ ...grades, [student.id]: val });
                                                }}
                                            />
                                            <span className="text-[10px] font-black text-zinc-700 uppercase">/ {maxScore}</span>
                                        </div>
                                        {!isAbsent && (
                                            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden relative">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-300", barColor)}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Observation input */}
                                    <Input
                                        disabled={isLocked}
                                        placeholder="Observation remark..."
                                        value={remarks[student.id] || ""}
                                        onChange={(e) => setRemarks({ ...remarks, [student.id]: e.target.value })}
                                        className="h-11 bg-zinc-950/50 border-zinc-900 rounded-xl placeholder:italic text-xs text-zinc-400 w-full lg:w-48"
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filteredStudents.length === 0 && (
                    <div className="py-24 border-2 border-dashed border-zinc-900 rounded-[3rem] text-center bg-zinc-950/20">
                        <div className="text-zinc-700 font-bold uppercase tracking-[0.4em] text-xs italic">Matrix Query Vacant</div>
                        <p className="text-zinc-800 mt-2 text-[10px] font-bold uppercase tracking-widest">No matching students found in this scope.</p>
                    </div>
                )}
            </div>

            {selectedStudent && <SubmissionReviewModal student={selectedStudent} />}

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig((prev: any) => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                variant={alertConfig.variant}
            />

            {/* Hidden Print Template */}
            <div className="absolute -left-[9999px] top-0 overflow-hidden" aria-hidden="true">
                <AssessmentPrint
                    ref={printRef}
                    exam={exam}
                    students={students.map(s => ({
                        ...s,
                        score: grades[s.id] || "0",
                        attendance: attendance[s.id] || "PRESENT",
                        remark: remarks[s.id] || ""
                    }))}
                />
            </div>
        </div>
    );
}
