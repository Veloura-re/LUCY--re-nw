"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
    Plus, 
    FileText, 
    Calendar, 
    Clock, 
    Users, 
    CheckCircle, 
    XCircle, 
    ChevronRight, 
    Download, 
    ExternalLink,
    Brain,
    Zap,
    Activity,
    Search,
    Loader2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface AssignmentsTeacherConsoleProps {
    initialAssignments: any[];
    classes: any[];
    subjects: any[];
}

export default function AssignmentsTeacherConsole({ initialAssignments, classes, subjects }: AssignmentsTeacherConsoleProps) {
    const [assignments, setAssignments] = useState(initialAssignments);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [grading, setGrading] = useState(false);

    // Create state
    const firstClassSubjects = classes[0]?.subjects || [];
    const initialSubjectId = firstClassSubjects[0]?.id || subjects[0]?.id || "";

    const [newAssignment, setNewAssignment] = useState({
        title: "",
        description: "",
        classId: classes[0]?.classId || "",
        subjectId: initialSubjectId,
        dueDate: "",
        type: "HOMEWORK",
        maxScore: 100,
        materials: [] as { name: string, url: string }[]
    });

    const handleCreate = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/school/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAssignment)
            });
            const data = (await res.json()) as any;
            if (res.ok) {
                setAssignments([data.assignment, ...assignments]);
                setShowCreate(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);

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
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em] italic">Tactical Console v4.0</span>
                    </div>
                    <h2 className="text-5xl md:text-8xl font-black tracking-[calc(-0.05em)] text-white italic leading-[0.85] uppercase">
                        TASK <span className="text-zinc-800 not-italic">COMMAND</span>
                    </h2>
                </motion.div>

                <Button
                    onClick={() => setShowCreate(true)}
                    className="h-20 px-12 rounded-[2rem] bg-white text-black font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-3" /> CREATE DISPATCH
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Assignment List */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-white transition-colors" />
                        <Input 
                            placeholder="FILTER DISPATCHES..." 
                            className="bg-[#050505]/40 backdrop-blur-xl border-white/5 rounded-[1.5rem] h-14 pl-14 text-[10px] font-black tracking-widest text-white ring-0"
                        />
                    </div>

                    <div className="space-y-4">
                        {assignments.map((a) => (
                            <AssignmentCard 
                                key={a.id} 
                                assignment={a} 
                                active={selectedAssignmentId === a.id}
                                onClick={() => setSelectedAssignmentId(a.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Details / Create / Grade View */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {showCreate ? (
                            <CreateAssignmentForm 
                                classes={classes} 
                                subjects={subjects} 
                                data={newAssignment}
                                setData={setNewAssignment}
                                onSave={handleCreate}
                                onCancel={() => setShowCreate(false)}
                                loading={loading}
                            />
                        ) : selectedSubmissionId ? (
                            <GradingView 
                                submission={selectedAssignment.submissions.find((s: any) => s.id === selectedSubmissionId)}
                                onBack={() => setSelectedSubmissionId(null)}
                                onUpdate={(updatedSub: any) => {
                                    const updatedAssignments = assignments.map(a => {
                                        if (a.id === selectedAssignment.id) {
                                            return {
                                                ...a,
                                                submissions: a.submissions.map((s: any) => 
                                                    s.id === updatedSub.id ? { ...s, ...updatedSub } : s
                                                )
                                            };
                                        }
                                        return a;
                                    });
                                    setAssignments(updatedAssignments);
                                    setSelectedSubmissionId(null);
                                }}
                            />
                        ) : selectedAssignment ? (
                            <AssignmentDetailsView 
                                assignment={selectedAssignment} 
                                onSelectSubmission={setSelectedSubmissionId}
                            />
                        ) : (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-[#050505]/20 backdrop-blur-sm border border-white/5 rounded-[3.5rem] p-20 text-center">
                                <Brain className="w-16 h-16 text-zinc-800 mb-6 animate-pulse" />
                                <h3 className="text-2xl font-black text-zinc-700 italic uppercase">Operational Selection Required</h3>
                                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-2">Select a dispatch to review student submissions or manage parameters.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function AssignmentCard({ assignment, active, onClick }: any) {
    return (
        <motion.div 
            whileHover={{ x: 4 }}
            onClick={onClick}
            className={cn(
                "p-8 rounded-[2.5rem] border transition-all cursor-pointer relative overflow-hidden group",
                active ? "bg-white border-white" : "bg-[#050505]/40 backdrop-blur-md border-white/5 hover:border-white/20"
            )}
        >
            <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-start">
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", active ? "text-zinc-500" : "text-zinc-600")}>
                        {assignment.subject?.name}
                    </span>
                    <div className={cn("px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em]", active ? "bg-black text-white" : "bg-white/5 text-zinc-400")}>
                        {assignment.type}
                    </div>
                </div>
                <div>
                    <h4 className={cn("text-xl font-black italic uppercase leading-tight", active ? "text-black" : "text-white")}>{assignment.title}</h4>
                    <div className="flex items-center gap-4 mt-2">
                        <div className={cn("flex items-center gap-2 text-[9px] font-bold uppercase", active ? "text-zinc-600" : "text-zinc-500")}>
                            <Users className="w-3 h-3" /> {assignment._count?.submissions || 0} SUBMITTED
                        </div>
                        <div className={cn("flex items-center gap-2 text-[9px] font-bold uppercase", active ? "text-zinc-600" : "text-zinc-500")}>
                            <Calendar className="w-3 h-3" /> {format(new Date(assignment.dueDate), "dd MMM")}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function CreateAssignmentForm({ classes, subjects, data, setData, onSave, onCancel, loading }: any) {
    const [uploading, setUploading] = useState(false);

    // Filter subjects to only those assigned to the selected class (cohort)
    const selectedClass = classes.find((c: any) => c.classId === data.classId);
    let filteredSubjects = selectedClass?.subjects || [];

    // Fallback in case no subjects are assigned to the selected class
    if (filteredSubjects.length === 0) {
        const allAssignedSubjects = subjects.filter((s: any) =>
            classes.some((c: any) => c.subjects?.some((sub: any) => sub.id === s.id))
        );
        filteredSubjects = allAssignedSubjects.length > 0 ? allAssignedSubjects : subjects;
    }

    const handleClassChange = (classId: string) => {
        const selectedCls = classes.find((c: any) => c.classId === classId);
        let classSubjects = selectedCls?.subjects || [];
        if (classSubjects.length === 0) {
            classSubjects = subjects.filter((s: any) =>
                classes.some((c: any) => c.subjects?.some((sub: any) => sub.id === s.id))
            );
            if (classSubjects.length === 0) {
                classSubjects = subjects;
            }
        }
        const firstSubjectId = classSubjects[0]?.id || "";
        setData({
            ...data,
            classId,
            subjectId: firstSubjectId
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);
        const file = e.target.files[0];
        
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("bucket", "materials"); // Store in materials bucket
            
            const res = await fetch("/api/school/upload", {
                method: "POST",
                body: formData
            });
            const result = (await res.json()) as any;
            
            if (res.ok && result.url) {
                setData({
                    ...data,
                    materials: [...(data.materials || []), { name: file.name, url: result.url }]
                });
            }
        } finally {
            setUploading(false);
            // reset input
            e.target.value = '';
        }
    };

    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#050505]/60 backdrop-blur-[50px] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-2xl">
            <div className="p-12 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-zinc-900/40 to-transparent">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Initialize Dispatch</span>
                    <h3 className="text-3xl font-black italic text-white uppercase">New Academic Task</h3>
                </div>
                <Button variant="ghost" onClick={onCancel} className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest">Abort</Button>
            </div>
            
            <div className="p-12 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <ConfigField label="TASK IDENTIFIER" icon={Zap}>
                        <Input 
                            value={data.title}
                            onChange={(e) => setData({ ...data, title: e.target.value })}
                            placeholder="ENTER TASK TITLE..." 
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold text-xs uppercase tracking-widest ring-0"
                        />
                    </ConfigField>
 
                    <ConfigField label="TEMPORAL DEADLINE" icon={Clock}>
                        <Input 
                            type="datetime-local"
                            value={data.dueDate}
                            onChange={(e) => setData({ ...data, dueDate: e.target.value })}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold text-xs uppercase tracking-widest"
                        />
                    </ConfigField>
                </div>
 
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <ConfigField label="COHORT" icon={Users}>
                        <Select value={data.classId} onValueChange={handleClassChange}>
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold text-xs uppercase">
                                <SelectValue placeholder="CLASS" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0a0a0a] border-white/10 text-white rounded-2xl">
                                {classes.map((c: any) => <SelectItem key={c.classId} value={c.classId} className="focus:bg-white focus:text-black">{c.className}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </ConfigField>
 
                    <ConfigField label="NEURAL PATH" icon={Brain}>
                         <Select value={data.subjectId} onValueChange={(v) => setData({ ...data, subjectId: v })}>
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold text-xs uppercase">
                                <SelectValue placeholder="SUBJECT" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0a0a0a] border-white/10 text-white rounded-2xl">
                                {filteredSubjects.map((s: any) => <SelectItem key={s.id} value={s.id} className="focus:bg-white focus:text-black">{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </ConfigField>
 
                    <ConfigField label="TYPE" icon={Activity}>
                         <Select value={data.type} onValueChange={(v) => setData({ ...data, type: v })}>
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold text-xs uppercase">
                                <SelectValue placeholder="TYPE" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0a0a0a] border-white/10 text-white rounded-2xl">
                                <SelectItem value="HOMEWORK" className="focus:bg-white focus:text-black">HOMEWORK</SelectItem>
                                <SelectItem value="PROJECT" className="focus:bg-white focus:text-black">PROJECT</SelectItem>
                                <SelectItem value="ESSAY" className="focus:bg-white focus:text-black">ESSAY</SelectItem>
                                <SelectItem value="LAB" className="focus:bg-white focus:text-black">LAB</SelectItem>
                            </SelectContent>
                        </Select>
                    </ConfigField>
                </div>

                <ConfigField label="TASK SPECIFICATIONS" icon={FileText}>
                    <div className="relative">
                        <Textarea 
                            value={data.description}
                            onChange={(e) => setData({ ...data, description: e.target.value })}
                            placeholder="DEFINE REQUIREMENTS AND OBJECTIVES..." 
                            className="min-h-[150px] bg-white/5 border-white/10 rounded-[2rem] p-8 text-white font-medium text-sm leading-relaxed ring-0 focus:border-white/20"
                        />
                        
                        <div className="absolute top-4 right-4 group">
                            <Button 
                                onClick={async () => {
                                    if (!data.title && !data.subjectId) return;
                                    const subjectName = subjects.find((s: any) => s.id === data.subjectId)?.name || "";
                                    const res = await fetch('/api/ai/assignments', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            mode: 'generate',
                                            context: { 
                                                subject: subjectName, 
                                                topic: data.title,
                                                requirements: data.description 
                                            }
                                        })
                                    });
                                    const resData = (await res.json()) as any;
                                    if (resData.draft) {
                                        setData({
                                            ...data,
                                            title: resData.draft.title,
                                            description: resData.draft.description,
                                            type: resData.draft.type,
                                            maxScore: resData.draft.maxScore
                                        });
                                    }
                                }}
                                className="h-10 px-6 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black transition-all flex items-center gap-2"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Neural Draft</span>
                            </Button>
                        </div>
                    </div>
                </ConfigField>

                <ConfigField label="ATTACH MATERIALS" icon={Download}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Input 
                                type="file" 
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-medium file:bg-white/10 file:text-white file:border-0 file:rounded-xl file:px-4 file:py-1 file:mr-4 file:font-bold file:text-[10px] file:uppercase file:tracking-widest hover:file:bg-white/20 transition-all cursor-pointer"
                            />
                            {uploading && <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />}
                        </div>
                        
                        {data.materials?.length > 0 && (
                            <div className="space-y-2">
                                {data.materials.map((m: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-zinc-500" />
                                            <span className="text-[10px] font-bold text-white tracking-widest uppercase">{m.name}</span>
                                        </div>
                                        <Button 
                                            type="button"
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => setData({
                                                ...data,
                                                materials: data.materials.filter((_: any, index: number) => index !== i)
                                            })}
                                            className="text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 h-8 w-8 p-0 rounded-xl"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ConfigField>

                <div className="flex justify-end pt-10">
                    <Button 
                        onClick={onSave}
                        disabled={loading || !data.title || !data.dueDate}
                        className="h-20 px-20 rounded-[2rem] bg-white text-black font-black text-[11px] uppercase tracking-[0.4em] hover:scale-105 transition-all shadow-2xl"
                    >
                        {loading ? "INITIALIZING DISPATCH..." : "SYNC DISPATCH"}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

function AssignmentDetailsView({ assignment, onSelectSubmission }: any) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <Card className="bg-[#050505]/40 backdrop-blur-xl border border-white/5 rounded-[3.5rem] overflow-hidden">
                <div className="p-12 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <span className="px-5 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase text-zinc-400 tracking-widest">{assignment.type}</span>
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Due {format(new Date(assignment.dueDate), "PPP")}</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tight">{assignment.title}</h2>
                        <p className="text-sm font-medium text-zinc-400 max-w-2xl leading-relaxed">{assignment.description}</p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 text-white font-black text-[10px] uppercase hover:bg-white hover:text-black transition-all">EDIT</Button>
                        <Button variant="outline" className="h-14 px-8 rounded-2xl border-rose-500/20 bg-rose-500/5 text-rose-500 font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all">TERMINATE</Button>
                    </div>
                </div>

                <div className="p-12 grid grid-cols-2 lg:grid-cols-4 gap-8 bg-zinc-950/40">
                    <Metric label="REGISTERED STUDENTS" value={assignment._count?.submissions || 0} icon={Users} />
                    <Metric label="AVERAGE SCORE" value="—" icon={Brain} />
                    <Metric label="DAYS REMAINING" value="3" icon={Clock} />
                    <Metric label="MAX POINTS" value={assignment.maxScore} icon={Zap} />
                </div>
            </Card>

            <div className="space-y-6">
                <div className="flex items-center gap-4 ml-2">
                    <div className="h-[1px] w-8 bg-zinc-800" />
                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em] italic">SUBMISSION REGISTRY</h3>
                </div>

                <Card className="bg-[#050505]/40 backdrop-blur-xl border border-white/5 rounded-[3rem] overflow-hidden">
                    <div className="divide-y divide-white/5">
                        {assignment.submissions?.length === 0 ? (
                            <div className="p-24 text-center space-y-4">
                                <Activity className="w-10 h-10 text-zinc-800 mx-auto animate-pulse" />
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">No Coursework Discovered in Registry</p>
                            </div>
                        ) : (
                            assignment.submissions.map((sub: any, idx: number) => (
                                <SubmissionRow 
                                    key={sub.id} 
                                    submission={sub} 
                                    idx={idx} 
                                    onClick={() => onSelectSubmission(sub.id)}
                                />
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </motion.div>
    );
}

function SubmissionRow({ submission, idx, onClick }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: idx * 0.05 }}
            onClick={onClick}
            className="p-10 flex flex-col md:flex-row items-center justify-between gap-8 hover:bg-white/[0.02] transition-colors group cursor-pointer"
        >
            <div className="flex items-center gap-8 flex-1">
                <div className="w-16 h-16 rounded-[1.5rem] bg-[#0a0a0a] border border-white/5 flex items-center justify-center font-black text-zinc-700 text-xl italic uppercase">
                    {submission.student?.firstName[0]}{submission.student?.lastName[0]}
                </div>
                <div>
                    <h5 className="text-xl font-black text-white italic uppercase group-hover:text-eduGreen-500 transition-colors tracking-tight">
                        {submission.student?.firstName} <span className="text-zinc-700">{submission.student?.lastName}</span>
                    </h5>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{submission.student?.studentCode}</span>
                        <span className="text-[9px] font-bold text-zinc-500 italic">Submitted {format(new Date(submission.submittedAt), "PPP")}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">CURRENT STATUS</span>
                    <div className={cn(
                        "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest",
                        submission.status === 'GRADED' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                        {submission.status}
                    </div>
                </div>
                
                <Button className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all group-hover:scale-105 active:scale-95">
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>
        </motion.div>
    );
}

function GradingView({ submission, onBack, onUpdate }: any) {
    const [grade, setGrade] = useState(submission.grade || "");
    const [feedback, setFeedback] = useState(submission.feedback || "");
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [summarizing, setSummarizing] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/school/assignments/submissions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: submission.id, grade, feedback, status: 'GRADED' })
            });
            const data = (await res.json()) as any;
            if (res.ok) {
                onUpdate(data.submission);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#050505]/60 backdrop-blur-[50px] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-2xl">
            <div className="p-12 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-emerald-900/40 to-transparent">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Evaluation Node</span>
                    <h3 className="text-3xl font-black italic text-white uppercase">{submission.student?.firstName}'s Submission</h3>
                </div>
                <Button variant="ghost" onClick={onBack} className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest">Exit HUD</Button>
            </div>

            <div className="p-12 space-y-10">
                <div className="p-8 bg-zinc-950/60 rounded-[2rem] border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-zinc-700" />
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Student Content</span>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async () => {
                                if (!submission.content) return;
                                setSummarizing(true);
                                try {
                                    const res = await fetch('/api/ai/assignments', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            mode: 'summarize',
                                            context: { content: submission.content }
                                        })
                                    });
                                    const data = (await res.json()) as any;
                                    if (data.summary) setSummary(data.summary);
                                } finally {
                                    setSummarizing(false);
                                }
                            }}
                            disabled={summarizing || !submission.content}
                            className="h-8 px-4 rounded-xl bg-white/5 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center gap-2"
                        >
                            {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                            <span className="text-[8px] font-black uppercase tracking-widest">Neural Synthesis</span>
                        </Button>
                    </div>
                    
                    <AnimatePresence>
                        {summary && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl mb-4"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-3 h-3 text-emerald-500" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Synthesis Report</span>
                                </div>
                                <div className="text-zinc-400 text-[11px] leading-relaxed whitespace-pre-wrap font-medium">
                                    {summary}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap italic">
                        {submission.content || "NO CONTENT PROVIDED IN THIS DISPATCH"}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <ConfigField label="QUANTITATIVE EVALUATION" icon={Zap}>
                        <Input 
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            placeholder="GRADE (e.g. 95, A+)..." 
                            className="h-16 bg-white/5 border-white/10 rounded-2xl text-white font-black text-lg uppercase tracking-widest ring-0"
                        />
                    </ConfigField>

                    <div className="flex flex-col justify-center">
                         <div 
                            onClick={async () => {
                                setLoading(true);
                                try {
                                    const res = await fetch('/api/teacher/grades/ai-feedback', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            score: parseInt(grade) || 0,
                                            maxScore: parseInt(submission.assignment?.maxScore) || 100,
                                            subject: submission.assignment?.subject?.name || "Assignment",
                                            previousContext: submission.content
                                        })
                                    });
                                    const data = (await res.json()) as any;
                                    if (data.feedback) setFeedback(data.feedback);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-emerald-500/10 transition-all"
                         >
                            <div className="flex items-center gap-4">
                                <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
                                <div>
                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Neural Suggestion</p>
                                    <p className="text-[10px] font-bold text-white uppercase italic">Draft AI Feedback</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-emerald-500 transition-colors" />
                         </div>
                    </div>
                </div>

                <ConfigField label="QUALITATIVE FEEDBACK" icon={Brain}>
                    <Textarea 
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="PROVIDE ACADEMIC INSIGHTS AND RECOMMENDATIONS..." 
                        className="min-h-[150px] bg-white/5 border-white/10 rounded-[2rem] p-8 text-white font-medium text-sm leading-relaxed ring-0"
                    />
                </ConfigField>

                <div className="flex justify-end pt-10">
                    <Button 
                        onClick={handleSave}
                        disabled={loading}
                        className="h-20 px-20 rounded-[2rem] bg-emerald-500 text-black font-black text-[11px] uppercase tracking-[0.4em] hover:bg-white transition-all shadow-2xl"
                    >
                        {loading ? "PROCESSING EVALUATION..." : "SYNC EVALUATION"}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

const Sparkles = ({ className }: any) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

function Metric({ label, value, icon: Icon }: any) {
    return (
        <div className="p-8 space-y-2 border-l border-white/5 first:border-l-0">
            <div className="flex items-center gap-3">
                <Icon className="w-3 h-3 text-zinc-700" />
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">{label}</span>
            </div>
            <div className="text-3xl font-black text-white tracking-tighter italic uppercase">{value}</div>
        </div>
    );
}

function ConfigField({ label, icon: Icon, children }: any) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 ml-1">
                <Icon className="w-3 h-3 text-zinc-700" />
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">{label}</label>
            </div>
            {children}
        </div>
    );
}
