"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock, ShieldCheck, Calendar as CalendarIcon, Loader2, Save, Activity, Zap, Shield, Cpu, Sparkles } from "lucide-react";
import { format } from "date-fns";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function DirectorAttendancePage() {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STAFF'>('OVERVIEW');
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState<Date>(new Date());

    // Overview Data
    const [stats, setStats] = useState<any>({ present: 0, absent: 0, late: 0, excused: 0, total: 0, staffPresent: 0, staffTotal: 0 });
    const [teacherCompliance, setTeacherCompliance] = useState<any[]>([]);

    // Staff Attendance Data
    const [staffRecords, setStaffRecords] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (activeTab === 'OVERVIEW') {
            fetchOverview();
        } else {
            fetchStaffAttendance();
        }
    }, [activeTab, date]);

    const fetchOverview = async () => {
        setLoading(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const res = await fetch(`/api/director/attendance/overview?date=${dateStr}`);
            const data = await res.json() as any;
            if (res.ok && data) {
                setStats(data.stats);
                setTeacherCompliance(data.teacherCompliance);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaffAttendance = async () => {
        setLoading(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const res = await fetch(`/api/director/attendance/staff?date=${dateStr}`);
            const data = await res.json() as any;
            if (res.ok && data.records) {
                setStaffRecords(data.records);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleStaffStatusChange = (teacherId: string, status: string) => {
        setStaffRecords(prev => prev.map(record =>
            record.teacherId === teacherId ? { ...record, status } : record
        ));
    };

    const saveStaffAttendance = async () => {
        setSaving(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const res = await fetch('/api/director/attendance/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateStr,
                    records: staffRecords
                })
            });
            if (res.ok) {
                fetchStaffAttendance();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handlePreviousDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        setDate(d);
    };

    const handleNextDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        setDate(d);
    };

    if (loading && activeTab === 'OVERVIEW' && teacherCompliance.length === 0) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <SpringingLoader message="Analyzing Institutional Presence" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10 pb-40 text-white">
            {/* Scanned Line Overlay */}
            <div className="fixed inset-0 z-[-1] opacity-5 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

            {/* Header Redesign */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-white/5 pb-10">
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[1.25rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-2xl">
                            <Shield className="w-7 h-7 text-emerald-500" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black tracking-[0.2em] text-white uppercase italic">
                                DAILY <span className="text-emerald-500">COMMAND</span>
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mt-2">Institutional Overlord Protocol Active</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-[#050505]/60 p-1.5 rounded-[1.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl w-fit">
                        <button
                            onClick={() => setActiveTab('OVERVIEW')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                activeTab === 'OVERVIEW'
                                    ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                    : "text-white/40 hover:text-white"
                            )}
                        >
                            STUDENT OVERVIEW
                        </button>
                        <button
                            onClick={() => setActiveTab('STAFF')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                activeTab === 'STAFF'
                                    ? "bg-blue-500 text-black shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                                    : "text-white/40 hover:text-white"
                            )}
                        >
                            STAFF REPORTING
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:items-end gap-6">
                    <div className="flex items-center gap-4 bg-[#050505]/60 border border-white/5 p-2 rounded-[2rem] backdrop-blur-3xl shadow-2xl">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handlePreviousDay}
                            className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center"
                        >
                            &larr;
                        </motion.button>
                        <div className="flex items-center gap-4 px-4 border-x border-white/5">
                            <CalendarIcon className="w-5 h-5 text-emerald-500" />
                            <span className="text-xs font-black text-white uppercase tracking-[0.3em] font-mono">{format(date, 'MMM do, yyyy').toUpperCase()}</span>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleNextDay}
                            className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center"
                        >
                            &rarr;
                        </motion.button>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'OVERVIEW' ? (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-12"
                    >
                        {/* Student Stats Redesign */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <StatCard
                                icon={Users}
                                label="TOTAL RECORDS"
                                value={stats.total}
                                color="border-white/10"
                                glow="bg-white"
                            />
                            <StatCard
                                icon={UserCheck}
                                label="PRESENT"
                                value={stats.present}
                                color="border-emerald-500/20 text-emerald-500"
                                glow="bg-emerald-500"
                                percentage={stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}
                            />
                            <StatCard
                                icon={UserX}
                                label="ABSENT"
                                value={stats.absent}
                                color="border-rose-500/20 text-rose-500"
                                glow="bg-rose-500"
                            />
                            <StatCard
                                icon={ShieldCheck}
                                label="STAFF SYNC"
                                value={`${stats.staffPresent}/${stats.staffTotal}`}
                                color="border-blue-500/20 text-blue-500"
                                glow="bg-blue-500"
                                percentage={stats.staffTotal > 0 ? Math.round((stats.staffPresent / stats.staffTotal) * 100) : 0}
                            />
                        </div>

                        {/* Teacher Compliance Redesign */}
                        <Card className="bg-[#050505]/40 backdrop-blur-[40px] border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 z-0 opacity-10 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />

                            <CardHeader className="p-12 border-b border-white/5 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-2xl">
                                        <Activity className="w-7 h-7 text-emerald-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-black text-white uppercase italic tracking-[0.2em]">TEACHER COMPLIANCE</CardTitle>
                                        <CardDescription className="text-white/20 font-black uppercase tracking-[0.4em] text-[10px] mt-2">Real-time attendance submission matrix</CardDescription>
                                    </div>
                                </div>
                                <Sparkles className="w-6 h-6 text-emerald-500/30" />
                            </CardHeader>

                            <CardContent className="p-0">
                                <div className="divide-y divide-white/5">
                                    {teacherCompliance.length === 0 ? (
                                        <div className="p-32 text-center flex flex-col items-center gap-6 opacity-20">
                                            <ShieldCheck className="w-16 h-16 text-white" />
                                            <p className="text-[12px] font-black uppercase tracking-[0.4em] text-white">
                                                NO TRACKING RECORDS AVAILABLE
                                            </p>
                                        </div>
                                    ) : (
                                        teacherCompliance.map((teacher, i) => (
                                            <motion.div
                                                key={teacher.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-white/[0.03] transition-all group/item"
                                            >
                                                <div className="flex items-center gap-8">
                                                    <div className="w-20 h-20 rounded-[2rem] bg-[#050505]/80 border border-white/10 flex items-center justify-center font-black shadow-2xl relative overflow-hidden text-white/40 group-hover/item:text-white transition-all text-2xl italic">
                                                        {teacher.name.charAt(0)}
                                                        <div className={cn(
                                                            "absolute inset-x-0 bottom-0 h-1.5 transition-all blur-[2px]",
                                                            teacher.hasSubmittedAttendance ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" : "bg-rose-500 opacity-20"
                                                        )} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-2xl text-white italic group-hover/item:translate-x-2 transition-transform tracking-tight">{teacher.name.toUpperCase()}</h4>
                                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-mono mt-3">{teacher.email.split('@')[0]}@INSTITUTION.SH</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {teacher.hasSubmittedAttendance ? (
                                                        <div className="px-8 py-3 rounded-[1.25rem] bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-4 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] italic">SYNC COMPLETE</span>
                                                        </div>
                                                    ) : (
                                                        <div className="px-8 py-3 rounded-[1.25rem] bg-rose-500/5 border border-rose-500/10 flex items-center gap-4 group-hover/item:bg-rose-500/10 transition-colors">
                                                            <div className="w-2 h-2 rounded-full bg-rose-500/30" />
                                                            <span className="text-[10px] font-black text-rose-500/40 uppercase tracking-[0.3em] italic">PENDING LOGS</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key="staff"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-12"
                    >
                        <Card className="bg-[#050505]/40 backdrop-blur-[40px] border-white/5 rounded-[3rem] shadow-2xl relative z-20 overflow-hidden">
                            <div className="absolute inset-0 z-0 opacity-10 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />

                            <CardHeader className="p-12 border-b border-white/5 flex flex-row items-center justify-between bg-gradient-to-b from-white/[0.02] to-transparent">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-2xl">
                                        <Users className="w-7 h-7 text-blue-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-black text-white uppercase italic tracking-[0.2em]">STAFF ROLL CALL</CardTitle>
                                        <CardDescription className="text-white/20 font-black uppercase tracking-[0.4em] text-[10px] mt-2">Official faculty presence matrix</CardDescription>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={saveStaffAttendance}
                                    disabled={saving}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-black rounded-[1.25rem] px-10 h-16 shadow-[0_0_40px_rgba(16,185,129,0.3)] border border-white/20 transition-all font-black uppercase tracking-[0.2em] italic text-[11px] flex items-center gap-4"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    COMMIT REGISTER
                                </motion.button>
                            </CardHeader>

                            <CardContent className="p-0">
                                <div className="divide-y divide-white/5">
                                    {loading && staffRecords.length === 0 ? (
                                        <div className="p-32 text-center flex flex-col items-center gap-6 opacity-20">
                                            <Loader2 className="w-12 h-12 text-white animate-spin" />
                                        </div>
                                    ) : (
                                        staffRecords.map((record, i) => (
                                            <motion.div
                                                key={record.teacherId}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-10 hover:bg-white/[0.03] transition-all group/staff"
                                            >
                                                <div className="flex items-center gap-10">
                                                    <div className="w-24 h-24 rounded-[3rem] bg-[#050505]/80 border border-white/10 flex items-center justify-center font-black shadow-2xl text-white/40 group-hover/staff:text-white transition-all relative overflow-hidden italic text-3xl">
                                                        {record.name.charAt(0)}
                                                        <div className={cn(
                                                            "absolute inset-x-0 bottom-0 h-2 blur-[1px] transition-all",
                                                            record.status === 'PRESENT' ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]' :
                                                                record.status === 'ABSENT' ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.8)]' :
                                                                    record.status === 'LATE' ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.8)]' :
                                                                        record.status === 'EXCUSED' ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]' : 'bg-transparent'
                                                        )} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-3xl text-white italic tracking-tight group-hover/staff:translate-x-2 transition-transform">{record.name.toUpperCase()}</h4>
                                                        <div className="flex items-center gap-4 mt-4">
                                                            <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">FACULTY GRID</div>
                                                            <div className="w-1 h-1 rounded-full bg-white/10" />
                                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] italic">Verified Instructor</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-full md:w-80 relative group/select">
                                                    <Select
                                                        value={record.status}
                                                        onValueChange={(val: string) => handleStaffStatusChange(record.teacherId, val)}
                                                    >
                                                        <SelectTrigger className="h-20 bg-[#050505]/60 border-2 border-white/5 rounded-[1.5rem] text-white font-black uppercase tracking-[0.2em] shadow-2xl backdrop-blur-3xl px-8 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all font-mono italic text-[11px]">
                                                            <SelectValue placeholder="UNMARKED" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-[#050505] border-white/10 rounded-[1.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] p-2">
                                                            <SelectItem value="PENDING" className="text-white/20 focus:bg-white/5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] p-4">UNMARKED</SelectItem>
                                                            <SelectItem value="PRESENT" className="text-emerald-500 focus:bg-emerald-500/10 focus:text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] p-4">PRESENT</SelectItem>
                                                            <SelectItem value="ABSENT" className="text-rose-500 focus:bg-rose-500/10 focus:text-rose-400 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] p-4">ABSENT</SelectItem>
                                                            <SelectItem value="LATE" className="text-amber-500 focus:bg-amber-500/10 focus:text-amber-400 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] p-4">LATE</SelectItem>
                                                            <SelectItem value="EXCUSED" className="text-blue-500 focus:bg-blue-500/10 focus:text-blue-400 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] p-4">EXCUSED</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <div className="absolute -inset-px rounded-[1.5rem] bg-gradient-to-r from-emerald-500/20 via-transparent to-blue-500/20 opacity-0 group-hover/select:opacity-100 transition-opacity pointer-events-none" />
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, glow, percentage }: any) {
    return (
        <Card className={cn(
            "bg-[#050505]/40 backdrop-blur-[40px] border-white/5 rounded-[3rem] shadow-2xl overflow-hidden relative group transition-all hover:scale-[1.02] hover:border-white/10",
            color.includes('emerald') && "hover:border-emerald-500/30",
            color.includes('rose') && "hover:border-rose-500/30",
            color.includes('blue') && "hover:border-blue-500/30"
        )}>
            {/* Background Glow */}
            <div className={cn(
                "absolute -inset-2 blur-[60px] opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none",
                glow
            )} />

            <CardContent className="p-10 relative z-10 flex flex-col justify-between h-full min-h-[220px]">
                <div>
                    <div className="flex items-center gap-6 mb-8">
                        <div className={cn("p-4 bg-white/5 rounded-2xl border border-white/5 shadow-2xl group-hover:scale-110 transition-transform", color)}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-mono leading-none">{label}</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-5xl font-black text-white tracking-widest italic">{value}</h3>
                        {percentage !== undefined && (
                            <div className="flex flex-col gap-2 mt-4">
                                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.2em]">
                                    <span className="text-white/40">Sync Rate</span>
                                    <span className={color.split(' ').find((c: string) => c.includes('text-'))}>{percentage}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        className={cn("h-full", percentage === 100 ? "bg-emerald-500" : glow)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
