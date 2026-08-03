"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, BookOpen, Layers, ChevronRight, ChevronDown, Trash2, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { ConfirmationModal, AlertModal } from "@/components/ui/confirmation-modal";
import { cn } from "@/lib/utils";

interface ClassesClientWrapperProps {
    initialGrades: any[];
    initialSubjects: any[];
    initialTeachers: any[];
}

export default function ClassesClientWrapper({ initialGrades, initialSubjects, initialTeachers }: ClassesClientWrapperProps) {
    const [grades, setGrades] = useState<any[]>(initialGrades || []);
    const [subjects, setSubjects] = useState<any[]>(initialSubjects || []);
    const [allTeachers] = useState<any[]>(initialTeachers || []);

    const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
    const [isAddingGrade, setIsAddingGrade] = useState(false);
    const [isAddingClass, setIsAddingClass] = useState<string | null>(null); // gradeId
    const [isAddingSubject, setIsAddingSubject] = useState(false);

    // Form States
    const [newGradeName, setNewGradeName] = useState("");
    const [newGradeLevel, setNewGradeLevel] = useState("");
    const [newClassName, setNewClassName] = useState("");
    const [newSubjectName, setNewSubjectName] = useState("");
    const [loading, setLoading] = useState(false);

    // Modal State
    const [deleteConfig, setDeleteConfig] = useState<{ id: string, type: 'CLASS' | 'SUBJECT' | 'GRADE' | null }>({ id: "", type: null });
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean }>({ title: "", message: "", isOpen: false });

    const handleAssignHomeroom = async (classId: string, homeroomTeacherId: string | null) => {
        setLoading(true);
        try {
            const res = await fetch('/api/school/classes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId, homeroomTeacherId })
            });

            if (res.ok) {
                // Optimistic UI update
                setGrades(prev => prev.map(g => ({
                    ...g,
                    classes: g.classes.map((c: any) => 
                        c.id === classId 
                        ? { ...c, homeroomTeacherId, homeroomTeacher: allTeachers.find(t => t.id === homeroomTeacherId) } 
                        : c
                    )
                })));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/school/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'GRADE', name: newGradeName, level: newGradeLevel })
            });
            if (res.ok) {
                const data = await res.json() as any;
                setGrades(prev => [...prev, { ...data.grade, classes: [] }].sort((a, b) => a.level - b.level));
                setIsAddingGrade(false);
                setNewGradeName("");
                setNewGradeLevel("");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClass = async (e: React.FormEvent, gradeId: string) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/school/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'CLASS', gradeId, name: newClassName })
            });
            if (res.ok) {
                const data = await res.json() as any;
                setGrades(prev => prev.map(g => 
                    g.id === gradeId 
                    ? { ...g, classes: [...g.classes, { ...data.cls, _count: { students: 0 } }].sort((a,b) => a.name.localeCompare(b.name)) } 
                    : g
                ));
                setIsAddingClass(null);
                setNewClassName("");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/school/subjects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newSubjectName })
            });
            if (res.ok) {
                const data = await res.json() as any;
                setSubjects(prev => [...prev, data.subject].sort((a,b) => a.name.localeCompare(b.name)));
                setIsAddingSubject(false);
                setNewSubjectName("");
            }
        } finally {
            setLoading(false);
        }
    };

    const executeDelete = async () => {
        setLoading(true);
        try {
            const res = await fetch(deleteConfig.type === 'SUBJECT' ? '/api/school/subjects' : '/api/school/classes', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: deleteConfig.id, type: deleteConfig.type })
            });

            if (res.ok) {
                if (deleteConfig.type === 'CLASS') {
                    setGrades(prev => prev.map(g => ({
                        ...g,
                        classes: g.classes.filter((c: any) => c.id !== deleteConfig.id)
                    })));
                } else if (deleteConfig.type === 'GRADE') {
                    setGrades(prev => prev.filter(g => g.id !== deleteConfig.id));
                    setExpandedGrade(null);
                } else if (deleteConfig.type === 'SUBJECT') {
                    setSubjects(prev => prev.filter(s => s.id !== deleteConfig.id));
                }
            } else {
                setAlertConfig({ title: "Operation Failed", message: "Institutional access prevented decommissioning of linked record.", isOpen: true });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDeleteConfig({ id: "", type: null });
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-3.5 sm:space-y-8 md:space-y-12 animate-in fade-in duration-500 relative z-10 pb-12 sm:pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-3 sm:pb-10">
                <div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Academic <span className="text-eduGreen-500 italic">Architecture</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[8px] sm:text-xs mt-1 sm:mt-3">Institutional Cohorts & Curriculum Registry</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-1 gap-3 sm:gap-6 md:gap-12 items-start">
                <div className="space-y-3 sm:space-y-8">
                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-2xl md:rounded-[2.5rem] border-t-zinc-800/20 shadow-xl overflow-hidden">
                        <CardHeader className="p-3.5 sm:p-6 md:p-10 border-b border-zinc-200 dark:border-zinc-900/80 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2.5 sm:gap-4">
                                <div className="p-2 sm:p-3 bg-eduGreen-950/20 rounded-lg sm:rounded-2xl border border-eduGreen-900/30">
                                    <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-eduGreen-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-base sm:text-xl md:text-2xl font-medium text-zinc-900 dark:text-white tracking-tight">Grade Levels</CardTitle>
                                    <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[7px] sm:text-[9px] mt-0.5 sm:mt-1">Hierarchical academic structure</CardDescription>
                                </div>
                            </div>
                            <Button
                                onClick={() => setIsAddingGrade(true)}
                                className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-8 sm:h-12 px-3 sm:px-6 rounded-lg sm:rounded-xl font-medium text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-md shadow-eduGreen-900/20 active:scale-95 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> New Grade
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isAddingGrade && (
                                <div className="p-3.5 sm:p-6 md:p-10 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-900 animate-in slide-in-from-top-4 duration-300">
                                    {loading ? (
                                        <div className="py-4 flex justify-center items-center scale-75">
                                            <SpringingLoader message="Deploying Academic Layer" />
                                        </div>
                                    ) : (
                                        <form onSubmit={handleCreateGrade} className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-end max-w-2xl">
                                            <div className="flex-1 space-y-1.5 sm:space-y-3 w-full">
                                                <label className="text-[8px] sm:text-[10px] font-medium text-zinc-700 uppercase tracking-[0.15em] sm:tracking-[0.3em] ml-1 sm:ml-2">Display Name</label>
                                                <Input
                                                    placeholder="e.g. Senior Year"
                                                    value={newGradeName}
                                                    onChange={e => setNewGradeName(e.target.value)}
                                                    required
                                                    className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-9 sm:h-14 rounded-lg sm:rounded-2xl focus:border-eduGreen-600 transition-all border-2 text-[10px] sm:text-xs"
                                                />
                                            </div>
                                            <div className="w-full sm:w-28 space-y-1.5 sm:space-y-3">
                                                <label className="text-[8px] sm:text-[10px] font-medium text-zinc-700 uppercase tracking-[0.15em] sm:tracking-[0.3em] ml-1 sm:ml-2">Numeric</label>
                                                <Input
                                                    placeholder="Level"
                                                    type="number"
                                                    value={newGradeLevel}
                                                    onChange={e => setNewGradeLevel(e.target.value)}
                                                    required
                                                    className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-9 sm:h-14 rounded-lg sm:rounded-2xl focus:border-eduGreen-600 transition-all border-2 text-center font-mono no-spinner text-[10px] sm:text-xs"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                                <Button type="submit" isLoading={loading} className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black h-9 sm:h-14 px-4 sm:px-8 rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-[10px] uppercase tracking-widest flex-1 sm:flex-initial">Deploy</Button>
                                                <Button variant="ghost" type="button" onClick={() => setIsAddingGrade(false)} className="text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 font-medium uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[8px] sm:text-[10px] h-9 sm:h-14 flex-1 sm:flex-initial">Discard</Button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                            <div className="divide-y divide-zinc-200 dark:divide-zinc-900">
                                {grades?.map((grade) => (
                                    <div key={grade.id} className="group transition-all">
                                        <div
                                            className={`p-3.5 sm:p-6 md:p-10 flex items-center justify-between cursor-pointer hover:bg-eduGreen-900/5 transition-all ${expandedGrade === grade.id ? 'bg-eduGreen-900/5' : ''}`}
                                            onClick={() => setExpandedGrade(expandedGrade === grade.id ? null : grade.id)}
                                        >
                                            <div className="flex items-center gap-3 sm:gap-8">
                                                <div className={`w-9 h-9 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl flex items-center justify-center font-medium text-sm sm:text-lg transition-all border-2 shrink-0 ${expandedGrade === grade.id ? 'bg-eduGreen-950/40 border-eduGreen-500/50 text-eduGreen-400' : 'bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-600 group-hover:border-zinc-700'}`}>
                                                    {grade.level}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-sm sm:text-xl text-zinc-900 dark:text-white group-hover:text-eduGreen-600 dark:group-hover:text-eduGreen-400 transition-colors tracking-tight">{grade.name}</h4>
                                                    <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1">
                                                        <p className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Academic Tier</p>
                                                        <div className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                                                        <span className="text-[7px] sm:text-[9px] font-medium text-eduGreen-700 uppercase tracking-tighter">{grade.classes?.length || 0} Class Nodes</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 sm:gap-3">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl text-zinc-800 dark:text-zinc-200 hover:text-red-600 dark:text-red-500 hover:bg-red-50 dark:bg-red-950/20 border border-transparent hover:border-red-200 dark:border-red-900/30 transition-all opacity-0 group-hover:opacity-100"
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfig({ id: grade.id, type: 'GRADE' }); }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                </Button>
                                                <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all ${expandedGrade === grade.id ? 'bg-eduGreen-950/20 border-eduGreen-900/30 text-eduGreen-500 rotate-180' : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-600'}`}>
                                                    <ChevronDown className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                                                </div>
                                            </div>
                                        </div>

                                        {expandedGrade === grade.id && (
                                            <div className="bg-white/80 dark:bg-zinc-950/80 p-3.5 sm:p-6 md:p-10 pt-1.5 sm:pt-2 border-t border-zinc-200 dark:border-zinc-900 animate-in slide-in-from-top-4 duration-300">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
                                                    {grade.classes?.map((cls: any) => (
                                                        <div key={cls.id} className="p-3 sm:p-6 bg-zinc-100 dark:bg-zinc-900 rounded-xl sm:rounded-[1.5rem] border border-zinc-300 dark:border-zinc-800 flex items-center justify-between group/cls hover:border-eduGreen-500/30 hover:bg-eduGreen-900/5 transition-all relative overflow-hidden">
                                                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/cls:opacity-100 transition-opacity" />
                                                            <div className="relative z-10 flex-1">
                                                                <span className="font-medium text-xs sm:text-base text-zinc-900 dark:text-white dark:text-zinc-100 group-hover/cls:text-zinc-900 dark:text-white transition-colors tracking-tight block">{cls.name}</span>
                                                                  <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-1.5">
                                                                      <span className="text-[7px] sm:text-[9px] font-medium text-zinc-600 uppercase tracking-widest block">{cls._count?.students || 0} Students</span>
                                                                      <div className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                                                                      <div className="flex items-center gap-1 sm:gap-1.5">
                                                                          <span className={cn(
                                                                              "text-[7px] sm:text-[9px] font-bold uppercase tracking-widest",
                                                                              cls._count?.assignments > 0 ? "text-eduGreen-500" : "text-zinc-700"
                                                                          )}>
                                                                              {cls._count?.assignments || 0} Tasks
                                                                          </span>
                                                                          {cls._count?.assignments > 0 && (
                                                                              <div className="flex gap-0.5">
                                                                                  <div className="w-1 h-1 rounded-full bg-eduGreen-500 animate-pulse" />
                                                                                  <div className="w-1 h-1 rounded-full bg-eduGreen-500/50" />
                                                                              </div>
                                                                          )}
                                                                      </div>
                                                                      {cls.homeroomTeacher && (
                                                                          <>
                                                                              <div className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                                                                              <span className="text-[7px] sm:text-[9px] font-medium text-sky-500 uppercase tracking-widest block truncate max-w-[80px] sm:max-w-none">
                                                                                  {cls.homeroomTeacher.name}
                                                                              </span>
                                                                          </>
                                                                      )}
                                                                  </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 sm:gap-2 relative z-10">
                                                                <Select
                                                                    onValueChange={(teacherId: string) => handleAssignHomeroom(cls.id, teacherId === "null" ? null : teacherId)}
                                                                    defaultValue={cls.homeroomTeacherId || "null"}
                                                                >
                                                                    <SelectTrigger className="w-24 sm:w-32 h-7 sm:h-9 rounded-md sm:rounded-lg bg-zinc-200 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-[8px] sm:text-[9px] font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all">
                                                                        <SelectValue placeholder="Staff" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                                                                        {allTeachers?.map((t: any) => (
                                                                            <SelectItem key={t.id} value={t.id} className="focus:bg-eduGreen-900/20 focus:text-eduGreen-400 font-medium text-[9px] sm:text-[10px] uppercase">
                                                                                {t.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                        <SelectItem value="null" className="focus:bg-red-900/20 focus:text-red-600 dark:text-red-400 font-medium text-[9px] sm:text-[10px] uppercase">No Staff</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 sm:h-10 sm:w-10 rounded-md sm:rounded-xl text-zinc-800 dark:text-zinc-200 hover:text-red-600 dark:text-red-500 hover:bg-red-50 dark:bg-red-950/20 hover:border-red-200 dark:border-red-900/30 border border-transparent transition-all"
                                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfig({ id: cls.id, type: 'CLASS' }); }}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {isAddingClass === grade.id ? (
                                                        <form onSubmit={(e) => handleCreateClass(e, grade.id)} className="col-span-1 flex gap-1.5 sm:gap-2 animate-in fade-in duration-300">
                                                            <Input
                                                                autoFocus
                                                                placeholder="e.g. 10A"
                                                                value={newClassName}
                                                                onChange={e => setNewClassName(e.target.value)}
                                                                className="h-9 sm:h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 border-2 text-zinc-900 dark:text-white focus:border-eduGreen-600 rounded-lg sm:rounded-2xl font-medium px-3 sm:px-6 text-[10px] sm:text-xs"
                                                            />
                                                            <Button size="icon" type="submit" isLoading={loading} className="h-9 w-9 sm:h-14 sm:w-14 bg-eduGreen-600 text-white dark:bg-white dark:text-black rounded-lg sm:rounded-2xl shrink-0 active:scale-95 transition-all hover:bg-eduGreen-500 dark:hover:bg-zinc-200">
                                                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </Button>
                                                        </form>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            className="h-full min-h-[3.5rem] sm:min-h-[5.5rem] rounded-xl sm:rounded-[1.5rem] border-dashed border-2 border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-900/50 hover:bg-eduGreen-900/5 text-zinc-700 hover:text-eduGreen-500 flex flex-col gap-1 sm:gap-2 transition-all group/add p-2 sm:p-4"
                                                            onClick={() => setIsAddingClass(grade.id)}
                                                        >
                                                            <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover/add:scale-110 transition-transform" />
                                                            <span className="text-[8px] sm:text-[9px] font-medium uppercase tracking-[0.1em] sm:tracking-[0.2em]">Deploy Class</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(!grades || grades.length === 0) && !isAddingGrade && (
                                    <div className="p-10 sm:p-20 text-center flex flex-col items-center gap-3 sm:gap-4">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 flex items-center justify-center opacity-20">
                                            <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-900 dark:text-white" />
                                        </div>
                                        <p className="text-zinc-700 font-medium uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[9px] sm:text-[10px]">No academic layers configured</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-3 sm:space-y-8">
                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-2xl md:rounded-[2.5rem] border-t-zinc-800/20 shadow-xl overflow-hidden">
                        <CardHeader className="p-3.5 sm:p-6 md:p-8 border-b border-zinc-200 dark:border-zinc-900/80">
                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                <div className="flex items-center gap-2.5 sm:gap-3">
                                    <div className="p-2 sm:p-2.5 bg-sky-100 dark:bg-sky-950/20 rounded-lg sm:rounded-xl border border-sky-300 dark:border-sky-900/30">
                                        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500" />
                                    </div>
                                    <CardTitle className="text-sm sm:text-lg font-medium text-zinc-900 dark:text-white tracking-tight">Core Disciplines</CardTitle>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setIsAddingSubject(true)}
                                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-900 text-zinc-600 hover:text-sky-500 hover:border-sky-900/30 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </Button>
                            </div>
                            <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[8px] sm:text-[9px]">Academic Subject Registry</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isAddingSubject && (
                                <div className="p-3.5 sm:p-6 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-900 animate-in slide-in-from-top-4 duration-300">
                                    {loading ? (
                                        <div className="py-2 flex justify-center items-center scale-75">
                                            <SpringingLoader message="Deploying Academic Subject" />
                                        </div>
                                    ) : (
                                        <form onSubmit={handleCreateSubject} className="flex gap-2">
                                            <Input
                                                autoFocus
                                                placeholder="e.g. Mathematics"
                                                value={newSubjectName}
                                                onChange={e => setNewSubjectName(e.target.value)}
                                                className="h-9 sm:h-12 bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 border-2 text-zinc-900 dark:text-white focus:border-sky-600 rounded-lg sm:rounded-xl font-medium px-3 sm:px-4 text-[10px] sm:text-xs"
                                            />
                                            <Button size="icon" type="submit" className="h-9 w-9 sm:h-12 sm:w-12 bg-sky-600 hover:bg-sky-500 text-white rounded-lg sm:rounded-xl shrink-0 active:scale-95 transition-all shadow-md shadow-sky-900/20">
                                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </Button>
                                        </form>
                                    )}
                                </div>
                            )}
                            <div className="divide-y divide-zinc-200 dark:divide-zinc-900/80 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {subjects?.map((sub) => (
                                    <div key={sub.id} className="p-3 sm:p-5 flex items-center justify-between hover:bg-sky-900/5 transition-all group">
                                        <div className="flex items-center gap-2.5 sm:gap-4">
                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-sky-500 group-hover:shadow-[0_0_8px_rgba(14,165,233,0.5)] transition-all" />
                                            <span className="font-medium text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors tracking-tight">{sub.name}</span>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 sm:h-9 sm:w-9 rounded-md sm:rounded-lg text-zinc-800 dark:text-zinc-200 hover:text-red-600 dark:text-red-500 hover:bg-red-50 dark:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={() => setDeleteConfig({ id: sub.id, type: 'SUBJECT' })}
                                        >
                                            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                {(!subjects || subjects.length === 0) && !isAddingSubject && (
                                    <div className="p-8 sm:p-16 text-center flex flex-col items-center gap-3 sm:gap-4 opacity-40">
                                        <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-600 dark:text-zinc-400" />
                                        <p className="text-zinc-600 font-medium uppercase tracking-widest text-[8px] sm:text-[9px]">No subjects registered</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ConfirmationModal
                isOpen={deleteConfig.type !== null}
                onClose={() => setDeleteConfig({ id: "", type: null })}
                onConfirm={executeDelete}
                isLoading={loading}
                title={
                    deleteConfig.type === 'GRADE' ? "Delete Academic Year / Grade" :
                        deleteConfig.type === 'CLASS' ? "Decommission Cohort" : "Expunge Discipline"
                }
                description={
                    deleteConfig.type === 'GRADE'
                        ? "This will permanently delete this academic year along with all its classes. Students linked to this year will have their class association removed."
                        : deleteConfig.type === 'CLASS'
                            ? "Are you sure you want to decommission this class? All associated student assignments will be archived."
                            : "Executing this action will remove the subject from the institutional registry."
                }
                confirmText="Delete"
                variant="danger"
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                variant="error"
            />
        </div>
    );
}
