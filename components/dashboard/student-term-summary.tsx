"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar } from "lucide-react";

export function StudentTermSummary({ data }: { data: any }) {
    const rawTerms = data?.terms || (data?.term ? [data.term] : []);
    const terms = Array.isArray(rawTerms) ? rawTerms.filter(Boolean) : [];

    if (terms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-200 dark:border-white/5 bg-white/20 dark:bg-zinc-950/20 rounded-3xl mt-4">
                <Calendar className="w-8 h-8 text-zinc-600 mb-4" />
                <h3 className="text-zinc-700 dark:text-zinc-300 font-medium">No Academic Terms Found</h3>
                <p className="text-xs text-zinc-500 mt-2">The institution has not configured academic terms yet or no term records are active.</p>
            </div>
        );
    }

    const allGrades = Array.isArray(data?.grades) ? data.grades : [];
    const allRemarks = Array.isArray(data?.remarks) ? data.remarks : [];

    // Helper to calculate term metrics
    const getTermMetrics = (termId: string) => {
        const termGrades = allGrades.filter((g: any) => g.exam?.termId === termId || g.termId === termId);
        const gradesToUse = termGrades.length > 0 ? termGrades : allGrades;
        
        const validGrades = gradesToUse.filter((g: any) => g.score != null);
        const avgScore = validGrades.length > 0 
            ? validGrades.reduce((acc: number, g: any) => acc + (typeof g.score === 'number' ? g.score : parseFloat(g.score) || 0), 0) / validGrades.length 
            : null;
            
        const termRemarks = allRemarks.filter((r: any) => r.termId === termId);
        
        return {
            gradesCount: gradesToUse.length,
            avgScore,
            remarksCount: termRemarks.length,
            remarks: termRemarks,
            grades: gradesToUse
        };
    };

    return (
        <div className="space-y-6 mt-4">
            {terms.map((term: any) => {
                const metrics = getTermMetrics(term.id);
                
                return (
                    <Card key={term.id || term.name} className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 shadow-none rounded-[2rem] overflow-hidden">
                        <div className="bg-zinc-100/50 dark:bg-zinc-900/50 px-6 py-4 border-b border-zinc-300 dark:border-zinc-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-eduGreen-500/20 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-eduGreen-500" />
                                </div>
                                <div>
                                    <h3 className="text-zinc-900 dark:text-white font-medium flex items-center gap-2">
                                        {term.name || "Academic Term"}
                                        {term.isActive && (
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-widest text-eduGreen-400 border-eduGreen-400/30 bg-eduGreen-400/10">Active Term</Badge>
                                        )}
                                    </h3>
                                    <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mt-0.5">
                                        {term.startDate || "Start"} — {term.endDate || "End"}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Term Average</p>
                                    <p className="text-xl font-bold text-zinc-900 dark:text-white">
                                        {metrics.avgScore !== null ? `${metrics.avgScore.toFixed(1)}%` : (data?.summary?.overallPercentage ? `${data.summary.overallPercentage}%` : '--')}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <BookOpen className="w-3 h-3" />
                                        Term Assessments
                                    </h4>
                                    
                                    {metrics.grades.length === 0 ? (
                                        <p className="text-xs text-zinc-500 italic">No assessments logged for this term.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {metrics.grades.slice(0, 5).map((grade: any, idx: number) => (
                                                <div key={grade.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-300 dark:border-zinc-800/50">
                                                    <div>
                                                        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{grade.subject?.name || "Subject"}</p>
                                                        <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{grade.exam?.title || grade.remarks || "Assessment"}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{grade.score ?? 0}</p>
                                                        {grade.exam?.maxScore && (
                                                            <p className="text-[9px] text-zinc-600 dark:text-zinc-500">/ {grade.exam.maxScore}</p>
                                                        )}
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
