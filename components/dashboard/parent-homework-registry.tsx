"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
    FileText, 
    Calendar, 
    Clock, 
    CheckCircle, 
    ArrowLeft, 
    Download, 
    MessageSquare,
    Brain,
    Zap,
    Activity,
    AlertCircle,
    ChevronRight,
    Search,
    Sparkles,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format, isAfter } from "date-fns";
import Link from "next/link";

interface ParentHomeworkRegistryProps {
    initialAssignments: any[];
    studentName: string;
    studentCode: string;
}

export default function ParentHomeworkRegistry({ initialAssignments, studentName, studentCode }: ParentHomeworkRegistryProps) {
    const [assignments] = useState(initialAssignments);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [parentAnalysis, setParentAnalysis] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);

    const filteredAssignments = assignments.filter(a => 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedAssignment = assignments.find(a => a.id === selectedId);

    return (
        <div className="space-y-12 pb-24">
            {/* Header with Navigation Back */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/dashboard/parent">
                            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent group">
                                <ArrowLeft className="w-5 h-5 text-zinc-700 group-hover:text-zinc-900 dark:hover:text-white transition-colors" />
                            </Button>
                        </Link>
                        <div className="h-[1px] w-8 bg-zinc-200 dark:bg-zinc-800" />
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.4em]">Academic Observatory v1.0</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white italic leading-none uppercase">
                        SCHOLASTIC <span className="text-zinc-800 dark:text-zinc-200 not-italic">REGISTRY</span>
                    </h2>
                    <div className="flex items-center gap-3 mt-4">
                        <span className="px-4 py-1.5 bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 rounded-full text-[9px] font-black uppercase text-zinc-600 dark:text-zinc-400 tracking-widest">{studentName}</span>
                        <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">CODE: {studentCode}</span>
                    </div>
                </motion.div>

                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-zinc-900 dark:text-white transition-colors" />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="FILTER REGISTRY..." 
                        className="w-full bg-white/40 dark:bg-[#050505]/40 backdrop-blur-xl border border-zinc-200 dark:border-white/5 rounded-[1.5rem] h-14 pl-14 text-[10px] font-black tracking-widest text-zinc-900 dark:text-white ring-0 focus:border-zinc-300 dark:border-white/20 transition-all placeholder:text-zinc-800 dark:text-zinc-200 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredAssignments.map((a) => (
                    <RegistryCard 
                        key={a.id} 
                        assignment={a} 
                        onClick={() => {
                            setSelectedId(a.id);
                            setShowDetailModal(true);
                        }}
                    />
                ))}

                {filteredAssignments.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white/40 dark:bg-[#050505]/40 backdrop-blur-xl border border-zinc-200 dark:border-white/5 rounded-[3.5rem] text-center">
                        <Activity className="w-12 h-12 text-zinc-800 dark:text-zinc-200 mb-6 animate-pulse" />
                        <h3 className="text-xl font-black text-zinc-700 italic uppercase">Registry Buffer Empty</h3>
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-2">No synchronized dispatches found for the current filter parameters.</p>
                    </div>
                )}
            </div>

            {/* Detail Modal (Overlay) */}
            <AnimatePresence>
                {showDetailModal && selectedAssignment && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDetailModal(false)}
                            className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-2xl"
                        />
                        
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="relative w-full max-w-4xl bg-white dark:bg-[#09090b] border border-zinc-300 dark:border-white/10 rounded-[4rem] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]"
                        >
                            <div className="p-10 md:p-16 space-y-12">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-4">
                                            <span className="px-5 py-1.5 bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 rounded-full text-[9px] font-black uppercase text-zinc-600 dark:text-zinc-400 tracking-widest">{selectedAssignment.type}</span>
                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{selectedAssignment.subject?.name}</span>
                                        </div>
                                        <h3 className="text-3xl md:text-5xl font-black italic text-zinc-900 dark:text-white uppercase">{selectedAssignment.title}</h3>
                                        <div className="flex items-center gap-3 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                            <Calendar className="w-4 h-4" /> DEADLINE: {format(new Date(selectedAssignment.dueDate), "PPP")}
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => setShowDetailModal(false)} className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white uppercase font-black tracking-widest text-[9px]">EXIT HUD</Button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">DISPATCH SPECIFICATIONS</label>
                                            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed font-medium">
                                                {selectedAssignment.description || "No additional parameters provided for this dispatch."}
                                            </p>
                                        </div>
                                        
                                        <div className="p-8 bg-white/60 dark:bg-zinc-950/60 rounded-[2.5rem] border border-zinc-200 dark:border-white/5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Zap className="w-4 h-4 text-zinc-700" />
                                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Assigned Specialist</span>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={async () => {
                                                        setAnalyzing(true);
                                                        try {
                                                            const res = await fetch('/api/ai/assignments', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    mode: 'parent-analysis',
                                                                    context: {
                                                                        title: selectedAssignment.title,
                                                                        description: selectedAssignment.description,
                                                                        subject: selectedAssignment.subject
                                                                    }
                                                                })
                                                            });
                                                            const data = (await res.json()) as any;
                                                            if (data.analysis) setParentAnalysis(data.analysis);
                                                        } finally {
                                                            setAnalyzing(false);
                                                        }
                                                    }}
                                                    disabled={analyzing}
                                                    className="h-8 px-4 rounded-xl bg-zinc-200 dark:bg-white/5 text-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center gap-2"
                                                >
                                                    {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Smart Support</span>
                                                </Button>
                                            </div>
                                            <p className="text-zinc-900 dark:text-white font-black italic uppercase text-lg">{selectedAssignment.teacher?.name}</p>
                                        </div>

                                        <AnimatePresence>
                                            {parentAnalysis && (
                                                <motion.div 
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] space-y-6 overflow-hidden"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Brain className="w-4 h-4 text-emerald-500" />
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">{parentAnalysis.difficultyLevel} Difficulty Synthesis</span>
                                                    </div>
                                                    <p className="text-zinc-700 dark:text-zinc-300 text-xs font-medium italic leading-relaxed">
                                                        &ldquo;{parentAnalysis.parentSummary}&rdquo;
                                                    </p>
                                                    <div className="space-y-4 pt-4 border-t border-emerald-500/10">
                                                        <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest">Support Guidelines</span>
                                                        <div className="space-y-2">
                                                            {parentAnalysis.supportTips.map((tip: string, i: number) => (
                                                                <div key={i} className="flex items-center gap-3">
                                                                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                                    <span className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase italic">{tip}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">ACADEMIC VERDICT</label>
                                            
                                            {selectedAssignment.submission?.status === 'GRADED' ? (
                                                <div className="p-10 bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                                                        <div>
                                                            <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">EVALUATION COMPLETE</span>
                                                            <div className="text-4xl font-black text-emerald-500 italic uppercase leading-none mt-1">{selectedAssignment.submission.grade} <span className="text-emerald-500/30 text-lg">/ {selectedAssignment.maxScore || 100}</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 pt-4 border-t border-emerald-500/10">
                                                        <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest flex items-center gap-2">
                                                            <MessageSquare className="w-3 h-3" /> TEACHER FEEDBACK
                                                        </span>
                                                        <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium italic leading-relaxed">&ldquo;{selectedAssignment.submission.feedback || "The student has demonstrated standard concept alignment."}&rdquo;</p>
                                                    </div>
                                                </div>
                                            ) : selectedAssignment.submission ? (
                                                <div className="p-10 bg-amber-500/5 border border-amber-500/20 rounded-[2.5rem] space-y-4 text-center">
                                                    <Activity className="w-10 h-10 text-amber-600 dark:text-amber-500 mx-auto animate-pulse" />
                                                    <h4 className="text-xl font-black text-amber-600 dark:text-amber-500 italic uppercase">Coursework Under Review</h4>
                                                    <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Submission detected. Pending educator evaluation.</p>
                                                </div>
                                            ) : (
                                                <div className="p-10 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-[2.5rem] space-y-4 text-center">
                                                    <AlertCircle className="w-10 h-10 text-zinc-700 mx-auto" />
                                                    <h4 className="text-xl font-black text-zinc-600 italic uppercase">Dispatch Pending Submission</h4>
                                                    <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">No coursework detected in registry for this task.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function RegistryCard({ assignment, onClick }: any) {
    const isLate = isAfter(new Date(), new Date(assignment.dueDate)) && !assignment.submission;
     const isGraded = assignment.submission?.status === 'GRADED';

    return (
        <motion.div 
            whileHover={{ y: -5 }}
            onClick={onClick}
            className={cn(
                "p-10 rounded-[3.5rem] border backdrop-blur-3xl transition-all cursor-pointer group relative overflow-hidden",
                assignment.submission ? "bg-white/40 dark:bg-[#050505]/40 border-zinc-200 dark:border-white/5 shadow-none" : "bg-gradient-to-br from-white to-zinc-50 dark:from-[#0c0c0c] dark:to-[#050505] border-zinc-300 dark:border-white/10 hover:border-white/20 shadow-2xl"
            )}
        >
            {isLate && (
                <div className="absolute top-0 right-10 h-10 w-32 bg-rose-500/20 rounded-b-2xl border-x border-b border-rose-500/30 flex items-center justify-center gap-2">
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">OVERDUE</span>
                </div>
            )}

            <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/5 flex items-center justify-center overflow-hidden">
                             <span className="text-zinc-700 font-black text-[10px] uppercase italic">{assignment.subject?.name?.[0]}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-zinc-900 dark:text-white/50 uppercase tracking-[0.1em] italic">{assignment.subject?.name}</span>
                            <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">{assignment.type}</span>
                        </div>
                    </div>
                    {isGraded && (
                        <div className="h-12 w-12 rounded-full border border-emerald-500/30 flex items-center justify-center font-black text-emerald-500 italic text-xs">
                            {assignment.submission.grade}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <h4 className="text-3xl font-black italic text-zinc-900 dark:text-white uppercase leading-none tracking-tight group-hover:text-eduGreen-500 transition-colors line-clamp-2">{assignment.title}</h4>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-white/5">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-700" />
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                            {format(new Date(assignment.dueDate), "dd MMM")}
                        </span>
                    </div>
                    
                    {isGraded ? (
                        <div className="flex items-center gap-2 text-emerald-500/60 font-black text-[8px] uppercase tracking-widest">
                            <CheckCircle className="w-3.5 h-3.5" /> EVALUATED
                        </div>
                    ) : assignment.submission ? (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500/60 font-black text-[8px] uppercase tracking-widest">
                            <Activity className="w-3.5 h-3.5" /> IN REVIEW
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-rose-500/60 font-black text-[8px] uppercase tracking-widest">
                            <AlertCircle className="w-3.5 h-3.5" /> PENDING
                        </div>
                    )}
                </div>
            </div>
            
            {/* Background glow for graded tasks */}
            {isGraded && (
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-500/5 blur-[80px] rounded-full" />
            )}
        </motion.div>
    );
}

