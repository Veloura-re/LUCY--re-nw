"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, AlertCircle, CheckCircle2, Calculator, Printer } from "lucide-react";
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
    const configId = searchParams.get("configId");

    const [config, setConfig] = useState<any>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set()); // Set of studentIds
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

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
            {/* Header */}
            <div className=" border-b border-zinc-200 dark:border-zinc-900/50 px-8 py-6 flex items-center justify-between bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl shrink-0">
                <div>
                    <h2 className="text-2xl font-medium uppercase tracking-tighter text-zinc-900 dark:text-white">
                        {config.class?.name} <span className="text-eduGreen-500 italic">::</span> {config.subject?.name}
                    </h2>
                    <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.3em] mt-1">Academic Performance Matrix</p>
                </div>

                <div className="flex items-center gap-6">
                    {unsavedChanges.size > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-900/30 animate-in fade-in zoom-in duration-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            <span className="text-[9px] font-medium text-amber-600 dark:text-amber-500 uppercase tracking-widest leading-none">Buffers Out of Sync</span>
                        </div>
                    )}

                    <Button
                        onClick={() => handlePrint()}
                        className="h-12 px-8 rounded-2xl font-medium uppercase tracking-[0.2em] text-[10px] transition-all bg-eduGreen-600 hover:bg-eduGreen-500 text-white shadow-lg shadow-eduGreen-900/20 active:scale-95"
                    >
                        <Printer className="w-3.5 h-3.5 mr-2" /> Export PDF Registry
                    </Button>

                    <Button
                        onClick={handleSync}
                        disabled={isSyncing || unsavedChanges.size > 0}
                        className={cn(
                            "h-12 px-6 rounded-2xl font-medium uppercase tracking-[0.2em] text-[10px] transition-all",
                            unsavedChanges.size === 0
                                ? "bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-eduGreen-500 border border-eduGreen-900/30 active:scale-95"
                                : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 border border-zinc-200 dark:border-zinc-900 pointer-events-none opacity-50"
                        )}
                    >
                        {isSyncing ? "Publishing..." : <><CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Publish to Reports</>}
                    </Button>

                    <Button
                        onClick={saveAll}
                        disabled={isSaving || unsavedChanges.size === 0}
                        className={cn(
                            "h-12 px-10 rounded-2xl font-medium uppercase tracking-[0.2em] text-[10px] transition-all",
                            unsavedChanges.size > 0
                                ? "bg-eduGreen-600 hover:bg-eduGreen-500 text-white shadow-2xl shadow-eduGreen-900/30 active:scale-95"
                                : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 border border-zinc-300 dark:border-zinc-800 pointer-events-none"
                        )}
                    >
                        {isSaving ? "Syncing Logic..." : "Commit Changes"}
                    </Button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-auto p-12 custom-scrollbar">
                <div className="rounded-[2.5rem] border border-zinc-200 dark:border-zinc-900/30 bg-white/30 dark:bg-zinc-950/30 shadow-2xl overflow-hidden backdrop-blur-sm">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-zinc-100/20 dark:bg-zinc-900/20 text-[9px] uppercase font-medium tracking-[0.2em] text-zinc-600 sticky top-0 z-10 backdrop-blur-xl">
                            <tr>
                                <th className="px-8 py-5 w-16 text-center">#</th>
                                <th className="px-8 py-5 min-w-[220px]">Student Entity</th>
                                <th className="px-8 py-5 w-32 border-r border-zinc-200 dark:border-zinc-900/20">Access Code</th>

                                {config.columns.map((col: Column) => (
                                    <th key={col.id} className="px-4 py-5 min-w-[130px] text-center border-r border-zinc-200 dark:border-zinc-900/20 bg-zinc-100/10 dark:bg-zinc-900/10">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-zinc-700 dark:text-zinc-300">{col.title}</span>
                                            <span className="text-[7px] text-zinc-600 opacity-70">MAX {col.maxMarks}</span>
                                        </div>
                                    </th>
                                ))}

                                <th className="px-8 py-5 w-24 text-center bg-eduGreen-950/10 text-eduGreen-600">Total</th>
                                <th className="px-8 py-5 w-24 text-center bg-eduGreen-950/20 text-eduGreen-500 border-r border-zinc-200 dark:border-zinc-900/20">%</th>
                                <th className="px-8 py-5 w-20 text-center border-r border-zinc-200 dark:border-zinc-900/20">Grade</th>
                                <th className="px-8 py-5 min-w-[200px]">Strategic Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/20">
                            {entries.map((entry, idx) => (
                                <tr key={entry.id} className="group hover:bg-eduGreen-950/5 transition-all">
                                    <td className="px-8 py-4 font-medium text-[10px] text-zinc-800 dark:text-zinc-200 text-center group-hover:text-zinc-600">{idx + 1}</td>
                                    <td className="px-8 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-zinc-900 dark:text-white dark:text-zinc-100 uppercase tracking-tight leading-tight">{entry.student.firstName} {entry.student.lastName}</span>
                                            <span className="text-[7px] font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-widest mt-1">Authorized Profile</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 font-mono text-[9px] text-zinc-600 border-r border-zinc-200 dark:border-zinc-900/20 tracking-tighter">
                                        {entry.student.studentCode}
                                    </td>

                                    {config.columns.map((col: Column) => {
                                        const mark = entry.marks.find(m => m.columnId === col.id);
                                        const score = mark ? mark.score : "";

                                        return (
                                            <td key={col.id} className="p-2 border-r border-zinc-200 dark:border-zinc-900/20 text-center">
                                                <input
                                                    type="number"
                                                    value={score}
                                                    placeholder="--"
                                                    onChange={(e) => handleScoreChange(idx, col.id, e.target.value)}
                                                    className={cn(
                                                        "w-full h-10 bg-transparent border-0 text-center font-medium text-lg focus:ring-1 focus:ring-eduGreen-600/30 rounded-lg placeholder:text-zinc-900 dark:text-white transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                        score === "" ? "text-zinc-800 dark:text-zinc-200" : getPerformanceColor((parseFloat(score.toString()) / col.maxMarks) * 100).text
                                                    )}
                                                />
                                            </td>
                                        );
                                    })}

                                    <td className={cn(
                                        "px-8 py-4 text-center font-medium text-lg bg-eduGreen-950/5 group-hover:bg-eduGreen-950/10 transition-all",
                                        getPerformanceColor(entry.percentage).text.replace('500', '700')
                                    )}>
                                        {entry.total}
                                    </td>
                                    <td className={cn(
                                        "px-8 py-4 text-center font-medium text-lg bg-eduGreen-950/10 group-hover:bg-eduGreen-950/20 transition-all border-r border-zinc-200 dark:border-zinc-900/20",
                                        getPerformanceColor(entry.percentage).text
                                    )}>
                                        {Math.round(entry.percentage)}
                                    </td>
                                    <td className="px-8 py-4 text-center border-r border-zinc-200 dark:border-zinc-900/20">
                                        <div className={cn(
                                            "inline-flex items-center justify-center w-10 h-10 rounded-xl font-medium text-[11px] shadow-2xl",
                                            getPerformanceColor(entry.percentage).bg,
                                            getPerformanceColor(entry.percentage).text,
                                            getPerformanceColor(entry.percentage).border
                                        )}>
                                            {entry.grade}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <textarea
                                            value={entry.remarks}
                                            onChange={(e) => handleRemarkChange(idx, e.target.value)}
                                            placeholder="Enter faculty observation..."
                                            className="w-full bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-900/50 rounded-xl px-4 py-2 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 focus:border-eduGreen-900/50 focus:bg-white dark:bg-zinc-950 focus:text-zinc-900 dark:text-white transition-all outline-none resize-none h-12"
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
        <Suspense fallback={<div className="p-10 text-center animate-pulse text-zinc-600 font-medium uppercase tracking-widest text-[10px]">Syncing with Central Ledger...</div>}>
            <MarklistViewContent />
        </Suspense>
    );
}

