"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
    Clock, Calendar, Users, BookOpen, Plus, Save,
    Trash2, AlertTriangle, CheckCircle2, MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertModal, ConfirmationModal } from "@/components/ui/confirmation-modal";

const DAYS = [
    { label: "Monday", value: "MON" },
    { label: "Tuesday", value: "TUE" },
    { label: "Wednesday", value: "WED" },
    { label: "Thursday", value: "THU" },
    { label: "Friday", value: "FRI" },
    { label: "Saturday", value: "SAT" },
    { label: "Sunday", value: "SUN" }
];

export default function TimetableManagementPage() {
    const [periods, setPeriods] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]); // Staffing assignments
    const [selectedClassId, setSelectedClassId] = useState("");
    const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
    const [showWeekends, setShowWeekends] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [confirmGenerate, setConfirmGenerate] = useState(false);
    const [activeTab, setActiveTab] = useState("builder");
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchTimetable(selectedClassId);
            fetchStaffing(selectedClassId);
        }
    }, [selectedClassId]);

    const fetchStaffing = async (classId: string) => {
        try {
            const res = await fetch(`/api/school/staffing?classId=${classId}`);
            const data = (await res.json()) as any;
            setAssignments(data.assignments || []);
        } catch (e) {
            console.error("Failed to fetch staffing", e);
        }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [pRes, cRes, sRes, tRes] = await Promise.all([
                fetch(`/api/school/periods${selectedClassId ? `?classId=${selectedClassId}` : ''}`),
                fetch('/api/school/classes'),
                fetch('/api/school/subjects'),
                fetch('/api/school/teachers')
            ]);

            const pData = (await pRes.json()) as any;
            const [cData, sData, tData] = (await Promise.all([
                cRes.json(),
                sRes.json(),
                tRes.json()
            ])) as any[];

            setPeriods(pData.periods || []);

            // Extract and flatten classes from grades if nested, otherwise use directly
            let flattenedClasses = [];
            if (cData.grades) {
                flattenedClasses = cData.grades.flatMap((g: any) => g.classes.map((c: any) => ({ ...c, gradeName: g.name })));
            } else {
                flattenedClasses = cData.classes || [];
            }
            setClasses(flattenedClasses);

            setSubjects(sData.subjects || []);
            setTeachers(tData.teachers || []);

            if (flattenedClasses.length > 0) {
                setSelectedClassId(flattenedClasses[0].id);
            }
        } catch (e) {
            console.error("Failed to load initial data", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchTimetable = async (classId: string) => {
        try {
            const [tRes, pRes] = await Promise.all([
                fetch(`/api/school/timetable?classId=${classId}`),
                fetch(`/api/school/periods?classId=${classId}`)
            ]);
            const tData = (await tRes.json()) as any;
            const pData = (await pRes.json()) as any;

            setTimetableEntries(tData.timetable || []);
            // If the class has periods, use them. Otherwise fallback to global or keep existing?
            // User requested: "different periods for every class"
            if (pData.periods && pData.periods.length > 0) {
                setPeriods(pData.periods);
            }
        } catch (e) {
            console.error("Failed to load timetable/periods", e);
        }
    };

    const handleSavePeriods = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/school/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periods,
                    classId: selectedClassId
                })
            });
            if (res.ok) {
                setAlertConfig({
                    title: "Structure Sealed",
                    message: "The institutional day sequence has been successfully synchronized and archived.",
                    isOpen: true,
                    variant: "success"
                });
            }
        } catch (e) {
            setAlertConfig({
                title: "Protocol Fault",
                message: "Failed to synchronize period data with core infrastructure.",
                isOpen: true,
                variant: "error"
            });
        } finally {
            setSaving(false);
        }
    };

    const addPeriod = () => {
        const nextOrder = periods.length + 1;
        setPeriods([...periods, {
            name: `Period ${nextOrder}`,
            startTime: "08:00",
            endTime: "08:45",
            isBreak: false,
            order: nextOrder
        }]);
    };

    const assignSlot = async (periodId: string, day: string, data: { subjectId: string, teacherId: string }) => {
        try {
            const res = await fetch('/api/school/timetable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: selectedClassId,
                    periodId,
                    dayOfWeek: day,
                    subjectId: data.subjectId,
                    teacherId: data.teacherId
                })
            });
            const result = (await res.json()) as any;
            if (res.ok) {
                fetchTimetable(selectedClassId);
            } else {
                setAlertConfig({
                    title: "Conflict Detected",
                    message: result.error || "A spatial-temporal overlap was detected in the faculty schedule.",
                    isOpen: true,
                    variant: "error"
                });
            }
        } catch (e) {
            setAlertConfig({
                title: "Network Fault",
                message: "Communication with the central timetable node was interrupted.",
                isOpen: true,
                variant: "error"
            });
        }
    };

    const removeSlot = async (entryId: string) => {
        try {
            const res = await fetch(`/api/school/timetable?id=${entryId}`, { method: 'DELETE' });
            if (res.ok) fetchTimetable(selectedClassId);
        } catch (e) {
            setAlertConfig({
                title: "Decommission Failed",
                message: "Unable to purge the selected timetable slot from active registry.",
                isOpen: true,
                variant: "error"
            });
        }
    };

    const handleAutoGenerate = async () => {
        setIsGenerating(true);
        setConfirmGenerate(false);
        try {
            const res = await fetch('/api/school/timetable/auto-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    overwrite: true,
                    includeWeekends: showWeekends
                })
            });
            const data = (await res.json()) as any;
            if (res.ok) {
                setAlertConfig({
                    title: "Matrix Generated",
                    message: data.message,
                    isOpen: true,
                    variant: "success"
                });
                fetchTimetable(selectedClassId);
            } else {
                throw new Error(data.error || "Generation failed");
            }
        } catch (e: any) {
            setAlertConfig({
                title: "Generation Failed",
                message: e.message || "Failed to auto-generate the timetable.",
                isOpen: true,
                variant: "error"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) return <div className="p-12 text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-widest animate-pulse">Synchronizing Clockwork...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Academic <span className="text-eduGreen-500 italic">Clockwork</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Institutional Period & Day Structure Authority</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => setConfirmGenerate(true)}
                        isLoading={isGenerating}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl h-12 px-6 text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-eduGreen-900/20"
                    >
                        Auto-Generate Schedule
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="builder" className="space-y-8" onValueChange={setActiveTab}>
                <TabsList className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-900/50 p-1.5 rounded-2xl h-16">
                    <TabsTrigger value="builder" className="rounded-xl px-8 font-medium uppercase tracking-widest text-[10px] data-[state=active]:bg-eduGreen-600 data-[state=active]:text-zinc-900 dark:text-white">Timetable Builder</TabsTrigger>
                    <TabsTrigger value="periods" className="rounded-xl px-8 font-medium uppercase tracking-widest text-[10px] data-[state=active]:bg-eduGreen-600 data-[state=active]:text-zinc-900 dark:text-white">Day Structure</TabsTrigger>
                </TabsList>

                {/* --- Timetable Builder --- */}
                <TabsContent value="builder" className="space-y-8 animate-in slide-in-from-bottom-4">
                    <Card className="p-8 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] relative z-20">
                        <div className="flex flex-col md:flex-row items-end gap-6">
                            <div className="space-y-3 w-72">
                                <label className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600 ml-1">Class Cohort</label>
                                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                    <SelectTrigger className="h-14 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-2 border-zinc-200 dark:border-zinc-900 rounded-xl text-zinc-900 dark:text-white font-medium">
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-900 dark:text-white">
                                        {classes.map((cls) => (
                                            <SelectItem key={cls.id} value={cls.id} className="text-zinc-600 dark:text-zinc-400 focus:text-zinc-900 dark:text-white focus:bg-eduGreen-900/20">
                                                {cls.name} ({cls.gradeName})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1" />
                            <div className="flex flex-col items-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowWeekends(!showWeekends)}
                                    className={cn(
                                        "rounded-xl border-zinc-200 dark:border-zinc-900 text-[10px] font-medium uppercase tracking-widest px-4 h-10",
                                        showWeekends ? "bg-eduGreen-950/20 text-eduGreen-500 border-eduGreen-900/40" : "bg-white dark:bg-zinc-950"
                                    )}
                                >
                                    {showWeekends ? "Hide Weekends" : "Include Weekends"}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Weekly Grid */}
                    <div className="overflow-x-auto rounded-[2.5rem] border border-zinc-200 dark:border-zinc-900 shadow-2xl">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-900">
                                    <th className="p-6 text-left text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600 w-48 border-r border-zinc-200 dark:border-zinc-900">Period Slot</th>
                                    {DAYS.filter(d => showWeekends || !["SAT", "SUN"].includes(d.value)).map(day => (
                                        <th key={day.value} className="p-6 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-500">{day.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {periods.map(period => (
                                    <tr key={period.id} className="group/row hover:bg-zinc-200 dark:hover:bg-zinc-900/10 transition-colors">
                                        <td className="p-6 border-r border-zinc-200 dark:border-zinc-900 bg-white/20 dark:bg-zinc-950/20">
                                            <div className="font-medium text-zinc-900 dark:text-white text-lg tracking-tight leading-none mb-1">{period.name}</div>
                                            <div className="flex items-center gap-1.5 text-zinc-700 font-medium text-[9px] uppercase tracking-tighter">
                                                <Clock className="w-3 h-3" /> {period.startTime} - {period.endTime}
                                            </div>
                                        </td>
                                        {DAYS.filter(d => showWeekends || !["SAT", "SUN"].includes(d.value)).map(day => {
                                            const entry = timetableEntries.find(e => e.periodId === period.id && e.dayOfWeek === day.value);
                                            return (
                                                <td key={day.value} className="p-4 relative min-w-[200px]">
                                                    {entry ? (
                                                        <div className="bg-zinc-100/50 dark:bg-zinc-900/50 p-4 rounded-[1.25rem] border border-zinc-300 dark:border-zinc-800 relative group overflow-hidden shadow-xl hover:border-eduGreen-900/30 transition-all">
                                                            <div className="font-medium text-eduGreen-500 text-sm tracking-tight mb-1">{entry.subject?.name}</div>
                                                            <div className="text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                <Users className="w-3 h-3" /> {entry.teacher?.name}
                                                            </div>
                                                            <button
                                                                onClick={() => removeSlot(entry.id)}
                                                                className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-500/50 hover:text-red-500"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            <SlotAssigner
                                                                subjects={subjects}
                                                                teachers={teachers}
                                                                staffing={assignments}
                                                                onAssign={(data: { subjectId: string, teacherId: string }) => assignSlot(period.id, day.value, data)}
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* --- Period Structure --- */}
                <TabsContent value="periods" className="animate-in slide-in-from-bottom-4">
                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem]  border-t-zinc-800/20 shadow-2xl">
                        <CardHeader className="p-10 border-b border-zinc-200 dark:border-zinc-900/80 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight leading-tight">Day Sequence</CardTitle>
                                <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.2em] mt-1">Configure global teaching slots</p>
                            </div>
                            <div className="flex gap-4">
                                <Button onClick={addPeriod} variant="outline" className="border-zinc-200 dark:border-zinc-900 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 text-zinc-600 dark:text-zinc-500 hover:text-white rounded-2xl h-12 px-6 font-medium uppercase text-[10px] tracking-widest transition-all">
                                    <Plus className="w-4 h-4 mr-2" /> Add Slot
                                </Button>
                                <Button onClick={handleSavePeriods} isLoading={saving} className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-12 px-8 rounded-2xl font-medium uppercase text-[10px] tracking-widest shadow-2xl transition-all shadow-eduGreen-900/20">
                                    <Save className="w-4 h-4 mr-2" /> Seal Structure
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="space-y-4">
                                {periods.map((p, idx) => (
                                    <div key={idx} className="flex flex-col md:flex-row items-center gap-6 p-6 bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-900/50 rounded-2xl group transition-all hover:bg-white dark:bg-zinc-950">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 font-medium text-xs">#{idx + 1}</div>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-medium uppercase tracking-widest text-zinc-700 ml-1">Title</label>
                                                <Input
                                                    value={p.name}
                                                    onChange={(e) => {
                                                        const newP = [...periods];
                                                        newP[idx].name = e.target.value;
                                                        setPeriods(newP);
                                                    }}
                                                    className="h-12 bg-zinc-100 dark:bg-zinc-900 border-0 rounded-xl text-zinc-900 dark:text-white font-medium placeholder:text-zinc-800 dark:text-zinc-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-medium uppercase tracking-widest text-zinc-700 ml-1">Commences</label>
                                                <Input
                                                    type="time"
                                                    value={p.startTime}
                                                    onChange={(e) => {
                                                        const newP = [...periods];
                                                        newP[idx].startTime = e.target.value;
                                                        setPeriods(newP);
                                                    }}
                                                    className="h-12 bg-zinc-100 dark:bg-zinc-900 border-0 rounded-xl text-zinc-900 dark:text-white font-mono font-medium"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-medium uppercase tracking-widest text-zinc-700 ml-1">Concludes</label>
                                                <Input
                                                    type="time"
                                                    value={p.endTime}
                                                    onChange={(e) => {
                                                        const newP = [...periods];
                                                        newP[idx].endTime = e.target.value;
                                                        setPeriods(newP);
                                                    }}
                                                    className="h-12 bg-zinc-100 dark:bg-zinc-900 border-0 rounded-xl text-zinc-900 dark:text-white font-mono font-medium"
                                                />
                                            </div>
                                            <div className="flex items-center gap-4 pt-6">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setPeriods(periods.filter((_, i) => i !== idx))}
                                                    className="text-zinc-800 dark:text-zinc-200 hover:text-red-500 hover:bg-red-950/20"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                variant={alertConfig.variant}
            />

            <ConfirmationModal
                isOpen={confirmGenerate}
                onClose={() => setConfirmGenerate(false)}
                onConfirm={handleAutoGenerate}
                title="Global Auto-Generation"
                description="This will completely overwrite the current timetable for ALL classes in the school. The AI Engine will calculate the perfect schedule based on Teacher Assignments. Do you want to proceed?"
                confirmText="Initiate Generation"
                variant="danger"
            />
        </div>
    );
}

function SlotAssigner({ subjects, teachers, staffing, onAssign }: any) {
    const [subId, setSubId] = useState("");
    const [teacherId, setTeacherId] = useState("");
    const [open, setOpen] = useState(false);

    // Auto-select teacher when subject changes
    useEffect(() => {
        if (subId) {
            const assignment = staffing.find((a: any) => a.subjectId === subId);
            if (assignment) setTeacherId(assignment.teacherId);
        }
    }, [subId, staffing]);

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-10 h-10 rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:text-eduGreen-500 hover:border-eduGreen-900/30 transition-all active:scale-90"
            >
                <Plus className="w-4 h-4" />
            </button>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border-2 border-eduGreen-900/30 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-3">
                <Select value={subId} onValueChange={setSubId}>
                    <SelectTrigger className="h-10 bg-zinc-100 dark:bg-zinc-900 border-0 rounded-lg text-zinc-900 dark:text-white font-medium text-[10px] uppercase tracking-widest">
                        <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent>
                        {subjects.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={teacherId} onValueChange={setTeacherId}>
                    <SelectTrigger className="h-10 bg-zinc-100 dark:bg-zinc-900 border-0 rounded-lg text-zinc-900 dark:text-white font-medium text-[10px] uppercase tracking-widest">
                        <SelectValue placeholder="Teacher" />
                    </SelectTrigger>
                    <SelectContent>
                        {teachers.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={() => {
                            onAssign({ subjectId: subId, teacherId });
                            setOpen(false);
                        }}
                        className="flex-1 bg-eduGreen-600 text-white text-[9px] font-medium uppercase tracking-widest rounded-lg h-9"
                    >
                        Save
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        className="text-[9px] font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-500 h-9"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}

