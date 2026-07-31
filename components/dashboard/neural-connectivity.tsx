"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, UserMinus, UserPlus, Link2Off, Link as LinkIcon, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RestorationModal } from "./restoration-modal";

export function NeuralConnectivity() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchDiagnostics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/school/diagnostics/connectivity');
            const result = await res.json();
            setData(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDiagnostics();
    }, []);

    if (loading) return (
        <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] p-8 animate-pulse">
            <div className="h-6 w-48 bg-zinc-100 dark:bg-zinc-900 rounded-lg mb-4" />
            <div className="space-y-4">
                <div className="h-12 w-full bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
                <div className="h-12 w-full bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
            </div>
        </Card>
    );

    const gapsCount = (data?.orphanedTeachers?.length || 0) +
        (data?.unmappedStudents?.length || 0) +
        (data?.disconnectedParents?.length || 0);

    return (
        <>
            <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] overflow-hidden group shadow-2xl border-t-zinc-800/20">
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between border-b border-zinc-200 dark:border-zinc-900/50">
                    <div>
                        <CardTitle className="text-lg font-medium text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                            <Activity className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                            Neural Connectivity
                        </CardTitle>
                        <p className="text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1 italic">Synchronization Diagnostic Gauge</p>
                    </div>
                    <Button
                        onClick={fetchDiagnostics}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    >
                        <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                </CardHeader>
                <CardContent className="p-8">
                    {gapsCount === 0 ? (
                        <div className="py-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center mx-auto mb-4">
                                <LinkIcon className="w-6 h-6 text-eduGreen-500" />
                            </div>
                            <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest leading-relaxed">All Scholarly Nodes Synchronized<br /><span className="text-eduGreen-500 italic">Institutional Integrity Verified</span></p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {data?.orphanedTeachers?.length > 0 && (
                                <GapItem
                                    label="Orphaned Faculty"
                                    count={data.orphanedTeachers.length}
                                    icon={UserMinus}
                                    color="text-amber-600 dark:text-amber-500"
                                    desc="Teachers without school linkage"
                                />
                            )}
                            {data?.unmappedStudents?.length > 0 && (
                                <GapItem
                                    label="Unmapped Scholars"
                                    count={data.unmappedStudents.length}
                                    icon={Link2Off}
                                    color="text-red-600 dark:text-red-500"
                                    desc="Students missing parent nodes"
                                />
                            )}
                            {data?.disconnectedParents?.length > 0 && (
                                <GapItem
                                    label="Disconnected Parents"
                                    count={data.disconnectedParents.length}
                                    icon={UserPlus}
                                    color="text-orange-500"
                                    desc="Parents without child linkage"
                                />
                            )}

                            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-900/50">
                                <Button 
                                    onClick={() => setIsModalOpen(true)}
                                    className="w-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-800 rounded-xl h-10 px-4 text-[9px] font-medium uppercase tracking-widest transition-all italic"
                                >
                                    Initialize Restoration Protocols
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <RestorationModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                data={data}
                onRefresh={fetchDiagnostics}
            />
        </>
    );
}

function GapItem({ label, count, icon: Icon, color, desc }: { label: string, count: number, icon: any, color: string, desc: string }) {
    return (
        <div className="flex items-center justify-between group/gap">
            <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center transition-colors group-hover/gap:border-zinc-400 dark:border-zinc-700", color)}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <div className="text-[10px] font-medium text-zinc-900 dark:text-white uppercase tracking-widest">{label}</div>
                    <div className="text-[8px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5">{desc}</div>
                </div>
            </div>
            <div className={cn("text-xl font-medium", color)}>{count}</div>
        </div>
    );
}
