"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    BookOpen, Calendar, Clock, Loader2,
    Filter, FileText, Search, User, Download, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import SpringingLoader from "@/components/dashboard/springing-loader";

export default function StudentLessonsPage() {
    const [lessons, setLessons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [subjectFilter, setSubjectFilter] = useState("ALL");

    useEffect(() => {
        fetchLessons();
    }, []);

    const fetchLessons = async () => {
        try {
            const res = await fetch('/api/student/lessons');
            const data = await res.json() as any;
            if (res.ok) {
                setLessons(data.lessons || []);
            } else {
                toast.error(data.error || "Failed to sync lessons");
            }
        } catch {
            toast.error("Connection error while syncing lessons");
        } finally {
            setLoading(false);
        }
    };

    const uniqueSubjects = Array.from(
        new Map(lessons.map((l: any) => [l.subject?.id, l.subject])).values()
    ).filter(Boolean);

    const filteredLessons = lessons.filter((lesson) => {
        const matchesSearch = 
            lesson.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (lesson.objectives && lesson.objectives.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (lesson.teacher?.name && lesson.teacher.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesSubject = subjectFilter === "ALL" || lesson.subjectId === subjectFilter;

        return matchesSearch && matchesSubject;
    });

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <SpringingLoader message="Retrieving Cohort Lessons" />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-300 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white uppercase italic">
                        Lesson <span className="text-eduGreen-500 not-italic">Ledger</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">
                        Your class learning log — {lessons.length} entries synchronized
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <Input
                            placeholder="Search topics or teachers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-12 w-64 pl-12 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-2xl focus:border-eduGreen-500 transition-all font-medium text-xs text-zinc-900 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Subject Filters */}
            <div className="flex gap-2 flex-wrap pb-4">
                <Button
                    variant="ghost"
                    onClick={() => setSubjectFilter("ALL")}
                    className={cn(
                        "rounded-xl h-10 px-5 text-[10px] font-medium uppercase tracking-widest border transition-all whitespace-nowrap",
                        subjectFilter === "ALL" ? "bg-white text-black border-white" : "border-zinc-200 dark:border-zinc-900 text-zinc-600 hover:text-white"
                    )}
                >
                    All Subjects
                </Button>
                {uniqueSubjects.map((sub: any) => (
                    <Button
                        key={sub.id}
                        variant="ghost"
                        onClick={() => setSubjectFilter(sub.id)}
                        className={cn(
                            "rounded-xl h-10 px-5 text-[10px] font-medium uppercase tracking-widest border transition-all whitespace-nowrap",
                            subjectFilter === sub.id ? "bg-eduGreen-600 text-white border-eduGreen-600" : "border-zinc-200 dark:border-zinc-900 text-zinc-600 hover:text-white"
                        )}
                    >
                        {sub.name}
                    </Button>
                ))}
            </div>

            {/* Lessons List */}
            <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                    {filteredLessons.length > 0 ? (
                        filteredLessons.map((lesson: any, idx: number) => {
                            const materialsList = Array.isArray(lesson.materials)
                                ? lesson.materials
                                : typeof lesson.materials === 'string'
                                    ? JSON.parse(lesson.materials)
                                    : [];

                            return (
                                <motion.div
                                    key={lesson.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                                >
                                    <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] hover:border-zinc-800 transition-all group overflow-hidden">
                                        <CardContent className="p-8 space-y-6">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                                <div className="flex items-start gap-6">
                                                    <div className="w-14 h-14 rounded-2xl bg-eduGreen-950/30 border border-eduGreen-900/30 flex items-center justify-center shrink-0 group-hover:border-eduGreen-700/40 transition-colors">
                                                        <BookOpen className="w-6 h-6 text-eduGreen-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight leading-none group-hover:text-eduGreen-500 transition-colors">
                                                                {lesson.topic}
                                                            </h3>
                                                            <Badge className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 text-[8px] font-mono tracking-widest uppercase">
                                                                {lesson.subject?.name}
                                                            </Badge>
                                                        </div>

                                                        {lesson.objectives && (
                                                            <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed max-w-2xl font-medium">
                                                                {lesson.objectives}
                                                            </p>
                                                        )}

                                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                                                            <span className="flex items-center gap-1.5">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {format(new Date(lesson.date), 'MMM dd, yyyy')}
                                                            </span>
                                                            {lesson.period && (
                                                                <span className="flex items-center gap-1.5">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    {lesson.period.name} · {lesson.period.startTime}–{lesson.period.endTime}
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1.5">
                                                                <User className="w-3.5 h-3.5" />
                                                                {lesson.teacher?.name || "Faculty Teacher"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Materials Section (if any materials are attached) */}
                                            {materialsList.length > 0 && (
                                                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-900/50 space-y-3">
                                                    <h4 className="text-[9px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Learning Resources</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {materialsList.map((m: any, i: number) => (
                                                            <div 
                                                                key={i} 
                                                                onClick={() => window.open(m.url, '_blank')}
                                                                className="p-4 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 hover:border-zinc-800 rounded-2xl flex items-center justify-between group/file cursor-pointer transition-all hover:bg-zinc-200 dark:hover:bg-zinc-900/40"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <FileText className="w-4 h-4 text-eduGreen-500" />
                                                                    <span className="text-[10px] font-bold text-zinc-900 dark:text-white tracking-widest uppercase truncate max-w-[200px]">{m.name || 'Resource file'}</span>
                                                                </div>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-600 dark:text-zinc-500 group-hover/file:text-zinc-900 dark:text-white">
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="text-center py-32 border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-[3.5rem] bg-[#050505]/10">
                            <FileText className="w-12 h-12 text-zinc-800 dark:text-zinc-200 mx-auto mb-6 animate-pulse" />
                            <div className="text-zinc-600 font-black uppercase tracking-[0.5em] text-sm">Registry Empty</div>
                            <p className="text-zinc-600 dark:text-zinc-500 mt-2 text-[10px] font-bold uppercase tracking-widest">No lessons have been logged for your cohort class yet.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
