"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, CheckCircle2, TrendingUp, Calendar, MessageSquare } from "lucide-react";

export function StudentTermSummary({ data }: { data: any }) {
    if (!data || !data.terms || data.terms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-200 dark:border-white/5 bg-white/20 dark:bg-zinc-950/20 rounded-3xl mt-4">
                <Calendar className="w-8 h-8 text-zinc-700 mb-4" />
                <h3 className="text-zinc-600 dark:text-zinc-400 font-medium">No Academic Terms Found</h3>
                <p className="text-xs text-zinc-600 mt-2">The institution has not configured academic terms yet.</p>
            </div>
        );
    }

    const terms = data.terms;
    
    // Helper to calculate term metrics
    const getTermMetrics = (termId: string) => {
        // 1. Grades in this term
        const termGrades = data.grades.filter((g: any) => g.exam?.termId === termId);
        const avgScore = termGrades.length > 0 
            ? termGrades.reduce((acc: number, g: any) => acc + (g.score || 0), 0) / termGrades.length 
            : null;
            
        // 2. Remarks in this term
        const termRemarks = data.remarks.filter((r: any) => r.termId === termId);
        
        return {
            gradesCount: termGrades.length,
            avgScore,
            remarksCount: termRemarks.length,
            remarks: termRemarks,
            grades: termGrades
        };
    };

    return (
        <div className="space-y-6 mt-4">
            {terms.map((term: any) => {
                const metrics = getTermMetrics(term.id);
                
                return (
                    <Card key={term.id} className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 shadow-none rounded-[2rem] overflow-hidden">
                        <div className="bg-zinc-100/50 dark:bg-zinc-900/50 px-6 py-4 border-b border-zinc-300 dark:border-zinc-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-eduGreen-500/20 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-eduGreen-500" />
                                </div>
                                <div>
                                    <h3 className="text-zinc-900 dark:text-white font-medium flex items-center gap-2">
                                        {term.name}
                                        {term.isActive && (
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-widest text-eduGreen-400 border-eduGreen-400/30 bg-eduGreen-400/10">Active Term</Badge>
                                        )}
                                    </h3>
                                    <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mt-0.5">
                                        {new Date(term.startDate).toLocaleDateString()} — {new Date(term.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Term Average</p>
                                    <p className="text-xl font-bold text-zinc-900 dark:text-white">
                                        {metrics.avgScore !== null ? `${metrics.avgScore.toFixed(1)}%` : '--'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Academic Performance */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <BookOpen className="w-3 h-3" />
                                        Term Assessments
                                    </h4>
                                    
                                    {metrics.grades.length === 0 ? (
                                        <p className="text-xs text-zinc-600 italic">No assessments logged for this term.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {metrics.grades.slice(0, 5).map((grade: any) => (
                                                <div key={grade.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-300 dark:border-zinc-800/50">
                                                    <div>
                                                        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{grade.subject?.name}</p>
                                                        <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{grade.exam?.title}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{grade.score}</p>
                                                        <p className="text-[9px] text-zinc-600 dark:text-zinc-500">/ {grade.exam?.maxScore}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {metrics.grades.length > 5 && (
                                                <p className="text-[10px] text-zinc-600 dark:text-zinc-500 text-center pt-2">+{metrics.grades.length - 5} more assessments</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Term Remarks */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <MessageSquare className="w-3 h-3" />
                                        Institutional Remarks
                                    </h4>
                                    
                                    {metrics.remarks.length === 0 ? (
                                        <p className="text-xs text-zinc-600 italic">No remarks logged for this term.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {metrics.remarks.map((remark: any) => (
                                                <div key={remark.id} className="p-3 rounded-xl bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-300 dark:border-zinc-800/50 space-y-2">
                                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">"{remark.remark}"</p>
                                                    <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500">
                                                        <span>{remark.teacher?.name}</span>
                                                        <span>{new Date(remark.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
