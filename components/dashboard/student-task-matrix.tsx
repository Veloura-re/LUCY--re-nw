"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
    FileText, 
    Calendar, 
    Clock, 
    CheckCircle, 
    XCircle, 
    ArrowUpFromLine, 
    Download, 
    MessageSquare,
    Brain,
    Zap,
    Activity,
    AlertCircle,
    ChevronRight,
    Loader2,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format, isAfter } from "date-fns";

interface StudentTaskMatrixProps {
    initialAssignments: any[];
    studentId: string;
}

export default function StudentTaskMatrix({ initialAssignments, studentId }: StudentTaskMatrixProps) {
    const [assignments, setAssignments] = useState(initialAssignments);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState("");
    
    // For submission modal
    const [submissionContent, setSubmissionContent] = useState("");
    const [submissionAttachments, setSubmissionAttachments] = useState<{name: string, url: string}[]>([]);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [preEval, setPreEval] = useState<any>(null);
    const [evaluating, setEvaluating] = useState(false);

    const handleSubmit = async () => {
        if (!selectedId) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/student/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignmentId: selectedId,
                    content: submissionContent,
                    attachments: submissionAttachments
                })
            });
            
            if (res.ok) {
                const data: any = await res.json();
                setAssignments(assignments.map(a => 
                    a.id === selectedId ? { ...a, submission: data.submission } : a
                ));
                setShowSubmitModal(false);
                setSubmissionContent("");
                setSubmissionAttachments([]);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);
        const file = e.target.files[0];
        
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("bucket", "submissions");
            
            const res = await fetch("/api/school/upload", {
                method: "POST",
                body: formData
            });
            const result: any = await res.json();
            
            if (res.ok && result.url) {
                setSubmissionAttachments([...submissionAttachments, { name: file.name, url: result.url }]);
            }
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const selectedAssignment = assignments.find(a => a.id === selectedId);

    return (
        <div className="space-y-12 pb-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <motion.div 
                    initial={{ opacity: 0, x: -30 }} 
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-2"
                >
                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-[1px] w-12 bg-white/10" />
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em] italic">Personal Planner v2.4</span>
                    </div>
                    <h2 className="text-5xl md:text-8xl font-black tracking-[calc(-0.05em)] text-zinc-900 dark:text-white italic leading-[0.85] uppercase">
                        ACADEMIC <span className="text-zinc-800 not-italic">PATH</span>
                    </h2>
                </motion.div>

                <div className="flex gap-6">
                    <MiniMetric label="PENDING" value={assignments.filter(a => !a.submission).length} />
                    <MiniMetric label="COMPLETED" value={assignments.filter(a => a.submission).length} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Deadline Feed */}
                <div className="lg:col-span-12 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {assignments.map((a) => (
                            <TaskCard 
                                key={a.id} 
                                assignment={a} 
                                onClick={() => {
                                    setSelectedId(a.id);
                                    if (a.submission) {
                                        setSubmissionContent(a.submission.content || "");
                                        setSubmissionAttachments(a.submission.attachments || []);
                                    } else {
                                        setSubmissionContent("");
                                        setSubmissionAttachments([]);
                                    }
                                    setShowSubmitModal(true);
                                }}
                            />
                        ))}

                        {assignments.length === 0 && (
                            <div className="col-span-full py-32 flex flex-col items-center justify-center bg-[#050505]/40 backdrop-blur-xl border border-zinc-200 dark:border-white/5 rounded-[3.5rem] text-center">
                                <Activity className="w-12 h-12 text-zinc-800 mb-6 animate-pulse" />
                                <h3 className="text-xl font-black text-zinc-700 italic uppercase">Neural Buffer Clear</h3>
                                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-2">No active assignments discovered in your current registry.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Submission Modal (Overlay) */}
            <AnimatePresence>
                {showSubmitModal && selectedAssignment && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSubmitModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
                        />
                        
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="relative w-full max-w-4xl bg-[#09090b] border border-white/10 rounded-[4rem] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]"
                        >
                            <div className="p-10 md:p-16 space-y-12">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-4">
                                            <span className="px-5 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase text-zinc-600 dark:text-zinc-400 tracking-widest">{selectedAssignment.type}</span>
                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{selectedAssignment.subject?.name}</span>
                                        </div>
                                        <h3 className="text-3xl md:text-5xl font-black italic text-zinc-900 dark:text-white uppercase">{selectedAssignment.title}</h3>
                                        <div className="flex items-center gap-3 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                            <Clock className="w-4 h-4" /> DEADLINE: {format(new Date(selectedAssignment.dueDate), "PPP")}
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => setShowSubmitModal(false)} className="text-zinc-600 hover:text-white uppercase font-black tracking-widest text-[9px]">CLOSE</Button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">TASK SPECIFICATIONS</label>
                                            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed font-medium">
                                                {selectedAssignment.description || "No additional instructions provided for this dispatch."}
                                            </p>
                                        </div>
                                        
                                        {selectedAssignment.materials?.length > 0 && (
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">RESOURCES</label>
                                                <div className="space-y-3">
                                                    {selectedAssignment.materials.map((m: any, i: number) => (
                                                        <a 
                                                            key={i} 
                                                            href={m.url} 
                                                            download 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <FileText className="w-5 h-5 text-zinc-500" />
                                                                <span className="text-[10px] font-black text-zinc-900 dark:text-white italic uppercase">{m.name || "Resource Link"}</span>
                                                            </div>
                                                            <Download className="w-4 h-4 text-zinc-700 group-hover:text-white transition-colors" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-8 border-t border-zinc-200 dark:border-white/5 space-y-6">
                                            <Button 
                                                onClick={async () => {
                                                    setAnalyzing(true);
                                                    try {
                                                        const res = await fetch('/api/ai/assignments', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                mode: 'analyze',
                                                                context: { 
                                                                    title: selectedAssignment.title,
                                                                    description: selectedAssignment.description,
                                                                    subject: selectedAssignment.subject?.name
                                                                }
                                                            })
                                                        });
                                                        const data = (await res.json()) as any;
                                                        if (data.analysis) setAnalysis(data.analysis);
                                                    } finally {
                                                        setAnalyzing(false);
                                                    }
                                                }}
                                                isLoading={analyzing}
                                                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-zinc-900 dark:text-white hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 group"
                                            >
                                                {!analyzing && <Brain className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />}
                                                <span className="text-[10px] font-black uppercase tracking-widest">INITIALIZE NEURAL BREAKDOWN</span>
                                            </Button>

                                            <AnimatePresence>
                                                {analysis && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] space-y-6"
                                                    >
                                                        <div>
                                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">NEURAL SUMMARY</span>
                                                            <p className="text-zinc-700 dark:text-zinc-300 text-sm mt-1 leading-relaxed">{analysis.summary}</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-6">
                                                            <div className="space-y-2">
                                                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">OBJECTIVES</span>
                                                                <ul className="space-y-1">
                                                                    {analysis.keyObjectives.map((obj: string, i: number) => (
                                                                        <li key={i} className="text-[10px] text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                                                            <div className="w-1 h-1 bg-emerald-500 rounded-full" /> {obj}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">SUCCESS TIPS</span>
                                                                <ul className="space-y-2">
                                                                    {analysis.successTips.map((tip: string, i: number) => (
                                                                        <li key={i} className="text-[10px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                                                                            <Sparkles className="w-3 h-3 text-emerald-500 mt-0.5" /> {tip}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                        <div className="pt-4 border-t border-zinc-200 dark:border-white/5 flex items-center gap-4">
                                                            <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                                            <span className="text-[9px] font-black text-zinc-600 uppercase italic">ESTIMATED INTELLECTUAL LOAD: {analysis.estimatedTime}</span>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">YOUR RESPONSE</label>
                                            {selectedAssignment.submission?.status === 'GRADED' ? (
                                                <div className="p-10 bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                                                        <div>
                                                            <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">COURSEWORK GRADED</span>
                                                            <div className="text-4xl font-black text-emerald-500 italic uppercase leading-none mt-1">{selectedAssignment.submission.grade} <span className="text-emerald-500/30 text-lg">/ {selectedAssignment.maxScore}</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 pt-4 border-t border-emerald-500/10">
                                                        <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest flex items-center gap-2">
                                                            <MessageSquare className="w-3 h-3" /> FEEDBACK
                                                        </span>
                                                        <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium italic">&ldquo;{selectedAssignment.submission.feedback || "Exceptional synchronization of concepts."}&rdquo;</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <Textarea 
                                                        value={submissionContent || selectedAssignment.submission?.content || ""}
                                                        onChange={(e) => setSubmissionContent(e.target.value)}
                                                        disabled={selectedAssignment.submission?.status === 'SUBMITTED'}
                                                        placeholder="EXECUTE COURSEWORK RESPONSE HERE OR ATTACH FILES..." 
                                                        className="min-h-[250px] bg-white/5 border-white/10 rounded-[2.5rem] p-10 text-zinc-900 dark:text-white font-medium text-sm leading-relaxed ring-0 focus:border-white/20"
                                                    />

                                                    {selectedAssignment.submission?.status !== 'SUBMITTED' && (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-4">
                                                                <Input 
                                                                    type="file" 
                                                                    onChange={handleFileUpload}
                                                                    disabled={uploading}
                                                                    className="h-14 bg-white/5 border-white/10 rounded-2xl text-zinc-900 dark:text-white font-medium file:bg-white/10 file:text-zinc-900 dark:text-white file:border-0 file:rounded-xl file:px-4 file:py-1 file:mr-4 file:font-bold file:text-[10px] file:uppercase file:tracking-widest hover:file:bg-white/20 transition-all cursor-pointer"
                                                                />
                                                                {uploading && <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />}
                                                            </div>
                                                            {submissionAttachments.length > 0 && (
                                                                <div className="space-y-2">
                                                                    {submissionAttachments.map((m: any, i: number) => (
                                                                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                                                            <div className="flex items-center gap-3">
                                                                                <FileText className="w-4 h-4 text-emerald-500" />
                                                                                <a 
                                                                                    href={m.url} 
                                                                                    download 
                                                                                    target="_blank" 
                                                                                    rel="noopener noreferrer" 
                                                                                    className="text-[10px] font-bold text-zinc-900 dark:text-white tracking-widest uppercase hover:underline hover:text-emerald-400 transition-colors"
                                                                                >
                                                                                    {m.name}
                                                                                </a>
                                                                            </div>
                                                                            <Button 
                                                                                type="button"
                                                                                variant="ghost" 
                                                                                size="sm"
                                                                                onClick={() => setSubmissionAttachments(submissionAttachments.filter((_, index) => index !== i))}
                                                                                className="text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 h-8 w-8 p-0 rounded-xl"
                                                                            >
                                                                                <XCircle className="w-4 h-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <AnimatePresence>
                                                        {preEval && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="bg-white/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-white/5 rounded-[2rem] p-8 space-y-6 overflow-hidden"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <Activity className={cn("w-4 h-4", 
                                                                            preEval.status === 'Ready' ? "text-emerald-500" : "text-amber-500"
                                                                        )} />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest italic">Neural Readiness: {preEval.status}</span>
                                                                    </div>
                                                                    <Button variant="ghost" onClick={() => setPreEval(null)} className="h-6 w-6 p-0 text-zinc-500 hover:text-white">
                                                                        <XCircle className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                                <p className="text-zinc-600 dark:text-zinc-400 text-xs italic leading-relaxed font-medium">
                                                                    &ldquo;{preEval.feedback}&rdquo;
                                                                </p>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {preEval.checklist.map((item: any, i: number) => (
                                                                        <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
                                                                            {item.completed ? (
                                                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                                            ) : (
                                                                                <AlertCircle className="w-3.5 h-3.5 text-zinc-700" />
                                                                            )}
                                                                            <span className={cn("text-[9px] font-bold uppercase", item.completed ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-600")}>
                                                                                {item.item}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    
                                                    <div className="flex items-center justify-between pt-4">
                                                        <div className="flex gap-4">
                                                            <Button 
                                                                variant="outline" 
                                                                onClick={async () => {
                                                                    if (!submissionContent) return;
                                                                    setEvaluating(true);
                                                                    try {
                                                                        const res = await fetch('/api/ai/assignments', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({
                                                                                mode: 'pre-eval',
                                                                                context: { 
                                                                                    assignment: {
                                                                                        title: selectedAssignment.title,
                                                                                        description: selectedAssignment.description
                                                                                    },
                                                                                    content: submissionContent
                                                                                }
                                                                            })
                                                                        });
                                                                        const data = (await res.json()) as any;
                                                                        if (data.evaluation) setPreEval(data.evaluation);
                                                                    } finally {
                                                                        setEvaluating(false);
                                                                    }
                                                                }}
                                                                isLoading={evaluating}
                                                                disabled={!submissionContent}
                                                                className="w-16 h-16 rounded-[1.5rem] border-white/10 bg-white/5 text-zinc-900 dark:text-white hover:bg-white hover:text-black transition-all group relative overflow-hidden text-emerald-500"
                                                            >
                                                                {!evaluating && <Brain className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                                                                <span className="absolute bottom-1 text-[6px] font-black uppercase text-emerald-500/40">PRE-EVAL</span>
                                                            </Button>

                                                            <Button 
                                                                variant="outline" 
                                                                onClick={() => {
                                                                    if (analysis) {
                                                                        setSubmissionContent(`Assignment Analysis Summary:\n${analysis.summary}\n\nMy approach:\n- `);
                                                                    } else {
                                                                        setSubmissionContent("Starting my response...");
                                                                    }
                                                                }}
                                                                className="w-16 h-16 rounded-[1.5rem] border-white/10 bg-white/5 text-zinc-900 dark:text-white hover:bg-white hover:text-black transition-all"
                                                            >
                                                                <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
                                                            </Button>
                                                        </div>
                                                        
                                                        {selectedAssignment.submission?.status === 'SUBMITTED' ? (
                                                            <div className="flex items-center gap-4 text-emerald-500 font-black text-[10px] uppercase tracking-widest bg-emerald-500/5 px-8 py-4 rounded-full border border-emerald-500/10 italic">
                                                                <CheckCircle className="w-4 h-4" /> SYNC COMPLETE
                                                            </div>
                                                        ) : (
                                                            <Button 
                                                                onClick={handleSubmit}
                                                                isLoading={submitting}
                                                                disabled={!submissionContent && submissionAttachments.length === 0}
                                                                className="h-16 px-12 rounded-[1.5rem] bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl"
                                                            >
                                                                EXECUTE UPLOAD
                                                            </Button>
                                                        )}
                                                    </div>
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

function TaskCard({ assignment, onClick }: any) {
    const isLate = isAfter(new Date(), new Date(assignment.dueDate)) && !assignment.submission;

    return (
        <motion.div 
            whileHover={{ y: -5 }}
            onClick={onClick}
            className={cn(
                "p-10 rounded-[3.5rem] border backdrop-blur-3xl transition-all cursor-pointer group relative overflow-hidden",
                assignment.submission ? "bg-[#050505]/40 border-zinc-200 dark:border-white/5" : "bg-gradient-to-br from-[#0c0c0c] to-[#050505] border-white/10 hover:border-white/20 shadow-2xl"
            )}
        >
            {/* Visual indicator for late tasks */}
            {isLate && (
                <div className="absolute top-0 right-10 h-10 w-32 bg-rose-500/20 rounded-b-2xl border-x border-b border-rose-500/30 flex items-center justify-center gap-2">
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">DISPATCH OVERDUE</span>
                </div>
            )}

            <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                            <span className="text-zinc-600 font-black text-[9px] uppercase italic">{assignment.subject?.name[0]}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-zinc-900 dark:text-white/50 uppercase tracking-[0.1em] italic">{assignment.subject?.name}</span>
                            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{assignment.type}</span>
                        </div>
                    </div>
                    {assignment.submission?.status === 'GRADED' && (
                        <div className="h-12 w-12 rounded-full border border-emerald-500/30 flex items-center justify-center font-black text-emerald-500 italic text-xs">
                            {assignment.submission.grade}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <h4 className="text-3xl font-black italic text-zinc-900 dark:text-white uppercase leading-none tracking-tight group-hover:text-eduGreen-500 transition-colors">{assignment.title}</h4>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest line-clamp-1">{assignment.teacher?.name}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-white/5">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                            {format(new Date(assignment.dueDate), "dd MMM")}
                        </span>
                    </div>
                    
                    {assignment.submission ? (
                        <div className="flex items-center gap-2 text-emerald-500/60 font-black text-[8px] uppercase tracking-widest">
                            <CheckCircle className="w-3.5 h-3.5" /> ARCHIVED
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-amber-500/60 font-black text-[8px] uppercase tracking-widest">
                            <ChevronRight className="w-3.5 h-3.5" /> EXECUTE SUBMISSION
                        </div>
                    )}
                </div>
            </div>
            
            {/* Background glow for non-submitted tasks */}
            {!assignment.submission && (
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-zinc-400/5 blur-[80px] rounded-full group-hover:bg-zinc-400/10 transition-all duration-700" />
            )}
        </motion.div>
    );
}

function MiniMetric({ label, value }: any) {
    return (
        <div className="px-8 py-4 bg-[#050505]/40 backdrop-blur-xl border border-zinc-200 dark:border-white/5 rounded-3xl flex flex-col justify-center">
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.3em] italic mb-1">{label}</span>
            <div className="text-2xl font-black text-zinc-900 dark:text-white italic leading-none">{value}</div>
        </div>
    );
}
