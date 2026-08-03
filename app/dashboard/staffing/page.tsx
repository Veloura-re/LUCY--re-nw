"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BookOpen, Layers, CheckCircle2, ChevronRight, Loader2, Download, ShieldCheck, Printer } from "lucide-react";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { format } from "date-fns";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { PersonnelPrint } from "@/components/dashboard/personnel-print";
import { getClientCache, setClientCache, fetchWithResilience } from "@/lib/cache-client";
import { CachedSyncBadge } from "@/components/ui/cached-sync-badge";

export default function StaffingPage() {
    const cachedStaffingMeta = typeof window !== 'undefined' ? getClientCache<any>('staffing_base_meta') : null;

    const [activeTab, setActiveTab] = useState<'SUBJECTS' | 'HOMEROOM'>('SUBJECTS');
    const [classes, setClasses] = useState<any[]>(cachedStaffingMeta?.classes || []);
    const [subjects, setSubjects] = useState<any[]>(cachedStaffingMeta?.subjects || []);
    const [teachers, setTeachers] = useState<any[]>(cachedStaffingMeta?.teachers || []);
    const [selectedClassId, setSelectedClassId] = useState<string>(cachedStaffingMeta?.classes?.[0]?.id || "");
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(!cachedStaffingMeta);
    const [isRevalidating, setIsRevalidating] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [periodsState, setPeriodsState] = useState<Record<string, number>>({});

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Staffing_Assignments_${format(new Date(), 'yyyy-MM-dd')}`,
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            const cachedClassAssignments = getClientCache<any>(`staffing_assignments_${selectedClassId}`);
            if (cachedClassAssignments) {
                setAssignments(cachedClassAssignments);
            }
            fetchAssignments(selectedClassId);
        }
    }, [selectedClassId]);

    const fetchInitialData = async () => {
        if (!cachedStaffingMeta) setLoading(true);
        else setIsRevalidating(true);

        try {
            const [cRes, sRes, tRes] = await Promise.allSettled([
                fetchWithResilience('/api/school/classes', {}, 8000),
                fetchWithResilience('/api/school/subjects', {}, 8000),
                fetchWithResilience('/api/school/teachers', {}, 8000)
            ]);

            const cData = cRes.status === 'fulfilled' && cRes.value.ok ? (await cRes.value.json()) as any : { grades: [] };
            const sData = sRes.status === 'fulfilled' && sRes.value.ok ? (await sRes.value.json()) as any : { subjects: [] };
            const tData = tRes.status === 'fulfilled' && tRes.value.ok ? (await tRes.value.json()) as any : { teachers: [] };

            const flattened = (cData.grades || []).flatMap((g: any) =>
                g.classes.map((c: any) => ({ ...c, gradeName: g.name }))
            );

            setClasses(flattened);
            setSubjects(sData.subjects || []);
            setTeachers(tData.teachers || []);

            if (flattened.length > 0 && !selectedClassId) {
                setSelectedClassId(flattened[0].id);
            }

            setClientCache('staffing_base_meta', {
                classes: flattened,
                subjects: sData.subjects || [],
                teachers: tData.teachers || []
            }, 15 * 60 * 1000);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setIsRevalidating(false);
        }
    };

    const fetchAssignments = async (classId: string) => {
        try {
            const res = await fetchWithResilience(`/api/school/staffing?classId=${classId}`, {}, 8000);
            if (res.ok) {
                const data = (await res.json()) as any;
                setAssignments(data.assignments || []);
                setClientCache(`staffing_assignments_${classId}`, data.assignments || [], 10 * 60 * 1000);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleAssign = async (subjectId: string, teacherId: string, overridePeriods?: number) => {
        setSaving(subjectId);
        const periodsPerWeek = overridePeriods ?? periodsState[subjectId] ?? 5;
        try {
            const res = await fetch('/api/school/staffing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: selectedClassId,
                    subjectId,
                    teacherId,
                    periodsPerWeek
                })
            });

            if (res.ok) {
                fetchAssignments(selectedClassId);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(null);
        }
    };

    const handleAssignHomeroom = async (classId: string, homeroomTeacherId: string | null) => {
        setSaving("homeroom-" + classId);
        try {
            const res = await fetch('/api/school/classes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId, homeroomTeacherId })
            });

            if (res.ok) {
                // Refresh data to reflect role changes and new assignments
                await fetchInitialData();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(null);
        }
    };


    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <SpringingLoader message="Orchestrating Faculty Allocations" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div className="space-y-4">
                    <h1 className="text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Faculty <span className="text-eduGreen-500 italic">Mapping</span>
                    </h1>

                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-900 w-fit">
                        <button
                            onClick={() => setActiveTab('SUBJECTS')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-medium uppercase tracking-widest transition-all ${activeTab === 'SUBJECTS' ? 'bg-eduGreen-600 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            Subject Assignments
                        </button>
                        <button
                            onClick={() => setActiveTab('HOMEROOM')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-medium uppercase tracking-widest transition-all ${activeTab === 'HOMEROOM' ? 'bg-eduGreen-600 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            Homeroom Authority
                        </button>
                    </div>
                </div>

                <div className="hidden md:block">
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-[10px] mb-1">Institutional Resource Allocation</p>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-eduGreen-500" />
                        <span className="text-[9px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Final Authorization required</span>
                    </div>
                </div>
            </div>

            {activeTab === 'SUBJECTS' ? (
                <div className="grid lg:grid-cols-1 gap-12 items-start animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="space-y-6">
                        <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem]  border-t-zinc-800/20 shadow-2xl">
                            <CardHeader className="p-8 border-b border-zinc-200 dark:border-zinc-900/50">
                                <CardTitle className="text-lg font-medium text-zinc-900 dark:text-white tracking-tight uppercase tracking-[0.2em] text-[10px]">Active Cohorts</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 flex flex-wrap gap-3">
                                {classes.map((cls) => (
                                    <button
                                        key={cls.id}
                                        onClick={() => setSelectedClassId(cls.id)}
                                        className={`px-6 py-4 rounded-2xl flex items-center gap-4 transition-all group border ${selectedClassId === cls.id
                                            ? 'bg-eduGreen-600 border-eduGreen-500 text-zinc-900 dark:text-white shadow-xl shadow-eduGreen-900/20'
                                            : 'bg-zinc-100/40 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-900 hover:text-zinc-300 border-zinc-200 dark:border-zinc-900/50'
                                            }`}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className={`text-[8px] font-medium uppercase tracking-widest ${selectedClassId === cls.id ? 'text-eduGreen-200' : 'text-zinc-700'}`}>
                                                {cls.gradeName}
                                            </span>
                                            <span className="font-medium text-base tracking-tight">{cls.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-8">
                        <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem]  border-t-zinc-800/20 shadow-2xl relative z-20">
                            <CardHeader className="p-10 border-b border-zinc-200 dark:border-zinc-900/80">
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-eduGreen-950/20 rounded-2xl border border-eduGreen-900/30">
                                            <Layers className="w-5 h-5 text-eduGreen-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight">Discipline System</CardTitle>
                                            <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Assignments for {classes.find(c => c.id === selectedClassId)?.name}</CardDescription>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handlePrint()}
                                        variant="outline"
                                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white border-eduGreen-500 rounded-xl h-10 px-4 text-[10px] font-medium uppercase tracking-widest transition-all shadow-lg shadow-eduGreen-900/20"
                                    >
                                        <Printer className="mr-2 h-3.5 w-3.5" />
                                        Print System
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 mb-10">
                                <div className="divide-y divide-zinc-950">
                                    {subjects.map((subject) => {
                                        const assignment = assignments.find(a => a.subjectId === subject.id);
                                        return (
                                            <div key={subject.id} className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-eduGreen-900/5 transition-all group/row">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 flex items-center justify-center group-hover/row:border-eduGreen-900/30 transition-all shadow-2xl relative overflow-hidden">
                                                        <BookOpen className="w-6 h-6 text-zinc-800 dark:text-zinc-200 group-hover/row:text-eduGreen-500" />
                                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-eduGreen-500/20" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-xl text-zinc-900 dark:text-white dark:text-zinc-100 group-hover/row:text-zinc-900 dark:text-white transition-colors tracking-tight">{subject.name}</h4>
                                                        <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest mt-1">Core Discipline</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                                    {assignment && (
                                                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-eduGreen-950/20 border border-eduGreen-900/20 animate-in fade-in zoom-in-95">
                                                            <CheckCircle2 className="w-4 h-4 text-eduGreen-500" />
                                                            <span className="text-[10px] font-medium text-zinc-900 dark:text-white uppercase tracking-widest">Synchronized</span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24">
                                                            <input 
                                                                type="number" 
                                                                min="1" 
                                                                max="20"
                                                                placeholder="Periods"
                                                                value={periodsState[subject.id] ?? assignment?.periodsPerWeek ?? 5}
                                                                onChange={(e) => setPeriodsState(prev => ({ ...prev, [subject.id]: parseInt(e.target.value) || 5 }))}
                                                                onBlur={(e) => {
                                                                    if (assignment?.teacherId) {
                                                                        handleAssign(subject.id, assignment.teacherId, parseInt(e.target.value) || 5);
                                                                    }
                                                                }}
                                                                className="h-14 w-full bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-2 border-zinc-200 dark:border-zinc-900 rounded-xl text-center text-zinc-900 dark:text-white font-medium text-sm focus:border-eduGreen-500/50 outline-none"
                                                                title="Periods per Week"
                                                            />
                                                        </div>
                                                        <div className="w-full sm:w-64">
                                                            <Select
                                                                defaultValue={assignment?.teacherId}
                                                                onValueChange={(val: string) => handleAssign(subject.id, val)}
                                                                disabled={saving === subject.id}
                                                            >
                                                                <SelectTrigger className="h-14 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-2 border-zinc-200 dark:border-zinc-900 rounded-xl text-zinc-900 dark:text-white font-medium hover:border-eduGreen-900/30 transition-all">
                                                                    {saving === subject.id ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <Loader2 className="w-4 h-4 animate-spin text-eduGreen-500" />
                                                                            <span className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500">Mapping...</span>
                                                                        </div>
                                                                    ) : (
                                                                        <SelectValue placeholder="Select Instructor" />
                                                                    )}
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-900 dark:text-white">
                                                                    {teachers.map((teacher: any) => (
                                                                        <SelectItem key={teacher.id} value={teacher.id} className="focus:bg-eduGreen-900/20 focus:text-eduGreen-400 font-medium text-[10px] uppercase">
                                                                            {teacher.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {subjects.length === 0 && (
                                        <div className="p-20 text-center flex flex-col items-center gap-4 opacity-40">
                                            <BookOpen className="w-12 h-12 text-zinc-700" />
                                            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-700 leading-relaxed max-w-[200px]">
                                                No disciplines registered in current institution.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem]  border-t-zinc-800/20 shadow-2xl">
                        <CardHeader className="p-10 border-b border-zinc-200 dark:border-zinc-900/80">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-eduGreen-950/20 rounded-2xl border border-eduGreen-900/30">
                                    <Users className="w-5 h-5 text-eduGreen-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight">Homeroom Authority</CardTitle>
                                    <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Institutional presence management by cohort</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-zinc-950">
                                {classes.map((cls) => (
                                    <div key={cls.id} className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-eduGreen-900/5 transition-all group/row">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 flex items-center justify-center font-medium text-zinc-600 text-xl group-hover/row:border-eduGreen-900/30 transition-all shadow-2xl relative overflow-hidden">
                                                {cls.name}
                                                <div className="absolute inset-x-0 bottom-0 h-1 bg-eduGreen-500/20" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-xl text-zinc-900 dark:text-white dark:text-zinc-100 group-hover/row:text-zinc-900 dark:text-white transition-colors tracking-tight">{cls.gradeName} &bull; {cls.name}</h4>
                                                <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest mt-1">{cls._count.students} Active Learners</p>
                                            </div>
                                        </div>

                                        <div className="w-full md:w-80">
                                            <Select
                                                defaultValue={cls.homeroomTeacherId}
                                                onValueChange={(val: string) => handleAssignHomeroom(cls.id, val === "null" ? null : val)}
                                                disabled={saving === ("homeroom-" + cls.id)}
                                            >
                                                <SelectTrigger className="h-14 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-2 border-zinc-200 dark:border-zinc-900 rounded-xl text-zinc-900 dark:text-white font-medium hover:border-eduGreen-900/30 transition-all">
                                                    {saving === ("homeroom-" + cls.id) ? (
                                                        <div className="flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin text-eduGreen-500" />
                                                            <span className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500">Updating Access...</span>
                                                        </div>
                                                    ) : (
                                                        <SelectValue placeholder="Unassigned" />
                                                    )}
                                                </SelectTrigger>
                                                <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-900 dark:text-white">
                                                    {teachers.map((teacher: any) => (
                                                        <SelectItem key={teacher.id} value={teacher.id} className="focus:bg-eduGreen-900/20 focus:text-eduGreen-400 font-medium text-[10px] uppercase">
                                                            {teacher.name}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="null" className="focus:bg-red-900/20 focus:text-red-600 dark:text-red-400 font-medium text-[10px] uppercase">Revoke Authority</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            {/* Hidden Print Template */}
            <div className="sr-only" aria-hidden="true">
                <PersonnelPrint
                    ref={printRef}
                    data={subjects.map(subject => {
                        const assignment = assignments.find(a => a.subjectId === subject.id);
                        const teacher = teachers.find(t => t.id === assignment?.teacherId);
                        return {
                            id: subject.id,
                            teacher: { firstName: teacher?.name || 'Unassigned', lastName: '' },
                            subject: { name: subject.name },
                            class: { name: classes.find(c => c.id === selectedClassId)?.name || 'N/A' }
                        };
                    })}
                    title={`Staffing System: ${classes.find(c => c.id === selectedClassId)?.name}`}
                    type="STAFFING"
                />
            </div>
        </div>
    );
}

