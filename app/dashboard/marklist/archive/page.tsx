"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    FileSpreadsheet,
    ArrowRight,
    Loader2,
    Calendar,
    Lock,
    Search,
    Archive,
    CheckCircle2,
    Printer,
    Layers,
    Clock,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";

export default function FinishedTermsArchivePage() {
    const router = useRouter();
    const [configs, setConfigs] = useState<any[]>([]);
    const [activeTerm, setActiveTerm] = useState<any>(null);
    const [finishedTerms, setFinishedTerms] = useState<any[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 30;

    const fetchArchive = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                termStatus: "finished"
            });

            if (selectedTermId !== "all") {
                params.set("termId", selectedTermId);
            }

            if (searchQuery.trim()) {
                params.set("search", searchQuery.trim());
            }

            const res = await fetch(`/api/marklist/config/list?${params.toString()}`);
            if (res.ok) {
                const data = await res.json() as any;
                setConfigs(data.configs || []);
                setActiveTerm(data.activeTerm || null);
                setFinishedTerms(data.finishedTerms || []);
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages || 1);
                }
            }
        } catch (error) {
            console.error("Archive fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [page, selectedTermId, searchQuery]);

    useEffect(() => {
        fetchArchive();
    }, [fetchArchive]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24 animate-in fade-in duration-300">
            {/* Header & Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-900 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-zinc-500 mb-2">
                        <Link href="/dashboard/marklist" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                            Marklist Module
                        </Link>
                        <span>/</span>
                        <span className="text-zinc-900 dark:text-zinc-200">Finished Terms Archive</span>
                    </div>
                    <h1 className="text-3xl font-medium tracking-tight text-zinc-900 dark:text-white uppercase">
                        Concluded Terms Archive
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 font-medium text-sm mt-1">
                        Historical marklist registries for completed academic terms. Sealed for audit compliance.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/dashboard/marklist">
                        <Button
                            variant="outline"
                            className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl h-11 px-5 text-xs uppercase tracking-wider font-medium"
                        >
                            <Layers className="w-4 h-4 mr-2" /> Live Marklists
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Active Academic Term Status Banner */}
            <div className="rounded-2xl p-6 border transition-all bg-gradient-to-r from-emerald-500/10 via-zinc-100/50 to-zinc-100/50 dark:from-emerald-950/20 dark:via-zinc-900/50 dark:to-zinc-900/50 border-emerald-500/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                            <span className="text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                                Active Academic Term
                            </span>
                        </div>
                        {activeTerm ? (
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                                    {activeTerm.name}
                                </h3>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-2 mt-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>
                                        {format(new Date(activeTerm.startDate), "MMM d, yyyy")} - {format(new Date(activeTerm.endDate), "MMM d, yyyy")}
                                    </span>
                                    <span className="text-zinc-400 dark:text-zinc-600">|</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Live Score Entry Open</span>
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                No active term configured. Contact administration to activate the current academic session.
                            </p>
                        )}
                    </div>

                    {activeTerm && (
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard/marklist">
                                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 px-5 text-xs uppercase tracking-wider font-bold shadow-md shadow-emerald-900/20">
                                    Switch to Live Marklists <ArrowRight className="w-3.5 h-3.5 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Term Filter Pills & Search */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    {/* Finished Terms Selector Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <button
                            type="button"
                            onClick={() => { setSelectedTermId("all"); setPage(1); }}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap border ${
                                selectedTermId === "all"
                                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm"
                                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                        >
                            All Finished Terms
                        </button>
                        {finishedTerms.map((term) => (
                            <button
                                key={term.id}
                                type="button"
                                onClick={() => { setSelectedTermId(term.id); setPage(1); }}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-2 ${
                                    selectedTermId === term.id
                                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm"
                                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                }`}
                            >
                                <Archive className="w-3 h-3 opacity-70" />
                                <span>{term.name}</span>
                                {term._count?.marklists !== undefined && (
                                    <span className="text-[10px] opacity-70 font-mono">({term._count.marklists})</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[260px] md:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        <Input
                            placeholder="Search class or subject..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="pl-9 h-10 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs rounded-xl"
                        />
                    </div>
                </div>
            </div>

            {/* Marklist Registry Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-500 mb-3" />
                    <p className="text-xs uppercase font-medium tracking-widest text-zinc-500">
                        Retrieving Archived Registries...
                    </p>
                </div>
            ) : configs.length === 0 ? (
                <Card className="bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800">
                    <CardContent className="py-20 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                            <Archive className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">
                            No Concluded Marklists Discovered
                        </h3>
                        <p className="text-xs text-zinc-500 max-w-md mx-auto">
                            {selectedTermId !== "all"
                                ? "No marklist dossiers are linked to the selected finished term."
                                : "No finalized or completed term marklists exist in the institutional repository."}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {configs.map((conf) => (
                        <Card
                            key={conf.id}
                            className="group bg-zinc-100/60 dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all relative overflow-hidden rounded-2xl shadow-sm"
                        >
                            {/* Archive status top stripe */}
                            <div className="h-1 w-full bg-zinc-300 dark:bg-zinc-800 group-hover:bg-zinc-500 transition-colors" />

                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-white uppercase tracking-tight">
                                        {conf.class?.name || "Assigned Class"}
                                    </CardTitle>
                                    <Badge
                                        variant="outline"
                                        className="bg-zinc-200/50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1"
                                    >
                                        <Lock className="w-2.5 h-2.5" /> Read-Only
                                    </Badge>
                                </div>
                                <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>{conf.subject?.name || "Assigned Subject"}</span>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Metadata details */}
                                <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 border-t border-b border-zinc-200 dark:border-zinc-800/80 py-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] uppercase tracking-wider text-zinc-500">Academic Term:</span>
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {conf.term?.name || "Archived Term"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] uppercase tracking-wider text-zinc-500">Assessments:</span>
                                        <span className="font-mono text-zinc-800 dark:text-zinc-200">
                                            {conf.columns?.length || conf._count?.columns || 0} Columns
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] uppercase tracking-wider text-zinc-500">Student Entries:</span>
                                        <span className="font-mono text-zinc-800 dark:text-zinc-200">
                                            {conf._count?.entries || 0} Registered
                                        </span>
                                    </div>
                                    {conf.teacher?.name && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Faculty:</span>
                                            <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">
                                                {conf.teacher.name}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-1">
                                    <Button
                                        onClick={() => router.push(`/dashboard/marklist/view?configId=${conf.id}&archived=true`)}
                                        className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider h-9 rounded-xl"
                                    >
                                        Inspect Registry <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                    </Button>
                                    <Button
                                        onClick={() => router.push(`/dashboard/marklist/view?configId=${conf.id}&autoPrint=true`)}
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl"
                                        title="Print Registry"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-4 rounded-xl">
                    <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs rounded-lg"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs rounded-lg"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
