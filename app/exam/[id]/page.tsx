"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { Loader2 as Loader2Icon, Timer, ShieldAlert, WifiOff, Wifi, CloudCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ExamRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [examData, setExamData] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // 1. Initial Load & Local Storage Cache Restore
    useEffect(() => {
        const fetchExam = async () => {
            try {
                const res = await fetch(`/api/student/exams/${id}`);
                const data = (await res.json()) as any;
                if (data.error) {
                    toast.error(data.error);
                    router.push("/dashboard/student/exams");
                    return;
                }
                setExamData(data.exam);
                
                // Restore answers from local cache if present
                const cached = localStorage.getItem(`exam_cache_${id}`);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (parsed && typeof parsed.answers === 'object') {
                            setAnswers(parsed.answers);
                            setLastSaved(new Date(parsed.timestamp));
                            toast.info("Restored previously cached answers.");
                        }
                    } catch { /* ignore corrupted cache */ }
                }

                setTimeLeft(typeof data.exam.remainingSeconds === 'number' ? data.exam.remainingSeconds : (data.exam.duration || 60) * 60);
            } catch (e) {
                toast.error("Failed to initialize assessment connection.");
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [id, router]);

    // 2. Connectivity Listeners
    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            toast.success("Telemetry Re-established. Online mode restored.", { icon: <Wifi className="w-4 h-4 text-emerald-400" /> });
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast.warning("Network Connection Interrupted. Offline caching engaged.", { icon: <WifiOff className="w-4 h-4 text-amber-400" /> });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 3. Persistent LocalStorage Sync on answer update
    const updateAnswer = useCallback((questionId: string, value: string) => {
        setAnswers((prev) => {
            const next = { ...prev, [questionId]: value };
            try {
                localStorage.setItem(`exam_cache_${id}`, JSON.stringify({
                    answers: next,
                    timestamp: Date.now()
                }));
                setLastSaved(new Date());
            } catch { /* storage full or quota */ }
            return next;
        });
    }, [id]);

    // 4. Timer
    useEffect(() => {
        if (loading || !examData) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [loading, examData]);

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/student/exams/${id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers })
            });
            const data = (await res.json()) as any;

            if (data.success) {
                // Clear cache upon successful transmission
                localStorage.removeItem(`exam_cache_${id}`);
                toast.success(`Assessment Concluded. Score: ${data.score.toFixed(1)}%`);
                router.push("/dashboard/student/exams?status=completed");
            } else {
                toast.error(data.error || "Submission failed.");
            }
        } catch (e) {
            toast.error("Network failure during submission. Your answers remain saved locally.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-zinc-950 text-white">
            <Loader2Icon className="w-12 h-12 text-cyan-400 animate-spin" />
            <p className="text-zinc-500 font-mono font-bold uppercase tracking-[0.4em] text-xs">Establishing Secure Assessment Link...</p>
        </div>
    );

    if (!examData) return null;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-cyan-500/30">
            {/* Offline Alert HUD */}
            {!isOnline && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-amber-300 text-xs backdrop-blur-md sticky top-0 z-[70]">
                    <div className="flex items-center gap-2 font-medium">
                        <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span>Offline Mode Active • Answers are safely cached on this device and timer is maintained locally.</span>
                    </div>
                    {lastSaved && (
                        <span className="text-[10px] font-mono text-amber-400/80">Last Saved: {lastSaved.toLocaleTimeString()}</span>
                    )}
                </div>
            )}

            <header className="sticky top-0 z-[60] h-20 bg-zinc-950/80 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-6 md:px-10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        <ShieldAlert className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-base md:text-lg font-black text-white tracking-tight uppercase italic">{examData.title}</h1>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Assessment Environment</p>
                            {isOnline ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Online Sync
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    Offline Cached
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    <LanguageToggle />

                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3 shadow-inner">
                        <Timer className={cn("w-4 h-4", timeLeft < 300 ? "text-rose-400 animate-pulse" : "text-cyan-400")} />
                        <span className={cn("font-mono font-black text-base md:text-lg", timeLeft < 300 ? "text-rose-400" : "text-white")}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>

                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting} 
                        className="bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest px-6 md:px-8 rounded-xl h-11 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                    >
                        {isSubmitting ? <Loader2Icon className="w-4 h-4 animate-spin" /> : "Transmit"}
                    </Button>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full py-10 px-4 space-y-10 pb-40">
                {/* Intro Card */}
                <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-indigo-500" />
                    <div className="space-y-4">
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic">{examData.title}</h2>
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-300 py-1.5 px-4 font-mono font-bold uppercase tracking-widest text-[10px]">
                                {examData.subject?.name}
                            </Badge>
                            <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400 py-1.5 px-4 font-mono font-bold uppercase tracking-widest text-[10px]">
                                {examData.questions?.length || 0} Questions
                            </Badge>
                            {lastSaved && (
                                <span className="text-[10px] font-mono text-zinc-500 ml-auto">
                                    Local Sync: {lastSaved.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Adaptive Question Rendering */}
                <div className="space-y-8">
                    {examData.questions?.map((q: any, i: number) => {
                        const isAnswered = !!answers[q.id];
                        return (
                            <div 
                                key={q.id} 
                                className={cn(
                                    "rounded-3xl p-6 md:p-8 transition-all border backdrop-blur-xl",
                                    isAnswered 
                                        ? "bg-white/[0.04] border-cyan-500/40 shadow-lg shadow-cyan-500/5" 
                                        : "bg-white/[0.02] border-white/10 hover:border-white/20"
                                )}
                            >
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4 md:gap-6">
                                        <div className={cn(
                                            "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-mono font-black text-base md:text-lg border transition-all flex-shrink-0",
                                            isAnswered 
                                                ? "bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/30" 
                                                : "bg-white/5 text-zinc-400 border-white/10"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-lg md:text-xl font-bold text-white leading-relaxed">{q.text}</h3>
                                            <Badge variant="outline" className="border-white/10 text-[9px] uppercase tracking-widest font-mono text-zinc-400">
                                                {q.type} • {q.points} Pts
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* MCQ Renderer */}
                                    {q.type === "MCQ" && (
                                        <RadioGroup 
                                            value={answers[q.id] || ""} 
                                            onValueChange={(val) => updateAnswer(q.id, val)} 
                                            className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2"
                                        >
                                            {q.options?.map((option: string, idx: number) => {
                                                const selected = answers[q.id] === option;
                                                return (
                                                    <Label 
                                                        key={idx} 
                                                        className={cn(
                                                            "flex items-center p-4 md:p-5 rounded-2xl border cursor-pointer transition-all",
                                                            selected 
                                                                ? "bg-cyan-500/15 border-cyan-500 text-white shadow-md shadow-cyan-500/10" 
                                                                : "bg-white/[0.03] border-white/5 text-zinc-300 hover:bg-white/[0.06] hover:border-white/15"
                                                        )}
                                                    >
                                                        <RadioGroupItem value={option} className="sr-only" />
                                                        <div className={cn(
                                                            "w-4 h-4 rounded-full border mr-3 flex items-center justify-center transition-all",
                                                            selected ? "border-cyan-400 bg-cyan-500" : "border-zinc-600"
                                                        )}>
                                                            {selected && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                                                        </div>
                                                        <span className="text-sm font-medium leading-normal">{option}</span>
                                                    </Label>
                                                );
                                            })}
                                        </RadioGroup>
                                    )}

                                    {/* SHORT Renderer */}
                                    {q.type === "SHORT" && (
                                        <Input
                                            value={answers[q.id] || ""}
                                            onChange={(e) => updateAnswer(q.id, e.target.value)}
                                            placeholder="Type your concise response..."
                                            className="bg-white/[0.03] border-white/10 h-14 rounded-2xl px-6 text-base font-medium text-white focus:border-cyan-400 transition-all placeholder:text-zinc-600"
                                        />
                                    )}

                                    {/* LONG Renderer */}
                                    {q.type === "LONG" && (
                                        <div className="space-y-2">
                                            <Textarea
                                                value={answers[q.id] || ""}
                                                onChange={(e) => updateAnswer(q.id, e.target.value)}
                                                placeholder="Enter your detailed response..."
                                                className="bg-white/[0.03] border-white/10 rounded-2xl p-6 text-base font-medium text-white focus:border-cyan-400 transition-all min-h-[220px] leading-relaxed placeholder:text-zinc-600"
                                            />
                                            <div className="flex justify-end pr-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                                {answers[q.id]?.split(/\s+/).filter(Boolean).length || 0} / {q.minWords || 0} Recommended Words
                                            </div>
                                        </div>
                                    )}

                                    {/* TF Renderer */}
                                    {q.type === "TF" && (
                                        <div className="flex gap-4 pt-2">
                                            {["True", "False"].map((val) => {
                                                const selected = answers[q.id] === val;
                                                return (
                                                    <Button
                                                        key={val}
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => updateAnswer(q.id, val)}
                                                        className={cn(
                                                            "flex-1 h-14 rounded-2xl font-mono font-bold uppercase tracking-widest transition-all",
                                                            selected 
                                                                ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10" 
                                                                : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                                                        )}
                                                    >
                                                        {val}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="pt-10 flex flex-col items-center gap-6">
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting} 
                        className="h-16 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-cyan-500/20 active:scale-98 hover:opacity-95"
                    >
                        {isSubmitting ? <Loader2Icon className="w-5 h-5 animate-spin" /> : "Finalize & Submit Assessment"}
                    </Button>
                </div>
            </main>
        </div>
    );
}
