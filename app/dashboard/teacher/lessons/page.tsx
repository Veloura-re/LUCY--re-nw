"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    BookOpen, Calendar, Clock, ChevronRight, Loader2,
    Plus, Filter, Pencil, GraduationCap, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function TeacherLessonsPage() {
    const [lessons, setLessons] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [classFilter, setClassFilter] = useState("ALL");
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        classId: "", subjectId: "", date: format(new Date(), 'yyyy-MM-dd'),
        topic: "", objectives: "", periodId: ""
    });

    useEffect(() => {
        Promise.all([
            fetch('/api/teacher/lessons').then(r => r.json()),
            fetch('/api/teacher/classes').then(r => r.json()),
        ]).then(([lessonData, classData]) => {
            setLessons(lessonData.lessons || []);
            setClasses(classData.classes || []);
        }).catch(() => toast.error("Failed to sync lesson ledger"))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async () => {
        if (!form.classId || !form.topic || !form.date) {
            toast.error("Class, date and topic are required");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/teacher/lessons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (res.ok) {
                // Refetch
                const updated = await fetch('/api/teacher/lessons').then(r => r.json());
                setLessons(updated.lessons || []);
                setShowModal(false);
                setForm({ classId: "", subjectId: "", date: format(new Date(), 'yyyy-MM-dd'), topic: "", objectives: "", periodId: "" });
                toast.success("Lesson logged");
            } else {
                toast.error(data.error || "Failed to log lesson");
            }
        } catch {
            toast.error("Connection error");
        } finally {
            setSubmitting(false);
        }
    };

    // unique classes from assigned
    const uniqueClasses = Array.from(new Map(classes.map((c: any) => [c.classId, { id: c.classId, name: c.className }])).values());
    const filtered = classFilter === "ALL" ? lessons : lessons.filter((l: any) => l.classId === classFilter);

    // Selected class subjects for form
    const selectedClassSubjects = classes.filter((c: any) => c.classId === form.classId);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-10 h-10 text-eduGreen-500 animate-spin" />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Lesson <span className="text-eduGreen-500 italic">Ledger</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">
                        Faculty teaching log — {lessons.length} entries recorded
                    </p>
                </div>
                <Button
                    onClick={() => setShowModal(true)}
                    className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-12 px-8 rounded-2xl font-medium text-[10px] uppercase tracking-widest"
                >
                    <Plus className="w-4 h-4 mr-2" /> Log Lesson
                </Button>
            </div>

            {/* Class filter */}
            <div className="flex gap-2 flex-wrap">
                <Button
                    variant="ghost"
                    onClick={() => setClassFilter("ALL")}
                    className={cn("h-10 px-5 rounded-xl text-[10px] font-medium uppercase tracking-widest",
                        classFilter === "ALL" ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-800" : "text-zinc-600 hover:text-zinc-300")}
                >
                    All Classes
                </Button>
                {uniqueClasses.map((cls: any) => (
                    <Button
                        key={cls.id}
                        variant="ghost"
                        onClick={() => setClassFilter(cls.id)}
                        className={cn("h-10 px-5 rounded-xl text-[10px] font-medium uppercase tracking-widest",
                            classFilter === cls.id ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-800" : "text-zinc-600 hover:text-zinc-300")}
                    >
                        {cls.name}
                    </Button>
                ))}
            </div>

            {/* Lessons list */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filtered.length > 0 ? filtered.map((lesson: any, idx: number) => (
                        <motion.div
                            key={lesson.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: idx * 0.03, duration: 0.15 }}
                        >
                            <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900/50 rounded-[2rem] hover:border-zinc-800 transition-all group">
                                <CardContent className="p-6 md:p-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-start gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-eduGreen-950/30 border border-eduGreen-900/30 flex items-center justify-center shrink-0 group-hover:border-eduGreen-700/40 transition-colors">
                                                <BookOpen className="w-6 h-6 text-eduGreen-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight">{lesson.topic}</h3>
                                                    <Badge className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 text-[8px] font-mono tracking-widest">{lesson.subject?.name}</Badge>
                                                    <Badge className="bg-zinc-100 dark:bg-zinc-900 text-eduGreen-500 border-zinc-300 dark:border-zinc-800 text-[8px] tracking-widest">{lesson.class?.name}</Badge>
                                                </div>
                                                {lesson.objectives && (
                                                    <p className="text-zinc-600 dark:text-zinc-500 text-xs mt-2 italic leading-relaxed max-w-xl">{lesson.objectives}</p>
                                                )}
                                                <div className="flex items-center gap-4 mt-3 text-[9px] font-medium text-zinc-700 uppercase tracking-widest">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(new Date(lesson.date), 'MMM dd, yyyy')}
                                                    </span>
                                                    {lesson.period && (
                                                        <span className="flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3" />
                                                            {lesson.period.name} · {lesson.period.startTime}–{lesson.period.endTime}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <div className="h-[1px] bg-gradient-to-r from-eduGreen-600/20 via-transparent to-transparent group-hover:from-eduGreen-500/40 transition-all" />
                            </Card>
                        </motion.div>
                    )) : (
                        <div className="text-center py-24 border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-[3rem]">
                            <FileText className="w-12 h-12 text-zinc-900 dark:text-white mx-auto mb-6" />
                            <div className="text-zinc-700 font-bold uppercase tracking-[0.5em] text-sm">No Entries Found</div>
                            <p className="text-zinc-800 dark:text-zinc-200 mt-2 text-xs uppercase tracking-widest">Log a lesson to begin populating the ledger.</p>
                            <Button onClick={() => setShowModal(true)} variant="ghost" className="mt-8 text-eduGreen-500 hover:text-eduGreen-400 hover:bg-eduGreen-500/5 font-bold uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl border border-eduGreen-500/20">
                                Log First Lesson
                            </Button>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Log Lesson Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-900 dark:text-white max-w-md rounded-[2.5rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic tracking-tighter">Log Lesson</DialogTitle>
                        <DialogDescription className="text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-widest text-[10px]">Record today's teaching session</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">Class</label>
                            <select
                                value={form.classId}
                                onChange={e => {
                                    const cls = uniqueClasses.find((c: any) => c.id === e.target.value);
                                    const firstSubject = classes.find((c: any) => c.classId === e.target.value);
                                    setForm(f => ({ ...f, classId: e.target.value, subjectId: firstSubject?.subjectId || "" }));
                                }}
                                className="w-full h-12 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-eduGreen-500"
                            >
                                <option value="">Select class...</option>
                                {uniqueClasses.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        {form.classId && (
                            <div>
                                <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">Subject</label>
                                <select
                                    value={form.subjectId}
                                    onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                                    className="w-full h-12 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-eduGreen-500"
                                >
                                    <option value="">Select subject...</option>
                                    {selectedClassSubjects.map((c: any) => (
                                        <option key={c.subjectId} value={c.subjectId}>{c.subjectName}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">Date</label>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="h-12 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">Topic</label>
                            <Input
                                placeholder="e.g. Introduction to Quadratic Equations"
                                value={form.topic}
                                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                                className="h-12 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-1.5">Objectives (optional)</label>
                            <textarea
                                placeholder="Learning outcomes for this session..."
                                value={form.objectives}
                                onChange={e => setForm(f => ({ ...f, objectives: e.target.value }))}
                                rows={3}
                                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-eduGreen-500 resize-none"
                            />
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full h-12 rounded-xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-bold uppercase tracking-widest text-[10px]"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Lesson"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
