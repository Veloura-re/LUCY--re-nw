'use client';

import React, { useState } from 'react';
import { EssayScanResult, FlaggedPassage } from '@/lib/ai';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Brain, 
    ShieldCheck, 
    AlertTriangle, 
    Sparkles, 
    Check, 
    X, 
    BookOpen, 
    Lightbulb, 
    Layers, 
    Flame, 
    RotateCw, 
    Loader2, 
    CheckCircle2,
    MessageSquareQuote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AiEssayScannerDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    submission: any;
    assignment: any;
    onApplyGradeAndFeedback: (grade: number, feedback: string) => void;
}

export function AiEssayScannerDrawer({
    isOpen,
    onClose,
    submission,
    assignment,
    onApplyGradeAndFeedback
}: AiEssayScannerDrawerProps) {
    const [scanResult, setScanResult] = useState<EssayScanResult | null>(
        (submission?.aiScanResult as EssayScanResult) || null
    );
    const [loading, setLoading] = useState(false);
    const [selectedTone, setSelectedTone] = useState<'encouraging' | 'analytical' | 'socratic' | 'direct'>('encouraging');
    const [applied, setApplied] = useState(false);

    // Trigger AI Scan
    const handleScan = async (forceRescan = false) => {
        if (!submission?.id) return;
        setLoading(true);
        try {
            const res = await fetch('/api/school/assignments/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submissionId: submission.id,
                    forceRescan
                })
            });
            const data = (await res.json()) as any;
            if (data.success && data.scanResult) {
                setScanResult(data.scanResult);
            }
        } catch (err) {
            console.error('Scan failed', err);
        } finally {
            setLoading(false);
        }
    };

    // Auto-scan if no scan result exists when opening
    React.useEffect(() => {
        if (isOpen && !scanResult && submission?.content && !loading) {
            handleScan();
        }
    }, [isOpen, submission?.id]);

    if (!isOpen) return null;

    const authScore = scanResult?.authenticityScore ?? 85;
    const scoreColor = authScore >= 80 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
        : authScore >= 50 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
        : 'text-rose-400 border-rose-500/30 bg-rose-500/10';

    const dialStroke = authScore >= 80 ? '#10b981' : authScore >= 50 ? '#f59e0b' : '#f43f5e';
    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (authScore / 100) * circumference;

    const currentFeedback = scanResult?.feedbackVariants?.[selectedTone] || scanResult?.suggestedFeedback || '';

    const handleApply = () => {
        if (!scanResult) return;
        onApplyGradeAndFeedback(scanResult.suggestedScore, currentFeedback);
        setApplied(true);
        setTimeout(() => setApplied(false), 2500);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex justify-end">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                />

                {/* Slide-over Panel */}
                <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="relative w-full max-w-2xl h-full bg-zinc-950/95 border-l border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col z-[101] text-zinc-100 overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                                <Brain className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black text-white uppercase tracking-tight italic">AI Essay Scanner</h2>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                        Sentinel v2
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 font-mono">
                                    {submission?.student?.firstName} {submission?.student?.lastName} • {assignment?.title}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleScan(true)}
                                disabled={loading}
                                className="h-9 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-400 hover:text-white"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                                <span className="ml-1.5 text-[10px] uppercase font-mono tracking-wider">Re-Scan</span>
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={onClose}
                                className="w-9 h-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Content Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                        {loading && !scanResult ? (
                            <div className="h-96 flex flex-col items-center justify-center space-y-4 text-center">
                                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                                <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                                    Scanning Authenticity & Structural Nuances...
                                </p>
                            </div>
                        ) : scanResult ? (
                            <>
                                {/* Gauge & Classification Hero */}
                                <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                                    {/* Radial Dial */}
                                    <div className="relative flex items-center justify-center flex-shrink-0">
                                        <svg className="w-28 h-28 transform -rotate-90">
                                            <circle
                                                cx="56"
                                                cy="56"
                                                r="40"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                className="text-white/5"
                                                fill="transparent"
                                            />
                                            <circle
                                                cx="56"
                                                cy="56"
                                                r="40"
                                                stroke={dialStroke}
                                                strokeWidth="8"
                                                strokeDasharray={circumference}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                                fill="transparent"
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute flex flex-col items-center justify-center text-center">
                                            <span className="text-2xl font-black font-mono leading-none tracking-tight">{authScore}%</span>
                                            <span className="text-[8px] uppercase tracking-widest font-mono text-zinc-500 mt-1">Human</span>
                                        </div>
                                    </div>

                                    {/* Origin Summary */}
                                    <div className="flex-1 space-y-2 text-center sm:text-left">
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                            <Badge variant="outline" className={cn("px-3 py-1 font-mono uppercase text-[10px] tracking-widest", scoreColor)}>
                                                {scanResult.originClassification.replace(/_/g, ' ')}
                                            </Badge>
                                            <span className="text-[10px] font-mono text-zinc-500">
                                                {scanResult.wordCount} Words
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                                            {scanResult.authenticityReasoning}
                                        </p>
                                    </div>
                                </div>

                                {/* Flagged Passages (if any) */}
                                {scanResult.flaggedPassages && scanResult.flaggedPassages.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                                            <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-300">
                                                Flagged Passages ({scanResult.flaggedPassages.length})
                                            </h3>
                                        </div>
                                        <div className="space-y-2">
                                            {scanResult.flaggedPassages.map((flag: FlaggedPassage, i: number) => (
                                                <div 
                                                    key={i} 
                                                    className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2"
                                                >
                                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                                        <span className="text-amber-400 font-bold uppercase tracking-wider">Passage {i + 1}</span>
                                                        <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[8px] uppercase">
                                                            {flag.riskLevel} Risk
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs italic text-zinc-300 bg-black/40 p-3 rounded-xl border border-white/5 font-serif">
                                                        "{flag.passage}"
                                                    </p>
                                                    <p className="text-[11px] text-amber-200/80 font-medium">
                                                        {flag.reason}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Thesis & Core Arguments */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-cyan-400" />
                                        <h3 className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-300">
                                            Thesis & Key Claims
                                        </h3>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Central Thesis</div>
                                        <p className="text-xs font-semibold text-white leading-relaxed">
                                            {scanResult.thesisSummary}
                                        </p>

                                        {scanResult.keyArguments && scanResult.keyArguments.length > 0 && (
                                            <div className="pt-3 border-t border-white/5 space-y-2">
                                                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Core Arguments</div>
                                                <ul className="space-y-1.5">
                                                    {scanResult.keyArguments.map((arg, idx) => (
                                                        <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                                                            <span className="text-cyan-400 font-mono font-bold">{idx + 1}.</span>
                                                            <span>{arg}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Strengths & Growth Areas */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
                                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span>Key Strengths</span>
                                        </div>
                                        <ul className="space-y-1">
                                            {scanResult.strengths?.map((s, idx) => (
                                                <li key={idx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
                                                    <span className="text-emerald-400">•</span>
                                                    <span>{s}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 space-y-2">
                                        <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold uppercase">
                                            <Layers className="w-3.5 h-3.5" />
                                            <span>Growth Opportunities</span>
                                        </div>
                                        <ul className="space-y-1">
                                            {scanResult.growthAreas?.map((g, idx) => (
                                                <li key={idx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
                                                    <span className="text-indigo-400">•</span>
                                                    <span>{g}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Readability & Style Notes */}
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <BookOpen className="w-4 h-4 text-zinc-400" />
                                        <div>
                                            <div className="text-[10px] font-mono uppercase text-zinc-500">Readability Diagnostic</div>
                                            <div className="text-xs font-semibold text-white">{scanResult.readabilityScore}</div>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="border-white/10 font-mono text-[9px] text-zinc-400">
                                        {scanResult.grammarAndStyleNotes?.[0] || "Standard Syntactic Flow"}
                                    </Badge>
                                </div>

                                {/* 1-Click Auto-Rubric Scoring & Tone Shaper */}
                                <div className="p-6 rounded-3xl bg-cyan-500/5 border border-cyan-500/20 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-xs uppercase tracking-wider">
                                            <Sparkles className="w-4 h-4" />
                                            <span>Rubric Recommendation</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black font-mono text-white">{scanResult.suggestedScore}</span>
                                            <span className="text-xs font-mono text-zinc-500"> / {assignment?.maxScore || 100}</span>
                                        </div>
                                    </div>

                                    {/* Tone Selector Pills */}
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Feedback Tone Variant</div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {(['encouraging', 'analytical', 'socratic', 'direct'] as const).map((tone) => (
                                                <button
                                                    key={tone}
                                                    type="button"
                                                    onClick={() => setSelectedTone(tone)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider font-bold transition-all border",
                                                        selectedTone === tone
                                                            ? "bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/20"
                                                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                                                    )}
                                                >
                                                    {tone}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Feedback Preview */}
                                    <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                                            <MessageSquareQuote className="w-3.5 h-3.5 text-cyan-400" />
                                            <span>Generated Feedback Draft ({selectedTone})</span>
                                        </div>
                                        <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                                            {currentFeedback}
                                        </p>
                                    </div>

                                    {/* 1-Click Apply Button */}
                                    <Button 
                                        type="button"
                                        onClick={handleApply}
                                        className={cn(
                                            "w-full h-12 rounded-2xl font-mono font-bold uppercase tracking-widest text-xs transition-all shadow-lg",
                                            applied 
                                                ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                                                : "bg-gradient-to-r from-cyan-500 to-emerald-500 hover:opacity-95 text-black"
                                        )}
                                    >
                                        {applied ? (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Applied to Grading HUD!</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                <span>Apply Suggested Grade & Feedback</span>
                                            </div>
                                        )}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center space-y-4 text-center">
                                <p className="text-xs text-zinc-500 font-mono">No analysis report available.</p>
                                <Button onClick={() => handleScan(true)} className="bg-cyan-500 text-black font-mono text-xs uppercase font-bold">
                                    Generate AI Scan
                                </Button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
