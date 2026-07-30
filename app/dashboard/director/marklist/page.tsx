"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Plus, Settings2, GripVertical, Search, Loader2, Download, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import dynamic from "next/dynamic";

const DynamicPrintRegistry = dynamic(
    () => import("@/components/dashboard/director/print-registry").then((mod) => mod.PrintRegistryButton),
    { ssr: false, loading: () => <Button disabled className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-500 h-14 px-8 rounded-2xl"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching Module...</Button> }
);

export default function MarklistManagerPage() {
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async (pageNum = 1) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const res = await fetch(`/api/director/marklists?page=${pageNum}&limit=12`);
            const data = await res.json() as any;
            if (data.configs) {
                if (pageNum === 1) {
                    setConfigs(data.configs);
                } else {
                    setConfigs(prev => [...prev, ...data.configs]);
                }
                setHasMore(data.hasMore);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchConfigs(nextPage);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-300 pb-20 relative z-10">
            {/* Header section */}
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div className="space-y-4">
                    <h1 className="text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Marklist <span className="text-eduGreen-500 italic">Registry</span>
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm mt-1 uppercase tracking-widest max-w-xl">
                        Manage academic configuration parameters & operational logic across the institution.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <DynamicPrintRegistry configs={configs} />
                    <Link href="/dashboard/director/marklist/create" prefetch={false}>
                        <Button className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-2xl h-14 px-8 font-medium text-xs uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-900/20 border border-eduGreen-500/50">
                            <Plus className="w-5 h-5 mr-3" /> Initialize Config
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-[3rem] bg-white/20 dark:bg-zinc-950/20">
                        <Loader2 className="w-10 h-10 animate-spin text-zinc-700 mb-6" />
                        <p className="text-zinc-600 font-medium uppercase tracking-[0.4em] text-[10px]">Retrieving Configurations</p>
                    </div>
                ) : configs.length === 0 ? (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-[3rem] bg-white/20 dark:bg-zinc-950/20">
                        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center opacity-20 mb-8 border border-zinc-300 dark:border-zinc-800">
                            <Settings2 className="w-10 h-10 text-zinc-900 dark:text-white" />
                        </div>
                        <p className="text-zinc-500 font-medium uppercase tracking-[0.4em] text-xs">No Profiles Discovered</p>
                        <p className="text-zinc-700 text-[10px] font-medium uppercase tracking-widest mt-3">Create your first marklist configuration module.</p>
                    </div>
                ) : (
                    configs.map((config) => (
                        <Card key={config.id} className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] border-t-zinc-800/20 shadow-2xl overflow-hidden group hover:border-eduGreen-900/50 transition-all">
                            <CardContent className="p-8 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-300 dark:border-zinc-800 group-hover:border-eduGreen-900/50 group-hover:bg-eduGreen-950/20 transition-all">
                                        <FileSpreadsheet className="w-6 h-6 text-zinc-500 group-hover:text-eduGreen-500 transition-colors" />
                                    </div>
                                    <div className="px-3 py-1 rounded-full border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[9px] font-medium text-zinc-500 uppercase tracking-widest">
                                        Active Profile
                                    </div>
                                </div>

                                <div className="space-y-1 mb-8">
                                    <h3 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-white group-hover:text-eduGreen-400 transition-colors uppercase italic">{config.subject.name}</h3>
                                    <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-widest">{config.class.name}</p>
                                </div>

                                <div className="flex gap-4 mb-8">
                                    <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-900/80">
                                        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest mb-1">Columns</p>
                                        <p className="text-xl font-medium text-zinc-900 dark:text-white">{config._count.columns}</p>
                                    </div>
                                    <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-900/80">
                                        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest mb-1">Entries</p>
                                        <p className="text-xl font-medium text-zinc-900 dark:text-white">{config._count.entries}</p>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-4">
                                    <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest text-center">
                                        Last Sync: {format(new Date(config.updatedAt), 'MMM do, yyyy - HH:mm')}
                                    </p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            onClick={() => router.push(`/dashboard/director/marklist/create?classId=${config.classId}&subjectId=${config.subjectId}`)}
                                            className="w-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl h-12 text-[9px] uppercase font-bold tracking-widest border border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-900 transition-all hover:text-eduGreen-400"
                                        >
                                            <Settings2 className="w-3.5 h-3.5 mr-1" /> Edit
                                        </Button>
                                        <Button
                                            onClick={() => router.push(`/dashboard/marklist/view?configId=${config.id}`)}
                                            className="w-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl h-12 text-[9px] uppercase font-bold tracking-widest border border-zinc-300 dark:border-zinc-800 hover:border-blue-900 transition-all hover:text-blue-400"
                                        >
                                            <GripVertical className="w-3.5 h-3.5 mr-1" /> View
                                        </Button>
                                        <Button
                                            onClick={() => router.push(`/dashboard/marklist/view?configId=${config.id}&autoPrint=true`)}
                                            className="w-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl h-12 text-[9px] uppercase font-bold tracking-widest border border-zinc-300 dark:border-zinc-800 hover:border-rose-900 transition-all hover:text-rose-400"
                                        >
                                            <Download className="w-3.5 h-3.5 mr-1" /> PDF
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {hasMore && (
                <div className="flex justify-center mt-12 animate-in fade-in duration-500">
                    <Button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500 text-zinc-700 dark:text-zinc-300 hover:text-white rounded-full h-16 px-12 font-medium text-xs uppercase tracking-[0.2em] shadow-2xl transition-all disabled:opacity-50"
                    >
                        {loadingMore ? <Loader2 className="w-5 h-5 animate-spin mr-3 text-eduGreen-500" /> : <Plus className="w-5 h-5 mr-3 text-eduGreen-500" />}
                        {loadingMore ? "Transmitting..." : "Load Additional Records"}
                    </Button>
                </div>
            )}
        </div>
    );
}
