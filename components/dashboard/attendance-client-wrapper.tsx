"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, CheckCircle, XCircle, Clock, AlertCircle, Brain, Zap, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AlertModal } from "@/components/ui/confirmation-modal";
import { motion } from "framer-motion";

type Student = { id: string; firstName: string; lastName: string; studentCode: string };
type RecordType = { studentId: string; status: string; reason?: string; isLocked?: boolean };
type Auth = { studentId: string; reason?: string };
type Period = { id: string; name: string };
type Subject = { id: string; name: string };
type Class = { classId: string; className: string; subjects?: Subject[] };

interface AttendanceClientWrapperProps {
    initialClasses: Class[];
    initialMatrix: {
        students: Student[];
        records: RecordType[];
        authorizations: Auth[];
    };
    teacherId: string;
}

export default function AttendanceClientWrapper({ initialClasses, initialMatrix }: AttendanceClientWrapperProps) {
    const [classes] = useState<Class[]>(initialClasses);
    const [selectedClassId, setSelectedClassId] = useState(initialClasses[0]?.classId || "");
    const [periods, setPeriods] = useState<Period[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState("full");
    const [selectedSubjectId, setSelectedSubjectId] = useState("none");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Core Plan State
    const [students, setStudents] = useState<Student[]>(initialMatrix.students);
    const [attendance, setAttendance] = useState<{ [id: string]: string }>({});
    const [reasons, setReasons] = useState<{ [id: string]: string }>({});
    const [authorizations, setAuthorizations] = useState<Auth[]>(initialMatrix.authorizations);
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    // Initialize attendance from initial Matrix
    useEffect(() => {
        const attMap: Record<string, string> = {};
        const reasonMap: Record<string, string> = {};
        
        initialMatrix.students.forEach(s => {
            const record = initialMatrix.records.find(r => r.studentId === s.id);
            const auth = initialMatrix.authorizations.find(a => a.studentId === s.id);
            
            if (record) {
                attMap[s.id] = record.status;
                reasonMap[s.id] = record.reason || "";
            } else if (auth) {
                attMap[s.id] = "EXCUSED";
                reasonMap[s.id] = auth.reason || "Approved Leave";
            } else {
                attMap[s.id] = "PRESENT";
            }
        });

        if (initialMatrix.records.length > 0) {
            setIsLocked(initialMatrix.records[0].isLocked);
        } else {
            setIsLocked(false);
        }

        setAttendance(attMap);
        setReasons(reasonMap);
        setStudents(initialMatrix.students);
        setAuthorizations(initialMatrix.authorizations);
    }, [initialMatrix]);

    // Fetch matrix on UI filter changes
    useEffect(() => {
        // Skip first load if it matches initial
        const isInitialParams = selectedClassId === initialClasses[0]?.classId && 
                                date === new Date().toISOString().split('T')[0] &&
                                selectedSubjectId === "none" &&
                                selectedPeriodId === "full";
        
        if (!isInitialParams && selectedClassId) {
            fetchMatrix();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClassId, selectedSubjectId, selectedPeriodId, date]);

    // Fetch periods when class changes
    useEffect(() => {
        if (selectedClassId) {
            fetchPeriods(selectedClassId);
        }
    }, [selectedClassId]);

    const fetchPeriods = async (classId: string) => {
        const res = await fetch(`/api/school/periods?classId=${classId}`);
        const data = (await res.json()) as { periods: Period[] };
        setPeriods(data.periods || []);
    };

    const fetchMatrix = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({ classId: selectedClassId, date });
            if (selectedSubjectId !== "none") queryParams.append("subjectId", selectedSubjectId);
            if (selectedPeriodId !== "full") queryParams.append("periodId", selectedPeriodId);

            const res = await fetch(`/api/school/attendance?${queryParams.toString()}`);
            const data = (await res.json()) as { students: Student[], records: RecordType[], authorizations: Auth[] };
            
            if (data.students) {
                setStudents(data.students);
                const attMap: Record<string, string> = {};
                const reasonMap: Record<string, string> = {};
                
                data.students.forEach((s: Student) => {
                    const record = data.records?.find((r: RecordType) => r.studentId === s.id);
                    const auth = data.authorizations?.find((a: Auth) => a.studentId === s.id);
                    
                    if (record) {
                        attMap[s.id] = record.status;
                        reasonMap[s.id] = record.reason || "";
                    } else if (auth) {
                        attMap[s.id] = "EXCUSED";
                        reasonMap[s.id] = auth.reason || "Approved Leave";
                    } else {
                        attMap[s.id] = "PRESENT";
                    }
                });

                setIsLocked(data.records?.[0]?.isLocked || false);
                setAttendance(attMap);
                setReasons(reasonMap);
                setAuthorizations(data.authorizations || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const records = Object.entries(attendance).map(([studentId, status]) => ({
                studentId,
                status,
                reason: reasons[studentId]
            }));

            const res = await fetch('/api/school/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: selectedClassId,
                    subjectId: selectedSubjectId !== "none" ? selectedSubjectId : null,
                    periodId: selectedPeriodId !== "full" ? selectedPeriodId : null,
                    date,
                    records,
                    seal: true
                })
            });

            if (res.ok) {
                setShowAlert(true);
                setIsLocked(true);
            }
        } finally {
            setSaving(false);
        }
    };

    const setAll = (status: string) => {
        const newAtt = { ...attendance };
        students.forEach(s => {
            const hasAuth = authorizations.some(a => a.studentId === s.id);
            if (!hasAuth) newAtt[s.id] = status;
        });
        setAttendance(newAtt);
    };

    const selectedClass = classes.find(c => c.classId === selectedClassId);
    const availableSubjects = selectedClass?.subjects || [];

    const stats = {
        total: students.length,
        present: Object.values(attendance).filter(s => s === 'PRESENT').length,
        absent: Object.values(attendance).filter(s => s === 'ABSENT').length,
        late: Object.values(attendance).filter(s => s === 'LATE').length,
    };

    return (
        <div className="relative min-h-screen space-y-12 pb-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-[1px] w-8 bg-zinc-200 dark:bg-zinc-800" />
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.4em]">Neural Link Protocol 0.2</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white italic leading-none">
                        AUTHORITY <span className="text-zinc-800 dark:text-zinc-200 not-italic">LOG</span>
                    </h2>
                </motion.div>

                <Button
                    onClick={handleSave}
                    disabled={isLocked || loading || saving}
                    className={cn(
                        "h-20 px-12 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl relative overflow-hidden group active:scale-95",
                        isLocked ? "bg-zinc-100/50 dark:bg-zinc-900/50 text-zinc-600 grayscale" : "bg-white text-black"
                    )}
                >
                    <div className="flex items-center gap-4 relative z-10">
                        {isLocked ? "SYNC COMPLETE" : saving ? "SEALING..." : <><Activity className="w-5 h-5" /> SEAL RECORDS</>}
                    </div>
                </Button>
            </div>

            <Card className="p-10 bg-white/40 dark:bg-[#050505]/40 backdrop-blur-[40px] border-zinc-200 dark:border-white/5 rounded-[3rem] relative shadow-2xl overflow-hidden group">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 relative z-10">
                    <ConfigField label="Cohort Identifier" icon={Brain}>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="h-14 bg-zinc-200 dark:bg-white/5 border-zinc-300 dark:border-white/10 rounded-2xl text-zinc-900 dark:text-white font-bold text-xs uppercase tracking-widest ring-0">
                                <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-50 dark:bg-[#0a0a0a] border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white rounded-2xl">
                                {classes.map((cls) => (
                                    <SelectItem key={cls.classId} value={cls.classId} className="focus:bg-white focus:text-black py-4">
                                        {cls.className}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </ConfigField>

                    <ConfigField label="Temporal Slot" icon={Clock}>
                        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                            <SelectTrigger className="h-14 bg-zinc-200 dark:bg-white/5 border-zinc-300 dark:border-white/10 rounded-2xl text-zinc-900 dark:text-white font-bold text-xs uppercase tracking-widest ring-0">
                                <SelectValue placeholder="Day Cycle" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-50 dark:bg-[#0a0a0a] border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white rounded-2xl">
                                <SelectItem value="full" className="focus:bg-white focus:text-black py-4">Full Cycle</SelectItem>
                                {periods.map((p: Period) => (
                                    <SelectItem key={p.id} value={p.id} className="focus:bg-white focus:text-black py-4">{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </ConfigField>

                    <ConfigField label="Neural Path" icon={Zap}>
                        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                            <SelectTrigger className="h-14 bg-zinc-200 dark:bg-white/5 border-zinc-300 dark:border-white/10 rounded-2xl text-zinc-900 dark:text-white font-bold text-xs uppercase tracking-widest ring-0">
                                <SelectValue placeholder="All Streams" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-50 dark:bg-[#0a0a0a] border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white rounded-2xl">
                                <SelectItem value="none" className="focus:bg-white focus:text-black py-4">Unified Stream</SelectItem>
                                {availableSubjects.map((sub: Subject) => (
                                    <SelectItem key={sub.id} value={sub.id} className="focus:bg-white focus:text-black py-4">{sub.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </ConfigField>

                    <ConfigField label="Timeline Index" icon={CalendarIcon}>
                        <Input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="h-14 bg-zinc-200 dark:bg-white/5 border-zinc-300 dark:border-white/10 rounded-2xl text-zinc-900 dark:text-white font-bold text-xs uppercase tracking-[0.2em] px-6 appearance-none"
                        />
                    </ConfigField>
                </div>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <MiniStat label="ACTIVE NODES" value={stats.total} color="blue" />
                <MiniStat label="PRESENT" value={stats.present} color="emerald" percentage={(stats.present / (stats.total || 1)) * 100} />
                <MiniStat label="ABSENT" value={stats.absent} color="rose" percentage={(stats.absent / (stats.total || 1)) * 100} />
                <MiniStat label="LATENCY" value={stats.late} color="amber" percentage={(stats.late / (stats.total || 1)) * 100} />
            </div>

            <Card className="bg-white/40 dark:bg-[#050505]/40 backdrop-blur-[40px] border-zinc-200 dark:border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl relative">
                <div className="p-10 border-b border-zinc-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <span className="text-2xl font-black text-zinc-900 dark:text-white italic">{students.length} <span className="text-zinc-800 dark:text-zinc-200 not-italic text-lg">DATAPOINTS REGISTERED</span></span>
                    </div>
                    <div className="flex items-center gap-4 bg-white/40 dark:bg-black/40 p-2 rounded-[2rem] border border-zinc-200 dark:border-white/5">
                        <button onClick={() => !isLocked && setAll('PRESENT')} disabled={isLocked} className="h-12 px-8 rounded-[1.5rem] text-[10px] font-black uppercase text-emerald-500 hover:bg-emerald-500/10 transition-all">SYNCHRONIZE ALL</button>
                        <button onClick={() => !isLocked && setAll('ABSENT')} disabled={isLocked} className="h-12 px-8 rounded-[1.5rem] text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500/10 transition-all">VOID ALL</button>
                    </div>
                </div>

                <div className="divide-y divide-white/5 min-h-[400px]">
                    {loading ? (
                        <div className="p-32 flex justify-center flex-col items-center gap-6">
                            <Activity className="w-12 h-12 text-zinc-900 dark:text-white animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500">Querying Institutional Records...</p>
                        </div>
                    ) : (
                        students.map((student, idx) => (
                            <StudentRecord
                                key={student.id}
                                student={student}
                                attendance={attendance}
                                setAttendance={setAttendance}
                                reasons={reasons}
                                setReasons={setReasons}
                                isLocked={isLocked}
                                authorizations={authorizations}
                                idx={idx}
                            />
                        ))
                    )}
                </div>
            </Card>

            <AlertModal isOpen={showAlert} onClose={() => setShowAlert(false)} title="SYNC SUCCESSFUL" message="The attendance records have been securely archived." variant="success" />
        </div>
    );
}

function ConfigField({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 ml-1">
                <Icon className="w-3 h-3 text-zinc-700" />
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">{label}</label>
            </div>
            {children}
        </div>
    );
}

function MiniStat({ label, value, color, percentage }: { label: string; value: number | string; color: string; percentage?: number }) {
    return (
        <Card className="p-6 bg-white/40 dark:bg-[#050505]/40 backdrop-blur-[40px] border-zinc-200 dark:border-white/5 rounded-[2.5rem] flex flex-col justify-between group overflow-hidden relative">
            <div className="space-y-1 relative z-10">
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">{label}</span>
                <div className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter italic">{value}</div>
            </div>
            {percentage !== undefined && (
                <div className="mt-4 relative z-10 h-1 w-full bg-zinc-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={cn("h-full", color === 'emerald' ? 'bg-emerald-500' : color === 'rose' ? 'bg-rose-500' : 'bg-amber-500')} />
                </div>
            )}
        </Card>
    );
}

function StudentRecord({ student, attendance, setAttendance, reasons, setReasons, isLocked, authorizations, idx }: { student: Student, attendance: Record<string, string>, setAttendance: (a: Record<string, string>) => void, reasons: Record<string, string>, setReasons: (r: Record<string, string>) => void, isLocked: boolean, authorizations: Auth[], idx: number }) {
    const currentStatus = attendance[student.id] || "PRESENT";
    const auth = authorizations?.find((a: Auth) => a.studentId === student.id);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 hover:bg-white/[0.02] transition-all group/row relative">
            <div className="flex items-center gap-8 relative z-10">
                <div className="w-20 h-20 rounded-[2rem] bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/5 flex items-center justify-center font-black text-zinc-800 dark:text-zinc-200 text-2xl relative overflow-hidden italic shadow-inner">
                    {student.firstName[0]}{student.lastName[0]}
                </div>
                <div className="space-y-1">
                    <div className="font-black text-3xl text-zinc-900 dark:text-white dark:text-zinc-100 group-hover/row:text-zinc-900 dark:text-white transition-colors tracking-tight italic uppercase">{student.firstName} <span className="text-zinc-700">{student.lastName}</span></div>
                    <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] font-mono">{student.studentCode}</div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                {(currentStatus !== 'PRESENT') && (
                    <Input
                        placeholder={auth ? `VERIFIED: ${auth.reason}` : "SPECIFY CAUSE..."}
                        value={reasons[student.id] || ""}
                        disabled={isLocked}
                        onChange={(e) => setReasons({ ...reasons, [student.id]: e.target.value })}
                        className="h-14 bg-zinc-200 dark:bg-white/5 border-zinc-300 dark:border-white/10 rounded-2xl px-6 text-xs italic font-black text-zinc-900 dark:text-white w-full md:w-80"
                    />
                )}

                <div className="flex gap-2 bg-white/40 dark:bg-black/40 p-2 rounded-[2.25rem] border border-zinc-200 dark:border-white/5 overflow-x-auto shrink-0 shadow-2xl backdrop-blur-xl">
                    <StatusBtn status="PRESENT" icon={CheckCircle} active={currentStatus === 'PRESENT'} onSelect={() => !isLocked && setAttendance({ ...attendance, [student.id]: 'PRESENT' })} activeColor="text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]" disabled={isLocked} />
                    <StatusBtn status="LATE" icon={Clock} active={currentStatus === 'LATE'} onSelect={() => !isLocked && setAttendance({ ...attendance, [student.id]: 'LATE' })} activeColor="text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]" disabled={isLocked} />
                    <StatusBtn status="ABSENT" icon={XCircle} active={currentStatus === 'ABSENT'} onSelect={() => !isLocked && setAttendance({ ...attendance, [student.id]: 'ABSENT' })} activeColor="text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]" disabled={isLocked} />
                    <StatusBtn status="EXCUSED" icon={AlertCircle} active={currentStatus === 'EXCUSED'} onSelect={() => !isLocked && setAttendance({ ...attendance, [student.id]: 'EXCUSED' })} activeColor="text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]" disabled={isLocked || !!auth} />
                </div>
            </div>
        </motion.div>
    );
}

function StatusBtn({ status, icon: Icon, active, onSelect, activeColor, disabled }: { status: string; icon: React.ElementType; active: boolean; onSelect: () => void; activeColor: string; disabled?: boolean }) {
    return (
        <button onClick={onSelect} disabled={disabled} className={cn("h-14 px-6 rounded-[1.75rem] transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] relative group", active ? activeColor : "text-zinc-700 hover:text-zinc-400")}>
            <Icon className="w-5 h-5" />
            <span className={cn(active ? "flex" : "hidden group-hover:flex")}>{status}</span>
        </button>
    );
}
