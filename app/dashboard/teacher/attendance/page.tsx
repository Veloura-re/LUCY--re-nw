"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Save, Search, CheckCircle, XCircle, Clock, AlertCircle, Shield, Brain, Zap, Fingerprint, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AlertModal } from "@/components/ui/confirmation-modal";
import { motion, AnimatePresence } from "framer-motion";

export default function AttendancePage() {
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<{ [id: string]: string }>({});
    const [reasons, setReasons] = useState<{ [id: string]: string }>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [authorizations, setAuthorizations] = useState<any[]>([]);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchPeriods(selectedClassId);
            fetchStudentsAndAttendance();
        }
    }, [selectedClassId, selectedSubjectId, selectedPeriodId, date]);

    const fetchPeriods = async (classId?: string) => {
        const url = classId ? `/api/school/periods?classId=${classId}` : '/api/school/periods';
        const res = await fetch(url);
        const data = await res.json();
        setPeriods(data.periods || []);
    };

    const fetchClasses = async () => {
        const res = await fetch('/api/teacher/classes');
        const data = await res.json();
        if (data.classes) {
            setClasses(data.classes);
            if (data.classes.length > 0) setSelectedClassId(data.classes[0].classId);
        }
    };

    const fetchStudentsAndAttendance = async () => {
        setLoading(true);
        try {
            const resStudents = await fetch(`/api/school/students`);
            const studentsData = await resStudents.json();

            const classStudents = studentsData.students.filter((s: any) => s.classId === selectedClassId);
            setStudents(classStudents);

            const queryParams = new URLSearchParams({
                classId: selectedClassId,
                date: date
            });
            if (selectedSubjectId && selectedSubjectId !== "none") queryParams.append("subjectId", selectedSubjectId);
            if (selectedPeriodId && selectedPeriodId !== "full") queryParams.append("periodId", selectedPeriodId);

            const resAtt = await fetch(`/api/school/attendance?${queryParams.toString()}`);
            const attData = await resAtt.json();

            const attMap: any = {};
            const reasonMap: any = {};

            classStudents.forEach((s: any) => {
                const auth = attData.authorizations?.find((a: any) => a.studentId === s.id);
                if (auth) {
                    attMap[s.id] = "EXCUSED";
                    reasonMap[s.id] = auth.reason || "Approved Leave";
                } else {
                    attMap[s.id] = "PRESENT";
                }
            });

            if (attData.attendance) {
                attData.attendance.forEach((r: any) => {
                    attMap[r.studentId] = r.status;
                    reasonMap[r.studentId] = r.reason || "";
                });
                if (attData.attendance.length > 0) {
                    setIsLocked(attData.attendance[0].isLocked);
                } else {
                    setIsLocked(false);
                }
            } else {
                setIsLocked(false);
            }
            setAttendance(attMap);
            setReasons(reasonMap);
            setAuthorizations(attData.authorizations || []);

        } catch (e) {
            console.error(e);
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
                    subjectId: (selectedSubjectId && selectedSubjectId !== "none") ? selectedSubjectId : null,
                    periodId: (selectedPeriodId && selectedPeriodId !== "full") ? selectedPeriodId : null,
                    date,
                    records,
                    seal: true
                })
            });
            if (res.ok) {
                setShowAlert(true);
                setIsLocked(true);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to seal attendance");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const setAll = (status: string) => {
        const newAtt = { ...attendance };
        students.forEach(s => newAtt[s.id] = status);
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
            {/* Scanned Line Overlay */}
            <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03]"
                style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px)' }} />

            {/* Header Redesign */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-2"
                >
                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-[1px] w-8 bg-zinc-800" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em]">Neural Link Protocol 0.2</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white italic leading-none">
                        AUTHORITY <span className="text-zinc-800 not-italic">LOG</span>
                    </h2>
                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.3em] flex items-center gap-2">
                        <Fingerprint className="w-3 h-3 text-zinc-700" />
                        Teacher Presence Verification Matrix
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Button
                        onClick={handleSave}
                        isLoading={saving}
                        disabled={isLocked || loading}
                        className={cn(
                            "h-20 px-12 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all relative overflow-hidden group active:scale-95 shadow-2xl",
                            isLocked
                                ? "bg-zinc-900/50 border-white/5 text-zinc-600 grayscale cursor-not-allowed"
                                : "bg-white text-black hover:bg-zinc-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                        )}
                    >
                        <div className="flex items-center gap-4 relative z-10">
                            {isLocked ? (
                                <><div className="w-2 h-2 rounded-full bg-zinc-800 animate-pulse" /> SYNC COMPLETE</>
                            ) : (
                                <><Activity className="w-5 h-5" /> SEAL RECORDS</>
                            )}
                        </div>
                        {!isLocked && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-300" />
                        )}
                    </Button>
                </motion.div>
            </div>

            {/* Config Panel */}
            <Card className="p-6 md:p-10 bg-[#050505]/40 backdrop-blur-[40px] border-white/5 rounded-[3rem] relative shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10 relative z-10">
                    <ConfigField label="Cohort Identifier" icon={Brain}>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold text-xs uppercase tracking-widest ring-0 focus:ring-0">
                                <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0a0a0a] border-white/10 text-white rounded-2xl overflow-hidden backdrop-blur-xl">
                                {classes.filter((c, i, a) => a.findIndex(t => t.classId === c.classId) === i).map((cls) => (
                                    <SelectItem key={cls.id} value={cls.classId} className="focus:bg-white focus:text-black py-4">
                                        {cls.className}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </ConfigField>

                    <ConfigField label="Temporal Slot" icon={Clock}>
                        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold text-xs uppercase tracking-widest ring-0 focus:ring-0">
                                <SelectValue placeholder="Day Cycle" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0a0a0a] border-white/10 text-white rounded-2xl overflow-hidden backdrop-blur-xl">
                                <SelectItem value="full" className="focus:bg-white focus:text-black py-4">Full Cycle</SelectItem>
                                {periods.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id} className="focus:bg-white focus:text-black py-4">{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </ConfigField>

                    <ConfigField label="Neural Path" icon={Zap}>
                        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold text-xs uppercase tracking-widest ring-0 focus:ring-0">
                                <SelectValue placeholder="All Streams" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0a0a0a] border-white/10 text-white rounded-2xl overflow-hidden backdrop-blur-xl">
                                <SelectItem value="none" className="focus:bg-white focus:text-black py-4">Unified Stream</SelectItem>
                                {availableSubjects.map((sub: any) => (
                                    <SelectItem key={sub.id} value={sub.id} className="focus:bg-white focus:text-black py-4">{sub.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </ConfigField>

                    <ConfigField label="Timeline Index" icon={CalendarIcon}>
                        <div className="relative">
                            <Input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold text-xs uppercase tracking-[0.2em] px-6 focus:border-white/20 transition-all appearance-none"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Activity className="w-4 h-4 text-zinc-700" />
                            </div>
                        </div>
                    </ConfigField>
                </div>
            </Card>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <MiniStat label="ACTIVE NODES" value={stats.total} color="blue" />
                <MiniStat label="PRESENT" value={stats.present} color="emerald" percentage={(stats.present / stats.total) * 100} />
                <MiniStat label="ABSENT" value={stats.absent} color="rose" percentage={(stats.absent / stats.total) * 100} />
                <MiniStat label="LATENCY" value={stats.late} color="amber" percentage={(stats.late / stats.total) * 100} />
            </div>

            {/* Record List */}
            <Card className="bg-[#050505]/40 backdrop-blur-[40px] border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl relative">
                <div className="p-6 md:p-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.01]">
                    <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 mx-auto md:mx-0">
                            <Activity className="w-6 h-6 text-zinc-400" />
                        </div>
                        <div>
                            <span className="text-2xl font-black text-white italic flex flex-col md:flex-row items-center gap-1 md:gap-3">
                                {students.length} <span className="text-zinc-800 not-italic text-lg">DATAPOINTS REGISTERED</span>
                            </span>
                            <div className="flex items-center justify-center md:justify-start gap-2 mt-0.5">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Real-time Stream Active</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 bg-black/40 p-2 rounded-[2rem] border border-white/5 backdrop-blur-xl shrink-0 max-w-full overflow-x-auto overflow-y-hidden snap-x">
                        <button
                            onClick={() => !isLocked && setAll('PRESENT')}
                            disabled={isLocked}
                            className={cn(
                                "h-12 px-4 md:px-8 shrink-0 snap-start rounded-[1.5rem] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                isLocked ? "text-zinc-800 cursor-not-allowed" : "text-emerald-500 hover:bg-emerald-500/10 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                            )}
                        >SYCHRONIZE ALL</button>
                        <div className="w-[1px] h-6 bg-white/5 shrink-0" />
                        <button
                            onClick={() => !isLocked && setAll('ABSENT')}
                            disabled={isLocked}
                            className={cn(
                                "h-12 px-4 md:px-8 shrink-0 snap-start rounded-[1.5rem] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                isLocked ? "text-zinc-800 cursor-not-allowed" : "text-rose-500 hover:bg-rose-500/10 hover:shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                            )}
                        >VOID ALL</button>
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                        <AnimatePresence mode="popLayout">
                            {students.map((student, idx) => (
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
                            ))}
                        </AnimatePresence>
                        {students.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-32 text-center flex flex-col items-center gap-8"
                            >
                                <div className="w-24 h-24 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-center relative">
                                    <Search className="w-10 h-10 text-zinc-800" />
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1.8, repeat: Infinity }}
                                        className="absolute inset-0 rounded-[2.5rem] border border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-700">Null Set Detected</p>
                                    <p className="text-[10px] font-bold text-zinc-800 uppercase tracking-widest italic">No active cohort matches for this temporal index</p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AlertModal
                isOpen={showAlert}
                onClose={() => setShowAlert(false)}
                title="SYNC SUCCESSFUL"
                message="The institutional presence matrix has been successfully encrypted and archived in the central authority core."
                variant="success"
            />
        </div>
    );
}

function ConfigField({ label, icon: Icon, children }: any) {
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

function MiniStat({ label, value, color, percentage }: any) {
    const colors: any = {
        emerald: "text-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
        rose: "text-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.1)]",
        blue: "text-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.1)]",
        amber: "text-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]",
    };

    return (
        <Card className="p-6 bg-[#050505]/40 backdrop-blur-[40px] border-white/5 rounded-[2.5rem] flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            <div className="space-y-1 relative z-10">
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">{label}</span>
                <div className="text-4xl font-black text-white tracking-tighter italic">{value}</div>
            </div>
            {percentage !== undefined && (
                <div className="mt-4 relative z-10">
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={cn("h-full transition-all duration-300", color === 'emerald' ? 'bg-emerald-500' : color === 'rose' ? 'bg-rose-500' : 'bg-amber-500')}
                        />
                    </div>
                </div>
            )}
        </Card>
    );
}

function StudentRecord({ student, attendance, setAttendance, reasons, setReasons, isLocked, authorizations, idx }: any) {
    const currentStatus = attendance[student.id] || "PRESENT";
    const hasAuthorization = authorizations?.some((a: any) => a.studentId === student.id);
    const authorization = authorizations?.find((a: any) => a.studentId === student.id);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-6 md:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 hover:bg-white/[0.02] transition-all group/row relative overflow-hidden"
        >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/0 group-hover/row:bg-white/10 transition-all" />

            <div className="flex items-center gap-8 relative z-10">
                <div className="relative group/avatar">
                    <div className="w-20 h-20 rounded-[2rem] bg-[#0a0a0a] border border-white/5 flex items-center justify-center font-black text-zinc-800 text-2xl group-hover/row:border-white/20 transition-all shadow-2xl relative overflow-hidden italic">
                        {student.firstName[0]}{student.lastName[0]}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                    </div>
                    {hasAuthorization && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-400 rotate-12">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-4">
                        <div className="font-black text-3xl text-zinc-100 group-hover/row:text-white transition-colors tracking-tight italic uppercase">
                            {student.firstName} <span className="text-zinc-700">{student.lastName}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] font-mono">{student.studentCode}</div>
                        {hasAuthorization && (
                            <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] italic">Authorized Permit active</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                {(currentStatus === 'ABSENT' || currentStatus === 'EXCUSED' || currentStatus === 'LATE') && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full md:w-80 relative"
                    >
                        <Input
                            placeholder={hasAuthorization ? `VERIFIED: ${authorization.reason}` : "SPECIFY CAUSE..."}
                            value={reasons[student.id] || ""}
                            disabled={isLocked}
                            onChange={(e) => setReasons({ ...reasons, [student.id]: e.target.value })}
                            className={cn(
                                "h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-xs placeholder:text-zinc-800 focus:border-white/20 transition-all italic font-black text-white ring-0 focus:ring-0",
                                isLocked && "opacity-50 cursor-not-allowed"
                            )}
                        />
                    </motion.div>
                )}

                <div className="flex gap-1 md:gap-2 bg-black/40 p-2 rounded-[2.25rem] border border-white/5 shadow-2xl backdrop-blur-xl shrink-0 w-full md:w-auto overflow-x-auto snap-x justify-start overflow-y-hidden max-w-[90vw]">
                    <StatusBtn
                        status="PRESENT"
                        icon={CheckCircle}
                        active={currentStatus === 'PRESENT'}
                        disabled={isLocked}
                        onSelect={() => !isLocked && setAttendance({ ...attendance, [student.id]: 'PRESENT' })}
                        activeColor="text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                    />
                    <StatusBtn
                        status="LATE"
                        icon={Clock}
                        active={currentStatus === 'LATE'}
                        disabled={isLocked}
                        onSelect={() => !isLocked && setAttendance({ ...attendance, [student.id]: 'LATE' })}
                        activeColor="text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
                    />
                    <StatusBtn
                        status="ABSENT"
                        icon={XCircle}
                        active={currentStatus === 'ABSENT'}
                        disabled={isLocked}
                        onSelect={() => !isLocked && setAttendance({ ...attendance, [student.id]: 'ABSENT' })}
                        activeColor="text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]"
                    />
                    <StatusBtn
                        status="EXCUSED"
                        icon={AlertCircle}
                        active={currentStatus === 'EXCUSED'}
                        disabled={isLocked}
                        onSelect={() => !isLocked && setAttendance({ ...attendance, [student.id]: 'EXCUSED' })}
                        activeColor="text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                    />
                </div>
            </div>
        </motion.div>
    );
}

function StatusBtn({ status, icon: Icon, active, onSelect, activeColor, disabled }: any) {
    return (
        <button
            onClick={onSelect}
            disabled={disabled}
            className={cn(
                "h-12 md:h-14 px-4 md:px-6 rounded-[1.25rem] md:rounded-[1.75rem] transition-all flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] outline-none relative group shrink-0 snap-start",
                active
                    ? `${activeColor} border ring-1 ring-white/5`
                    : "text-zinc-700 hover:text-zinc-400 hover:bg-white/5",
                disabled && !active && "opacity-20 grayscale cursor-not-allowed",
                disabled && active && "opacity-80 cursor-not-allowed"
            )}
        >
            <Icon className={cn("w-4 h-4 md:w-5 md:h-5", active ? "" : "text-zinc-800 opacity-50")} />
            <span className={cn(active ? "flex" : "hidden group-hover:flex")}>{status}</span>
        </button>
    );
}

