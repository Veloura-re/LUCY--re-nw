"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    BookOpen, 
    Activity, 
    Users, 
    CheckCircle2, 
    Clock, 
    Map as MapIcon, 
    ChevronRight, 
    BarChart3, 
    Filter, 
    Sparkles, 
    Brain, 
    Loader2, 
    AlertCircle, 
    CheckCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DirectorAssignmentHubProps {
    analytics: {
        totalAssignments: number;
        totalSubmissions: number;
        subjectActivity: Array<{ name: string; count: number }>;
        statusBreakdown: {
            GRADED: number;
            SUBMITTED: number;
            LATE: number;
        };
        recentCount: number;
    };
    oversight: any[];
}

export function DirectorAssignmentHub({ analytics, oversight }: DirectorAssignmentHubProps) {
    const [insight, setInsight] = useState<any>(null);
    const [loadingInsight, setLoadingInsight] = useState(false);

    const completionIndex = Math.round((analytics.statusBreakdown.GRADED + analytics.statusBreakdown.SUBMITTED) / (analytics.totalSubmissions || 1) * 100);
    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <Card className="bg-zinc-950/20 border-zinc-900 rounded-3xl p-8 hover:border-eduGreen-900/30 transition-all border-t-zinc-800/20">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-700 mb-2">Institutional Volume</p>
                    <p className="text-4xl font-medium text-white tracking-tighter">{analytics.totalAssignments}</p>
                    <p className="text-[9px] font-medium text-zinc-800 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-eduGreen-500" />
                        Active Tasks Dispatched
                    </p>
                </Card>

                <Card className="bg-zinc-950/20 border-zinc-900 rounded-3xl p-8 hover:border-eduGreen-900/30 transition-all border-t-zinc-800/20">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-700 mb-2">Submissions Pulse</p>
                    <p className="text-4xl font-medium text-white tracking-tighter">{analytics.totalSubmissions}</p>
                    <p className="text-[9px] font-medium text-zinc-800 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-500" />
                        Total Knowledge Units Received
                    </p>
                </Card>

                <Card className="bg-zinc-950/20 border-zinc-900 rounded-3xl p-8 hover:border-eduGreen-900/30 transition-all border-t-zinc-800/20">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-700 mb-2">7-Day Flux</p>
                    <p className="text-4xl font-medium text-white tracking-tighter">+{analytics.recentCount}</p>
                    <p className="text-[9px] font-medium text-zinc-800 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-amber-500" />
                        New Tasks Established
                    </p>
                </Card>

                <Card className="bg-zinc-950/20 border-zinc-900 rounded-3xl p-8 hover:border-eduGreen-900/30 transition-all border-t-zinc-800/20">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-700 mb-2">Completion Index</p>
                    <p className="text-4xl font-medium text-white tracking-tighter">
                        {completionIndex}%
                    </p>
                    <p className="text-[9px] font-medium text-zinc-800 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        Institutional Fulfillment
                    </p>
                </Card>
            </div>

            <AnimatePresence>
                {!insight ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-10 bg-eduGreen-950/10 border border-eduGreen-500/10 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-8 group hover:bg-eduGreen-950/20 transition-all cursor-pointer overflow-hidden relative"
                        onClick={async () => {
                            setLoadingInsight(true);
                            try {
                                const res = await fetch('/api/ai/assignments', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        mode: 'institutional-insight',
                                        context: {
                                            totalAssignments: analytics.totalAssignments,
                                            totalSubmissions: analytics.totalSubmissions,
                                            completionIndex,
                                            subjectActivity: analytics.subjectActivity
                                        }
                                    })
                                });
                                const data = await res.json();
                                if (data.insight) setInsight(data.insight);
                            } finally {
                                setLoadingInsight(false);
                            }
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-eduGreen-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center">
                                {loadingInsight ? (
                                    <Loader2 className="w-8 h-8 text-eduGreen-500 animate-spin" />
                                ) : (
                                    <Sparkles className="w-8 h-8 text-eduGreen-500 animate-pulse" />
                                )}
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">Neural Institutional Insight</h3>
                                <p className="text-[10px] font-black text-eduGreen-500/60 uppercase tracking-[0.3em]">Synthesize Global Operational Data</p>
                            </div>
                        </div>
                        <Button className="h-14 px-10 rounded-2xl bg-eduGreen-600 text-white font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all relative z-10">
                            {loadingInsight ? "PROCESSING SYNERGY..." : "INITIALIZE SYNTHESIS"}
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-12 bg-zinc-950/60 backdrop-blur-[50px] border border-white/10 rounded-[4rem] space-y-10 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-eduGreen-500/20 to-transparent" />
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-4">
                                <Brain className="w-8 h-8 text-eduGreen-500" />
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-eduGreen-500 uppercase tracking-widest italic">{insight.status} OPERATIONAL STATUS</span>
                                    <h3 className="text-3xl font-black italic text-white uppercase tracking-tight">Institutional synthesis Report</h3>
                                </div>
                            </div>
                            <Button variant="ghost" onClick={() => setInsight(null)} className="text-zinc-600 hover:text-white uppercase text-[10px] font-black tracking-widest">Clear Buffer</Button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <p className="text-zinc-300 text-lg leading-relaxed font-medium italic">
                                    &ldquo;{insight.insight}&rdquo;
                                </p>
                                <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                                    <Activity className="w-4 h-4 text-zinc-700" />
                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Strategic Overview Synthesis</span>
                                </div>
                            </div>
                            
                            <div className="space-y-8 bg-white/5 p-10 rounded-[3rem] border border-white/5">
                                <div className="space-y-4">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Strategic Recommendations</span>
                                    <div className="space-y-3">
                                        {insight.strategicRecommendations.map((rec: string, i: number) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-eduGreen-500" />
                                                <span className="text-[11px] font-bold text-white uppercase italic">{rec}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4 pt-8 border-t border-white/5">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Friction Analysis</span>
                                    <div className="space-y-3">
                                        {insight.frictionPoints.map((point: string, i: number) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <AlertCircle className="w-3 h-3 text-amber-500" />
                                                    <span className="text-[11px] font-medium text-zinc-400">{point}</span>
                                                </div>
                                                <div className="h-1 w-20 bg-zinc-900 rounded-full overflow-hidden">
                                                    <div className="h-full bg-amber-500/40 w-1/2" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Subject Activity */}
                <Card className="lg:col-span-4 bg-zinc-950/40 backdrop-blur-xl border-zinc-900/50 rounded-3xl overflow-hidden shadow-2xl border-t-zinc-800/20 h-fit">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-base md:text-xl font-medium text-white flex items-center gap-3">
                            <BarChart3 className="w-5 h-5 text-eduGreen-500" />
                            Subject Friction
                        </CardTitle>
                        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.2em] mt-1">Activity Density by Subject</p>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 pt-4 space-y-6">
                        {analytics.subjectActivity.map((subject, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-medium uppercase tracking-widest">
                                    <span className="text-zinc-400">{subject.name}</span>
                                    <span className="text-white">{subject.count} Tasks</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(subject.count / (analytics.subjectActivity[0]?.count || 1)) * 100}%` }}
                                        className="h-full bg-eduGreen-600 rounded-full"
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Detailed Oversight */}
                <Card className="lg:col-span-8 bg-zinc-950/40 backdrop-blur-xl border-zinc-900/50 rounded-[2.5rem] overflow-hidden shadow-2xl border-t-zinc-800/20">
                    <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between border-b border-zinc-900/50">
                        <div>
                            <CardTitle className="text-lg md:text-2xl font-medium text-white tracking-tight flex items-center gap-3">
                                <MapIcon className="w-5 h-5 text-eduGreen-500" />
                                Institutional Task Dashboard
                            </CardTitle>
                            <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.2em] mt-1">Real-time Global Sync</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-white">
                            <Filter className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[10px] font-medium text-zinc-600 uppercase tracking-[0.3em] bg-zinc-900/30">
                                    <tr>
                                        <th className="py-5 px-8">Class & Subject</th>
                                        <th className="py-5 px-8 text-center">Fulfillment</th>
                                        <th className="py-5 px-8">Dispatch Author</th>
                                        <th className="py-5 px-8 text-right">Deadline</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                    {oversight.map((task) => (
                                        <tr key={task.id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="py-6 px-8">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-white group-hover:text-eduGreen-500 transition-colors uppercase italic">{task.title}</span>
                                                    <span className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-1">
                                                        Grade {task.class.name} • {task.subject.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-6 px-8 flex justify-center">
                                                <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold text-white tracking-widest">
                                                    {task._count.submissions} Pkts
                                                </div>
                                            </td>
                                            <td className="py-6 px-8 text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                                                {task.teacher.name}
                                            </td>
                                            <td className="py-6 px-8 text-right">
                                                <div className="text-[11px] font-medium text-zinc-500 group-hover:text-white transition-colors">
                                                    {new Date(task.dueDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
