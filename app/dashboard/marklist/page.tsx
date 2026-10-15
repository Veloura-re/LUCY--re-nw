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
    Archive,
    Search,
    Lock,
    CheckCircle2,
    Layers,
    Sparkles,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";

export default function MarklistIndexPage() {
    const router = useRouter();
    const [configs, setConfigs] = useState<any[]>([]);
    const [activeTerm, setActiveTerm] = useState<any>(null);
    const [finishedTerms, setFinishedTerms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [termFilter, setTermFilter] = useState<"active" | "all">("active");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 30;

    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                termStatus: termFilter
            });

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
        } catch (e) {
            console.error("Fetch Marklists Error:", e);
        } finally {
            setLoading(false);
        }
    }, [page, termFilter, searchQuery]);

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    return (
        <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24 animate-in fade-in duration-300">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-900 pb-6">
                <div>
                    <h1 className="text-3xl font-medium uppercase tracking-tight text-zinc-900 dark:text-white">
                        Academic Marklists
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 font-medium text-sm mt-1">
                        Select an assigned class and subject marklist to manage grading and evaluation matrices.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/dashboard/marklist/archive">
                        <Button
                            variant="outline"
                            className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl h-11 px-5 text-xs uppercase tracking-wider font-medium"
                        >
                            <Archive className="w-4 h-4 mr-2 text-zinc-500" />
                            Finished Terms Archive
                            {finishedTerms.length > 0 && (
                                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                                    {finishedTerms.length}
                                </Badge>
                            )}
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
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                                    {activeTerm.name}
                                </h3>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-2 mt-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>
                                        {format(new Date(activeTerm.startDate), "MMM d, yyyy")} - {format(new Date(activeTerm.endDate), "MMM d, yyyy")}
                                    </span>
                                    <span className="text-zinc-400 dark:text-zinc-600">|</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        Live Marklists Editable by Assigned Faculty
                                    </span>
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
                                    No Active Academic Term Configured
                                </h3>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Academic grading is in standby mode. Administrators can set an active term in Settings.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Link href="/dashboard/marklist/archive">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs uppercase font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            >
                                Browse Historical Records <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search Controls */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                    <button
                        type="button"
                        onClick={() => { setTermFilter("active"); setPage(1); }}
                        className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border whitespace-nowrap shrink-0 ${
                            termFilter === "active"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        }`}
                    >
                        Live Term Marklists
                    </button>
                    <button
                        type="button"
                        onClick={() => { setTermFilter("all"); setPage(1); }}
                        className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border whitespace-nowrap shrink-0 ${
                            termFilter === "all"
                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm"
                                : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        }`}
                    >
                        All Marklists
                    </button>
                    <Link href="/dashboard/marklist/archive" className="shrink-0">
                        <button
                            type="button"
                            className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <Archive className="w-3.5 h-3.5" />
                            Finished Terms Archive
                        </button>
                    </Link>
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

            {/* Marklist Registry Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-500 mb-3" />
                    <p className="text-xs uppercase font-medium tracking-widest text-zinc-500">
                        Accessing Marklist Matrix...
                    </p>
                </div>
            ) : configs.length === 0 ? (
                <Card className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800">
                    <CardContent className="p-16 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">
                            {termFilter === "active" ? "No Active Term Marklists Found" : "No Marklists Configured"}
                        </h3>
                        <p className="text-xs text-zinc-500 max-w-md mx-auto">
                            {termFilter === "active"
                                ? "No marklists are currently active for this term. If the academic term recently concluded, check the Finished Terms Archive."
                                : "No marklist dossiers have been initialized yet for your school."}
                        </p>
                        {termFilter === "active" && (
                            <div className="pt-2">
                                <Link href="/dashboard/marklist/archive">
                                    <Button variant="outline" className="text-xs uppercase font-medium rounded-xl h-9">
                                        <Archive className="w-3.5 h-3.5 mr-2" /> Inspect Concluded Terms Archive
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {configs.map((conf) => {
                        const isLive = conf.isLiveTerm;
                        const isCompleted = conf.isTermCompleted;
                        const canEdit = conf.canEdit;

                        return (
                            <Card
                                key={conf.id}
                                className={`group bg-zinc-100/60 dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer relative overflow-hidden rounded-2xl shadow-sm ${
                                    isLive ? "hover:shadow-emerald-950/10" : ""
                                }`}
                                onClick={() => router.push(`/dashboard/marklist/view?configId=${conf.id}`)}
                            >
                                {/* Left accent stripe */}
                                <div
                                    className={`absolute top-0 bottom-0 left-0 w-1 transition-colors ${
                                        isLive
                                            ? "bg-emerald-500"
                                            : "bg-zinc-300 dark:bg-zinc-800 group-hover:bg-zinc-500"
                                    }`}
                                />

                                <CardHeader className="pb-3 pl-6">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-white uppercase tracking-tight">
                                            {conf.class?.name}
                                        </CardTitle>
                                        {isLive ? (
                                            <Badge
                                                variant="outline"
                                                className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[9px] uppercase tracking-wider font-bold"
                                            >
                                                Live Term
                                            </Badge>
                                        ) : isCompleted ? (
                                            <Badge
                                                variant="outline"
                                                className="bg-zinc-200/50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1"
                                            >
                                                <Lock className="w-2.5 h-2.5" /> Term Completed
                                            </Badge>
                                        ) : null}
                                    </div>

                                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                                        <FileSpreadsheet className="w-3.5 h-3.5" />
                                        <span>{conf.subject?.name}</span>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3 pl-6">
                                    <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800/80 pt-2.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Academic Term:</span>
                                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                                {conf.term?.name || "General"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Assessments:</span>
                                            <span className="font-mono text-zinc-800 dark:text-zinc-200">
                                                {conf.columns?.length || conf._count?.columns || 0} Columns
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

                                    <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                            canEdit
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : "text-zinc-500"
                                        }`}>
                                            {canEdit ? (
                                                <><CheckCircle2 className="w-3 h-3" /> Edit Allowed</>
                                            ) : (
                                                <><Lock className="w-3 h-3" /> Read-Only</>
                                            )}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs uppercase font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all p-0 h-auto"
                                        >
                                            Open Registry <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-4 rounded-xl mt-8">
                    <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs rounded-lg"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
