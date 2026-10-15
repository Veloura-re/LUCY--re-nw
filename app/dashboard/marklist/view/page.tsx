"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, AlertCircle, CheckCircle2, Calculator, Printer, Lock, ArrowLeft, Calendar, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";
import { MarklistPrint } from "@/components/dashboard/marklist-print";
import { toast } from "sonner";

// Types
interface Column {
    id: string;
    title: string;
    maxMarks: number;
    order: number;
    isOptional: boolean;
}
interface Mark {
    id?: string;
    columnId: string;
    score: number;
}
interface Entry {
    id: string; // Entry ID
    studentId: string;
    remarks: string;
    student: {
        id: string;
        firstName: string;
        lastName: string;
        studentCode: string;
    };
    marks: Mark[];
    total: number;
    percentage: number;
    grade: string;
}

function MarklistViewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const configId = searchParams.get("configId");
    const isArchivedParam = searchParams.get("archived") === "true";

    const [config, setConfig] = useState<any>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set()); // Set of studentIds
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const isTermCompleted = useMemo(() => {
        if (!config) return false;
        if (isArchivedParam) return true;
        if (config.isTermCompleted) return true;
        if (config.term) {
            const isInactive = !config.term.isActive;
            const pastEnd = config.term.endDate ? new Date() > new Date(config.term.endDate) : false;
            return isInactive || pastEnd;
        }
        return false;
    }, [config, isArchivedParam]);

    const isLocked = Boolean(config?.isLocked);
    const canEdit = config?.canEdit !== undefined ? config.canEdit : (!isTermCompleted && !isLocked);
    const isReadOnly = isTermCompleted || isLocked || !canEdit;

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `marklist_${config?.class?.name}_${config?.subject?.name}_${new Date().toISOString().slice(0, 10)}`,
    });

    // Real implementation of loadData
    useEffect(() => {
        if (!configId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const confRes = await fetch(`/api/marklist/config?id=${configId}`);
                const entriesRes = await fetch(`/api/marklist/entry?configId=${configId}`);

                if (confRes.ok && entriesRes.ok) {
                    const confData = await confRes.json() as any;
                    const entData = await entriesRes.json() as any;

                    setConfig(confData);
                    const calculatedEntries = entData.map((e: any) => recalculateEntry(e, confData.columns));
                    setEntries(calculatedEntries);

                    if (searchParams.get("autoPrint") === "true") {
                        setTimeout(() => {
                            if (printRef.current) {
                                handlePrint();
                            }
                        }, 500);
                    }
                }
            } catch (e) {
                console.error(e);
                toast.error("Failed to load marklist");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [configId]);

    const calculateGrade = (pct: number) => {
        if (pct >= 90) return "A+";
        if (pct >= 80) return "A";
        if (pct >= 70) return "B";
        if (pct >= 60) return "C";
        if (pct >= 50) return "D";
        if (pct >= 40) return "E";
        return "F";
    };

    const getPerformanceColor = (pct: number) => {
        if (pct >= 80) return { text: "text-emerald-500", border: "border-emerald-900/30", bg: "bg-emerald-900/10", raw: "emerald" };
        if (pct >= 60) return { text: "text-blue-500", border: "border-blue-900/30", bg: "bg-blue-900/10", raw: "blue" };
        if (pct >= 40) return { text: "text-amber-600 dark:text-amber-500", border: "border-amber-900/30", bg: "bg-amber-900/10", raw: "amber" };
        return { text: "text-rose-500", border: "border-rose-900/30", bg: "bg-rose-900/10", raw: "rose" };
    };

    const recalculateEntry = (entry: any, columns: Column[]) => {
        let total = 0;
        let maxTotal = 0;

        columns.forEach(col => {
            const mark = entry.marks.find((m: Mark) => m.columnId === col.id);

            if (mark !== undefined && mark !== null) {
                const score = parseFloat(mark.score as any) || 0;
                total += score;
                maxTotal += col.maxMarks;
            }
        });

        const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

        return {
            ...entry,
            remarks: entry.remarks || "",
            total: parseFloat(total.toFixed(2)),
            percentage: parseFloat(pct.toFixed(1)),
            grade: calculateGrade(pct)
        };
    };

    const handleScoreChange = (entryIndex: number, columnId: string, val: string) => {
        if (isReadOnly) {
            toast.error(
                isTermCompleted
                    ? "Academic term is completed. Marklists for finalized terms are read-only."
                    : "Editing is not permitted on this marklist."
            );
            return;
        }

        const newEntries = [...entries];
        const entry = { ...newEntries[entryIndex] };
        const dimMarks = [...(entry.marks || [])];

        const existingMarkIndex = dimMarks.findIndex(m => m.columnId === columnId);

        if (val.trim() === "") {
            if (existingMarkIndex >= 0) {
                dimMarks.splice(existingMarkIndex, 1);
            }
        } else {
            let score = parseFloat(val);
            if (isNaN(score)) score = 0;

            const col = config.columns.find((c: Column) => c.id === columnId);
            if (col && score > col.maxMarks) {
                toast.warning(`Max marks for ${col.title} is ${col.maxMarks}`);
                score = col.maxMarks;
            }
            if (score < 0) score = 0;

            if (existingMarkIndex >= 0) {
                dimMarks[existingMarkIndex] = { ...dimMarks[existingMarkIndex], score };
            } else {
                dimMarks.push({ columnId, score });
            }
        }

        entry.marks = dimMarks;
        newEntries[entryIndex] = recalculateEntry(entry, config.columns);

        setEntries(newEntries);
        setUnsavedChanges(prev => {
            const newSet = new Set(prev);
            newSet.add(entry.studentId);
            return newSet;
        });
    };

    const handleRemarkChange = (entryIndex: number, val: string) => {
        if (isReadOnly) return;

        const newEntries = [...entries];
        newEntries[entryIndex] = { ...newEntries[entryIndex], remarks: val };
        setEntries(newEntries);
        setUnsavedChanges(prev => {
            const newSet = new Set(prev);
            newSet.add(newEntries[entryIndex].studentId);
            return newSet;
        });
    };

    const saveAll = async () => {
        if (isReadOnly) {
            toast.error("Academic term is finalized. Saving changes is disabled.");
            return;
        }
        if (unsavedChanges.size === 0) return;
        setIsSaving(true);

        const updates: any[] = [];
        entries.forEach(e => {
            if (unsavedChanges.has(e.studentId)) {
                updates.push({
                    studentId: e.studentId,
                    remarks: e.remarks,
                    marks: config.columns.map((col: Column) => {
                        const m = e.marks.find(mark => mark.columnId === col.id);
                        return {
                            columnId: col.id,
                            score: m !== undefined ? m.score : null
                        };
                    })
                });
            }
        });

        try {
            const res = await fetch("/api/marklist/entry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ configId, updates })
            });

            const data = (await res.json()) as any;

            if (res.ok) {
                setUnsavedChanges(new Set());
                toast.success("Marks & Remarks saved");
            } else {
                toast.error(data.error || "Failed to save changes");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSync = async () => {
        if (unsavedChanges.size > 0) {
            toast.error("Please commit changes before publishing to reports");
            return;
        }

        setIsSyncing(true);
        try {
            const res = await fetch("/api/marklist/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ configId })
            });

            const data = await res.json() as any;
            if (res.ok) {
                toast.success(`Successfully published ${data.updatedCount} records to official gradebook`);
            } else {
                toast.error(data.error || "Failed to publish reports");
            }
        } catch (e) {
            toast.error("Network error during sync");
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse text-zinc-600 font-medium uppercase tracking-widest text-[10px]">Accessing Central Ledger...</div>;
    if (!config) return <div className="p-10 text-center text-red-600 dark:text-red-500 font-medium">Configuration Missing</div>;

    return (
        <div className="flex flex-col h-screen max-h-screen bg-white dark:bg-zinc-950">
            {/* Term Status Alert Banners */}
            {isTermCompleted && (
                <div className="bg-amber-500/10 border-b border-amber-500/30 px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-700 dark:text-amber-400 font-medium shrink-0">
                    <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>
                            <strong>Term Completed (Read-Only Mode):</strong> This marklist belongs to a concluded academic term{config?.term?.name ? ` (${config.term.name})` : ""}. Score modifications are locked for audit preservation.
                        </span>
                    </div>
                    <Link
                        href="/dashboard/marklist/archive"
                        className="underline hover:text-amber-900 dark:hover:text-amber-300 font-semibold uppercase text-[10px] tracking-wider shrink-0"
                    >
                        Return to Archive
                    </Link>
                </div>
            )}

            {!isTermCompleted && isLocked && (
                <div className="bg-zinc-500/10 border-b border-zinc-500/30 px-8 py-3 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 font-medium shrink-0">
                    <Lock className="w-4 h-4 shrink-0 text-zinc-500" />
                    <span>This marklist has been locked by administration. Faculty score modifications are restricted.</span>
                </div>
            )}

            {!isTermCompleted && !isLocked && !canEdit && (
                <div className="bg-blue-500/10 border-b border-blue-500/30 px-8 py-3 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 font-medium shrink-0">
                    <AlertCircle className="w-4 h-4 shrink-0 text-blue-500" />
                    <span>Read-Only View: You are inspecting this marklist in review mode as an observer. Only assigned educators and homeroom faculty can commit grade updates.</span>
                </div>
            )}

            {/* Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-900/50 px-4 sm:px-6 md:px-8 py-4 md:py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-100/60 dark:bg-zinc-950/60 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(isArchivedParam ? "/dashboard/marklist/archive" : "/dashboard/marklist")}
                        className="rounded-xl h-9 w-9 sm:h-10 sm:w-10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white shrink-0"
                        title="Back to marklists"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <h2 className="text-base sm:text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white truncate">
                                {config.class?.name} <span className="text-emerald-500 italic">::</span> {config.subject?.name}
                            </h2>
                            {config.term?.name && (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-[9px] uppercase tracking-wider font-semibold shrink-0",
                                        isTermCompleted
                                            ? "bg-zinc-200/50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                    )}
                                >
                                    {isTermCompleted ? (
                                        <><Lock className="w-2.5 h-2.5 mr-1" /> {config.term.name} (Concluded)</>
                                    ) : (
                                        <><CheckCircle2 className="w-2.5 h-2.5 mr-1" /> {config.term.name} (Live)</>
                                    )}
                                </Badge>
                            )}
                        </div>
                        <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.3em] mt-0.5 truncate">
                            Academic Performance & Evaluation System
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {!isReadOnly && unsavedChanges.size > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-900/30 animate-in fade-in zoom-in duration-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest leading-none">
                                Unsaved Changes ({unsavedChanges.size})
                            </span>
                        </div>
                    )}

                    <Button
                        onClick={() => handlePrint()}
                        className="h-9 sm:h-10 px-3 sm:px-5 rounded-xl font-bold uppercase tracking-[0.15em] text-[9px] sm:text-[10px] transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20 active:scale-95"
                    >
                        <Printer className="w-3.5 h-3.5 mr-1.5 sm:mr-2" /> Export PDF Registry
                    </Button>

                    <Button
                        onClick={handleSync}
                        disabled={isSyncing || unsavedChanges.size > 0}
                        className={cn(
                            "h-9 sm:h-10 px-3 sm:px-5 rounded-xl font-bold uppercase tracking-[0.15em] text-[9px] sm:text-[10px] transition-all",
                            unsavedChanges.size === 0
                                ? "bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border border-emerald-900/30 active:scale-95"
                                : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800 pointer-events-none opacity-50"
                        )}
                    >
                        {isSyncing ? "Publishing..." : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Publish to Reports</>}
                    </Button>

                    <Button
                        onClick={saveAll}
                        disabled={isReadOnly || isSaving || unsavedChanges.size === 0}
                        className={cn(
                            "h-9 sm:h-10 px-4 sm:px-6 rounded-xl font-bold uppercase tracking-[0.15em] text-[9px] sm:text-[10px] transition-all",
                            !isReadOnly && unsavedChanges.size > 0
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/30 active:scale-95"
                                : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border border-zinc-300 dark:border-zinc-800 cursor-not-allowed opacity-60"
                        )}
                    >
                        {isSaving
                            ? "Saving Marks..."
                            : isTermCompleted
                            ? "Term Finalized (Read-Only)"
                            : isLocked
                            ? "Marklist Locked"
                            : !canEdit
                            ? "Read-Only View"
                            : "Commit Changes"}
                    </Button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-auto p-3 sm:p-6 md:p-8 custom-scrollbar">
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/40 shadow-xl overflow-hidden backdrop-blur-sm">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-zinc-100/60 dark:bg-zinc-900/60 text-[9px] uppercase font-bold tracking-[0.15em] text-zinc-600 dark:text-zinc-400 sticky top-0 z-10 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-900">
                            <tr>
                                <th className="px-6 py-4 w-14 text-center">#</th>
                                <th className="px-6 py-4 min-w-[200px]">Student Entity</th>
                                <th className="px-6 py-4 w-28 border-r border-zinc-200 dark:border-zinc-900/30">Access Code</th>

                                {config.columns.map((col: Column) => (
                                    <th key={col.id} className="px-4 py-4 min-w-[120px] text-center border-r border-zinc-200 dark:border-zinc-900/30 bg-zinc-100/30 dark:bg-zinc-900/30">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{col.title}</span>
                                            <span className="text-[7px] text-zinc-500">MAX {col.maxMarks}</span>
                                        </div>
                                    </th>
                                ))}

                                <th className="px-6 py-4 w-20 text-center bg-emerald-950/10 text-emerald-600 font-bold">Total</th>
                                <th className="px-6 py-4 w-20 text-center bg-emerald-950/20 text-emerald-500 font-bold border-r border-zinc-200 dark:border-zinc-900/30">%</th>
                                <th className="px-6 py-4 w-16 text-center border-r border-zinc-200 dark:border-zinc-900/30">Grade</th>
                                <th className="px-6 py-4 min-w-[180px]">Faculty Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-900/40">
                            {entries.map((entry, idx) => (
                                <tr key={entry.id} className="group hover:bg-zinc-100/40 dark:hover:bg-zinc-900/40 transition-all">
                                    <td className="px-6 py-3.5 font-medium text-[10px] text-zinc-500 text-center">{idx + 1}</td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-zinc-900 dark:text-white uppercase tracking-tight leading-tight">
                                                {entry.student.firstName} {entry.student.lastName}
                                            </span>
                                            <span className="text-[8px] font-medium text-zinc-400 uppercase tracking-widest mt-0.5">
                                                Active Scholar
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 font-mono text-[9px] text-zinc-500 border-r border-zinc-200 dark:border-zinc-900/30 tracking-tight">
                                        {entry.student.studentCode}
                                    </td>

                                    {config.columns.map((col: Column) => {
                                        const mark = entry.marks.find(m => m.columnId === col.id);
                                        const score = mark ? mark.score : "";

                                        return (
                                            <td key={col.id} className="p-1.5 border-r border-zinc-200 dark:border-zinc-900/30 text-center">
                                                <input
                                                    type="number"
                                                    value={score}
                                                    placeholder="--"
                                                    disabled={isReadOnly}
                                                    readOnly={isReadOnly}
                                                    onChange={(e) => handleScoreChange(idx, col.id, e.target.value)}
                                                    className={cn(
                                                        "w-full h-9 bg-transparent border-0 text-center font-bold text-base rounded-lg transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                        isReadOnly ? "cursor-not-allowed opacity-90" : "focus:ring-1 focus:ring-emerald-600/30 hover:bg-zinc-200/30 dark:hover:bg-zinc-800/30",
                                                        score === "" ? "text-zinc-400" : getPerformanceColor((parseFloat(score.toString()) / col.maxMarks) * 100).text
                                                    )}
                                                />
                                            </td>
                                        );
                                    })}

                                    <td className={cn(
                                        "px-6 py-3.5 text-center font-bold text-base bg-emerald-950/5 group-hover:bg-emerald-950/10 transition-all",
                                        getPerformanceColor(entry.percentage).text.replace('500', '700')
                                    )}>
                                        {entry.total}
                                    </td>
                                    <td className={cn(
                                        "px-6 py-3.5 text-center font-bold text-base bg-emerald-950/10 group-hover:bg-emerald-950/20 transition-all border-r border-zinc-200 dark:border-zinc-900/30",
                                        getPerformanceColor(entry.percentage).text
                                    )}>
                                        {Math.round(entry.percentage)}
                                    </td>
                                    <td className="px-6 py-3.5 text-center border-r border-zinc-200 dark:border-zinc-900/30">
                                        <div className={cn(
                                            "inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-[11px] shadow-sm",
                                            getPerformanceColor(entry.percentage).bg,
                                            getPerformanceColor(entry.percentage).text,
                                            getPerformanceColor(entry.percentage).border
                                        )}>
                                            {entry.grade}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <textarea
                                            value={entry.remarks}
                                            disabled={isReadOnly}
                                            readOnly={isReadOnly}
                                            onChange={(e) => handleRemarkChange(idx, e.target.value)}
                                            placeholder={isReadOnly ? "No observations recorded" : "Enter faculty observation..."}
                                            className={cn(
                                                "w-full bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/60 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all outline-none resize-none h-9",
                                                isReadOnly ? "cursor-not-allowed text-zinc-400" : "text-zinc-600 dark:text-zinc-300 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-zinc-900"
                                            )}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hidden Print Template */}
            <div className="sr-only" aria-hidden="true">
                <MarklistPrint ref={printRef} config={config} entries={entries} />
            </div>
        </div>
    );
}

export default function MarklistViewPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center animate-pulse text-zinc-600 font-medium uppercase tracking-widest text-[10px]">Accessing Central Ledger...</div>}>
            <MarklistViewContent />
        </Suspense>
    );
}


