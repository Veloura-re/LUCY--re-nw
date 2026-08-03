"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { GraduationCap, Sparkles, Plus, Loader2, CheckCircle2, User, School as SchoolIcon, AlertCircle, MessageSquare, ArrowLeft, Shield, Search, FileText, CreditCard, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { UpcomingEventsWidget } from "./upcoming-events";
import { DashboardGreeting } from "./dashboard-greeting";
import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard";
import { createBrowserClient } from "@supabase/ssr";

import { toast } from "sonner";

interface VerifiedStudent {
    id: string;
    firstName: string;
    lastName: string;
    schoolName: string;
    gradeLevel: number;
    gradeName?: string;
}

interface RecoveryDetails {
    message?: string;
    help?: string;
    format?: string;
}

function formatStudentCodeInput(val: string): string {
    const raw = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (raw.length <= 2) return raw;
    if (raw.startsWith('ST')) {
        const rest = raw.slice(2);
        if (rest.length <= 8) {
            return `ST-${rest}`;
        }
        return `ST-${rest.slice(0, 8)}-${rest.slice(8, 12)}`;
    }
    if (raw.length <= 8) {
        return `ST-${raw}`;
    }
    return `ST-${raw.slice(0, 8)}-${raw.slice(8, 12)}`;
}

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    schoolName: string;
    gradeLevel: number;
    studentCode?: string;
    grade?: { level: number };
    school?: { name: string };
    schoolId: string;
    stats?: {
        attendancePct: string;
        averageScore: string;
        invoiceCount: string | number;
        totalOutstanding: string;
        assignmentStats?: {
            total: number;
            completed: number;
        };
    };
    recentInvoices?: any[];
    userId?: string;
    class?: { homeroomTeacherId?: string };
}

export function ParentView({ user, childrenData }: { user: any, childrenData: any[] }) {
    const [students, setStudents] = useState<Student[]>(childrenData || []);
    const [activeChildId, setActiveChildId] = useState<string | null>(childrenData?.[0]?.id || null);
    
    const activeChild = students.find(s => s.id === activeChildId);
    useRealtimeDashboard(activeChild?.schoolId);

    const [loadingStudents] = useState(false);
    const [isAdding, setIsAdding] = useState(childrenData?.length === 0);
    const [code, setCode] = useState("");
    const [status, setStatus] = useState<'IDLE' | 'VERIFYING' | 'CONFIRMING' | 'LINKING' | 'SUCCESS'>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [recovery, setRecovery] = useState<RecoveryDetails | null>(null);
    const [foundStudent, setFoundStudent] = useState<VerifiedStudent | null>(null);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [staffSearchQuery, setStaffSearchQuery] = useState("");
    const [staffResults, setStaffResults] = useState<any[]>([]);
    const [searchingStaff, setSearchingStaff] = useState(false);
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!activeChildId && students.length > 0) {
            setActiveChildId(students[0].id);
        }
    }, [students, activeChildId]);

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatStudentCodeInput(e.target.value);
        setCode(formatted);
        if (error) {
            setError(null);
            setRecovery(null);
        }
    };

    const verifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code) return;
        setStatus('VERIFYING');
        setError(null);
        setRecovery(null);
        try {
            const res = await fetch('/api/parent/link-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentCode: code, confirm: false })
            });
            const data = (await res.json()) as any;
            if (!res.ok) {
                if (data.recovery) setRecovery(data.recovery);
                throw new Error(data.error || "Failed to verify student code");
            }
            setFoundStudent(data.student);
            setStatus('CONFIRMING');
        } catch (err: any) {
            setError(err.message);
            setStatus('IDLE');
        }
    };

    const confirmLink = async () => {
        if (!foundStudent) return;
        setStatus('LINKING');
        try {
            const res = await fetch('/api/parent/link-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentCode: code, confirm: true })
            });
            const data = (await res.json()) as any;
            if (!res.ok) {
                throw new Error(data.error || "Failed to link student");
            }
            toast.success(data.message || "Student successfully linked to your account!");
            setStatus('SUCCESS');
            setTimeout(() => {
                router.refresh();
                setIsAdding(false);
                setCode("");
                setStatus('IDLE');
                setFoundStudent(null);
            }, 1800);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            setStatus('CONFIRMING');
        }
    };

    const searchStaff = async (q: string) => {
        setStaffSearchQuery(q);
        if (q.length < 2) {
            setStaffResults([]);
            return;
        }
        setSearchingStaff(true);
        try {
            const res = await fetch(`/api/parent/staff?q=${encodeURIComponent(q)}`);
            const data = (await res.json()) as any;
            if (data.staff) setStaffResults(data.staff);
        } catch (e) {
            console.error(e);
        } finally {
            setSearchingStaff(false);
        }
    };

    const startStaffChat = async (staffId: string) => {
        try {
            const res = await fetch('/api/messages/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: staffId })
            });
            const data = (await res.json()) as any;
            if (data.room) {
                router.push(`/dashboard/messages?roomId=${data.room.id}`);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-3.5 sm:space-y-8 md:space-y-12 animate-in fade-in duration-300 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2.5 sm:gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-3 sm:pb-6 md:pb-10">
                <DashboardGreeting name={user?.name || 'Guardian'} role={user?.role} gender={user?.gender} />

                {students.length > 0 && !isAdding && (
                    <div className="flex items-center gap-2 sm:gap-3 mb-0.5 w-full sm:w-auto">
                        <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white h-8 sm:h-10 md:h-14 px-2.5 sm:px-4 md:px-8 rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-[10px] uppercase tracking-widest transition-all bg-transparent flex-1 sm:flex-initial"
                                >
                                    <MessageSquare className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4 text-eduGreen-500" /> Contact Staff
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-xl sm:rounded-[2.5rem] p-0 overflow-hidden max-w-lg shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-eduGreen-500/50 to-transparent" />
                                <DialogHeader className="p-4 sm:p-8 pb-2 sm:pb-4">
                                    <DialogTitle className="text-lg sm:text-2xl font-medium text-zinc-900 dark:text-white uppercase tracking-tight italic">Staff <span className="text-eduGreen-500">Discovery</span></DialogTitle>
                                    <p className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-1 sm:mt-2 leading-relaxed">Initiate smart link with institutional educators and directors.</p>
                                </DialogHeader>
                                <div className="p-4 sm:p-8 pt-0 space-y-3 sm:space-y-6">
                                    <div className="relative group">
                                        <Search className="absolute left-3.5 sm:left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-700 group-focus-within:text-eduGreen-500 transition-all" />
                                        <Input
                                            placeholder="Search Teacher or Director Name..."
                                            className="pl-9 sm:pl-14 h-9 sm:h-16 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-900 rounded-lg sm:rounded-2xl text-zinc-900 dark:text-white font-medium text-[11px] sm:text-xs focus:border-eduGreen-900 focus:bg-zinc-100 dark:bg-zinc-900 transition-all"
                                            value={staffSearchQuery}
                                            onChange={(e) => searchStaff(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1.5 sm:space-y-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto custom-scrollbar pr-1 sm:pr-2">
                                        {searchingStaff ? (
                                            <div className="py-6 sm:py-12 flex justify-center">
                                                <Loader2 className="w-5 h-5 sm:w-8 sm:h-8 text-eduGreen-500 animate-spin opacity-50" />
                                            </div>
                                        ) : staffResults.length > 0 ? (
                                            staffResults.map(staff => (
                                                <button
                                                    key={staff.id}
                                                    onClick={() => startStaffChat(staff.id)}
                                                    className="w-full flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 bg-zinc-100/40 dark:bg-zinc-900/40 rounded-lg sm:rounded-2xl border border-transparent hover:border-eduGreen-900/30 hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all text-left group"
                                                >
                                                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center font-medium text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-500 group-hover:text-eduGreen-500 transition-all shrink-0">
                                                        {staff.name[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-white uppercase tracking-tight truncate">{staff.name}</div>
                                                        <div className="text-[7px] sm:text-[8px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                                            <div className={cn("w-1.5 h-1.5 rounded-full", staff.role === 'PRINCIPAL' ? "bg-amber-500" : "bg-eduGreen-500")} />
                                                            {staff.role}
                                                        </div>
                                                    </div>
                                                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-800 dark:text-zinc-200 group-hover:text-eduGreen-500 transition-all shrink-0" />
                                                </button>
                                            ))
                                        ) : staffSearchQuery.length >= 2 ? (
                                            <div className="py-6 sm:py-12 text-center">
                                                <p className="text-[8px] sm:text-[10px] font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">No matching staff discovered</p>
                                            </div>
                                        ) : (
                                            <div className="py-6 sm:py-12 text-center">
                                                <Shield className="w-5 h-5 sm:w-8 sm:h-8 text-zinc-900 dark:text-white mx-auto mb-2 sm:mb-4" />
                                                <p className="text-[8px] sm:text-[10px] font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Staff Index Standby</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Button
                            onClick={() => setIsAdding(true)}
                            className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-8 sm:h-10 md:h-14 px-3 sm:px-4 md:px-8 rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 shadow-eduGreen-900/20 flex-1 sm:flex-initial"
                        >
                            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Link Student
                        </Button>
                    </div>
                )}
            </div>

            {/* Loading State */}
            {loadingStudents ? (
                <div className="min-h-[60vh] flex flex-col items-center justify-center">
                    <SpringingLoader message="Synchronizing Family Terminal" />
                </div>
            ) : isAdding ? (
                <div className="max-w-2xl mx-auto py-6 sm:py-12">
                    <Card className="relative bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-[3rem] overflow-hidden shadow-2xl border-t-zinc-800/20">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-eduGreen-600 via-emerald-500 to-transparent" />

                        <CardHeader className="p-4 sm:p-12 pb-3 sm:pb-6">
                            <div className="flex justify-between items-start mb-4 sm:mb-8">
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsAdding(false)}
                                    className="p-0 h-auto hover:bg-transparent text-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors group/back"
                                >
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center group-hover/back:border-eduGreen-500 transition-all">
                                            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </div>
                                        <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-widest mt-0.5">Abort</span>
                                    </div>
                                </Button>
                                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-zinc-100 dark:bg-zinc-900 rounded-xl sm:rounded-2xl flex items-center justify-center border border-zinc-300 dark:border-zinc-800 shadow-xl">
                                    <GraduationCap className="h-5 w-5 sm:h-8 sm:w-8 text-eduGreen-500" />
                                </div>
                            </div>
                            <CardTitle className="text-xl sm:text-2xl md:text-4xl font-medium text-zinc-900 dark:text-white tracking-tight">Student Authentication</CardTitle>
                            <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[8px] sm:text-[9px] mt-1.5 sm:mt-3">
                                Enter the tactical student identifier provided by the institution
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="px-4 sm:px-12 pb-6 sm:pb-12 space-y-4 sm:space-y-8">
                            {status === 'SUCCESS' ? (
                                <div className="text-center py-6 sm:py-12 animate-in zoom-in duration-300">
                                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-eduGreen-950/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-eduGreen-900/50">
                                        <CheckCircle2 className="w-7 h-7 sm:w-10 sm:h-10 text-eduGreen-500" />
                                    </div>
                                    <h3 className="text-lg sm:text-2xl font-medium text-zinc-900 dark:text-white uppercase tracking-tight">Protocol Established</h3>
                                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-[8px] sm:text-[10px] mt-2 sm:mt-3">Synchronizing family dashboard...</p>
                                </div>
                            ) : (status === 'CONFIRMING' || status === 'LINKING') && foundStudent ? (
                                <div className="bg-zinc-100/20 dark:bg-zinc-900/20 rounded-xl sm:rounded-[2rem] p-4 sm:p-8 border border-zinc-200 dark:border-zinc-900 animate-in fade-in slide-in-from-bottom-8">
                                    <div className="grid gap-3 sm:gap-4">
                                        <div className="flex items-center gap-3 sm:gap-5 p-3.5 sm:p-6 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-900">
                                            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-300 dark:border-zinc-800 shrink-0">
                                                <User className="h-5 w-5 sm:h-7 sm:w-7 text-zinc-600 dark:text-zinc-500" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] sm:text-[9px] font-medium text-zinc-700 uppercase tracking-widest">Full Name</p>
                                                <p className="text-base sm:text-xl font-medium text-zinc-900 dark:text-white tracking-tight">{foundStudent.firstName} {foundStudent.lastName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 sm:gap-5 p-3.5 sm:p-6 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-900">
                                            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-300 dark:border-zinc-800 shrink-0">
                                                <SchoolIcon className="h-5 w-5 sm:h-7 sm:w-7 text-zinc-600 dark:text-zinc-500" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] sm:text-[9px] font-medium text-zinc-700 uppercase tracking-widest">Institutional Context</p>
                                                <p className="text-base sm:text-xl font-medium text-zinc-900 dark:text-white tracking-tight">{foundStudent.schoolName} • Grade {foundStudent.gradeLevel}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-[9px] sm:text-[10px] font-medium text-red-600 dark:text-red-500 uppercase tracking-[0.1em] flex items-center gap-2 sm:gap-3">
                                            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> {error}
                                        </div>
                                    )}

                                    <div className="flex gap-2.5 sm:gap-4 mt-6 sm:mt-10">
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setStatus('IDLE'); setFoundStudent(null); }}
                                            className="flex-1 h-10 sm:h-16 bg-zinc-100/50 dark:bg-zinc-900/50 hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-600 hover:text-zinc-900 dark:hover:text-white rounded-xl sm:rounded-2xl font-medium text-[9px] sm:text-[10px] uppercase tracking-[0.2em]"
                                        >
                                            Decline
                                        </Button>
                                        <Button
                                            onClick={confirmLink}
                                            className="flex-1 h-10 sm:h-16 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl sm:rounded-2xl font-medium text-[9px] sm:text-[10px] uppercase tracking-[0.2em]"
                                            disabled={status === 'LINKING'}
                                        >
                                            {status === 'LINKING' ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : "Accept Protocol"}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={verifyCode} className="space-y-4 sm:space-y-8">
                                    <div className="space-y-2 sm:space-y-5">
                                        <label className="text-[8px] sm:text-[10px] font-medium text-zinc-700 uppercase tracking-[0.2em] sm:tracking-[0.3em] ml-2 sm:ml-3">Digital Student Code</label>
                                        <Input
                                            placeholder="ST-A1B2C3D4-2026"
                                            value={code}
                                            onChange={handleCodeChange}
                                            className="text-center text-base sm:text-3xl font-mono font-medium tracking-[0.15em] sm:tracking-[0.25em] uppercase h-11 sm:h-20 bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-900 text-zinc-900 dark:text-white focus:border-eduGreen-600 transition-all border-2 rounded-xl sm:rounded-[2rem]"
                                            maxLength={20}
                                            required
                                            disabled={status === 'VERIFYING'}
                                        />
                                    </div>

                                    {error && (
                                        <div className="p-3.5 sm:p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-left space-y-1">
                                            <p className="text-[10px] sm:text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                            </p>
                                            {recovery?.message && (
                                                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 pl-6">
                                                    {recovery.message}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="pt-2 sm:pt-4">
                                        <Button
                                            type="submit"
                                            className="w-full h-10 sm:h-16 bg-white text-black hover:bg-zinc-200 rounded-lg sm:rounded-2xl font-medium text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all"
                                            disabled={status === 'VERIFYING' || !code}
                                        >
                                            {status === 'VERIFYING' ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : "Initiate Verification"}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : students.length > 0 ? (
                <>
                    <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                        {students.map((child) => (
                            <Card key={child.id} className="group relative bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-[3rem] overflow-hidden hover:border-eduGreen-900/40 transition-all border-t-zinc-800/20 shadow-xl sm:shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-eduGreen-600 via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-4">
                                    <div className="flex items-start justify-between gap-3 sm:gap-6 mb-2 sm:mb-4">
                                        <div className="w-9 h-9 sm:w-14 sm:h-14 bg-zinc-100 dark:bg-zinc-900 rounded-lg sm:rounded-2xl flex items-center justify-center border border-zinc-300 dark:border-zinc-800 shadow-md sm:shadow-xl group-hover:border-eduGreen-900/20 transition-all shrink-0">
                                            <span className="text-base sm:text-xl font-medium text-eduGreen-500">{child.firstName[0]}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 sm:gap-2">
                                            <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 text-[7px] sm:text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest group-hover:text-eduGreen-600 group-hover:border-eduGreen-900/20 transition-all">
                                                Active Profile
                                            </div>
                                            <span className="text-[7px] sm:text-[8px] font-mono text-zinc-700 font-medium uppercase tracking-wider">
                                                {child.studentCode}
                                            </span>
                                        </div>
                                    </div>
                                    <CardTitle className="text-base sm:text-xl md:text-2xl font-medium text-zinc-900 dark:text-white transition-colors tracking-tight leading-tight">{child.firstName} {child.lastName}</CardTitle>
                                    <div className="flex items-center gap-2 sm:gap-4 mt-1 sm:mt-2">
                                        <span className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Grade {child.grade?.level || "N/A"}</span>
                                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900" />
                                        <span className="text-[7px] sm:text-[9px] font-medium text-eduGreen-800 uppercase tracking-tighter truncate max-w-[140px]">{child.school?.name}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3.5 sm:p-6 pt-1 sm:pt-2 space-y-2.5 sm:space-y-4">
                                    <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
                                        <div className="p-2.5 sm:p-4 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-lg sm:rounded-2xl border border-zinc-200 dark:border-zinc-900">
                                            <p className="text-[7px] sm:text-[8px] font-medium text-zinc-700 uppercase tracking-widest mb-1 sm:mb-2">Attendance</p>
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-eduGreen-500 animate-pulse shadow-[0_0_10px_rgba(33,201,141,0.5)]" />
                                                <span className="text-sm sm:text-lg font-medium text-zinc-900 dark:text-white">{child.stats?.attendancePct || "100.0"}%</span>
                                            </div>
                                        </div>
                                        <div className="p-2.5 sm:p-4 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-lg sm:rounded-2xl border border-zinc-200 dark:border-zinc-900">
                                            <p className="text-[7px] sm:text-[8px] font-medium text-zinc-700 uppercase tracking-widest mb-1 sm:mb-2">Academic AVG</p>
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-eduGreen-500" />
                                                <span className="text-sm sm:text-lg font-medium text-zinc-900 dark:text-white">{child.stats?.averageScore || "0.0"}%</span>
                                            </div>
                                        </div>
                                        <div className="p-2.5 sm:p-4 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-lg sm:rounded-2xl border border-zinc-200 dark:border-zinc-900">
                                            <p className="text-[7px] sm:text-[8px] font-medium text-zinc-700 uppercase tracking-widest mb-1 sm:mb-2">Unpaid Invoices</p>
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <div className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full", Number(child.stats?.invoiceCount) > 0 ? "bg-amber-500 animate-pulse" : "bg-zinc-200 dark:bg-zinc-800")} />
                                                <span className="text-sm sm:text-lg font-medium text-zinc-900 dark:text-white">{child.stats?.invoiceCount || "0"}</span>
                                            </div>
                                        </div>
                                        <Link 
                                            href={`/dashboard/parent/homework?studentId=${child.id}`}
                                            className="block p-2.5 sm:p-4 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-lg sm:rounded-2xl border border-zinc-200 dark:border-zinc-900 hover:border-eduGreen-500/30 hover:bg-eduGreen-500/5 transition-all group/hw"
                                        >
                                            <p className="text-[7px] sm:text-[8px] font-medium text-zinc-700 uppercase tracking-widest mb-1 sm:mb-2 group-hover/hw:text-eduGreen-500 transition-colors">Homework</p>
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <ClipboardCheck className="w-3 h-3 sm:w-4 sm:h-4 text-eduGreen-500" />
                                                <span className="text-sm sm:text-lg font-medium text-zinc-900 dark:text-white">
                                                    {child.stats?.assignmentStats?.completed || 0}/{child.stats?.assignmentStats?.total || 0}
                                                </span>
                                            </div>
                                        </Link>
                                    </div>

                                    {(child.recentInvoices?.length ?? 0) > 0 && (
                                        <div className="pt-1 sm:pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="flex items-center justify-between mb-2 sm:mb-3 px-1">
                                                <h4 className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Recent Invoices</h4>
                                                <div className="h-px flex-1 bg-zinc-100/50 dark:bg-zinc-900/50 mx-3 sm:mx-4" />
                                            </div>
                                            <div className="space-y-1.5 sm:space-y-2">
                                                {child.recentInvoices?.map((inv: any) => (
                                                    <div key={inv.id} className="group/inv flex items-center justify-between p-2 sm:p-3 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-900 rounded-lg sm:rounded-xl hover:border-eduGreen-900/20 transition-all">
                                                        <div className="flex items-center gap-2 sm:gap-3">
                                                            <div className={cn(
                                                                "w-1.5 h-1.5 rounded-full",
                                                                inv.status === 'PAID' ? "bg-eduGreen-500" : "bg-amber-500 animate-pulse"
                                                            )} />
                                                            <div>
                                                                <div className="text-[8px] sm:text-[10px] font-medium text-zinc-900 dark:text-white uppercase tracking-tight">Invoice #{inv.id.slice(-6).toUpperCase()}</div>
                                                                <div className="text-[7px] sm:text-[8px] font-medium text-zinc-600 uppercase tracking-widest">{mounted ? new Date(inv.createdAt).toLocaleDateString() : "---"}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-[9px] sm:text-[11px] font-medium text-zinc-900 dark:text-white italic">${Number(inv.amount).toFixed(2)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                                        <Link href={`/dashboard/reports/${child.id}`}>
                                            <Button className="w-full h-8 sm:h-12 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] border border-zinc-200 dark:border-zinc-900 hover:border-zinc-700 transition-all shadow-md">
                                                Performance
                                            </Button>
                                        </Link>
                                        <Link href={`/dashboard/books?studentId=${child.id}`}>
                                            <Button className="w-full h-8 sm:h-12 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] border border-zinc-200 dark:border-zinc-900 hover:border-zinc-700 transition-all shadow-md">
                                                Bookshelf
                                            </Button>
                                        </Link>
                                        <Link href={`/dashboard/parent/homework?studentId=${child.id}`}>
                                            <Button className="w-full h-8 sm:h-12 bg-eduGreen-900/10 hover:bg-eduGreen-900/20 text-eduGreen-500 hover:text-eduGreen-400 rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] border border-eduGreen-900/20 hover:border-eduGreen-800/30 transition-all">
                                                Homework
                                            </Button>
                                        </Link>
                                    </div>

                                    {(child.userId || child.class?.homeroomTeacherId) && (
                                        <div className="grid gap-1.5 sm:gap-3 pt-1 sm:pt-2">
                                            <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                                                {child.userId ? (
                                                    <Link href={`/dashboard/messages?userId=${child.userId}`}>
                                                        <Button className="w-full h-8 sm:h-12 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] border border-zinc-200 dark:border-zinc-900 hover:border-zinc-700 transition-all shadow-md">
                                                            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> {child.firstName}
                                                        </Button>
                                                    </Link>
                                                ) : <div />}
                                                {child.class?.homeroomTeacherId ? (
                                                    <Link href={`/dashboard/messages?userId=${child.class.homeroomTeacherId}`}>
                                                        <Button className="w-full h-8 sm:h-12 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] border border-zinc-200 dark:border-zinc-900 hover:border-zinc-700 transition-all shadow-md">
                                                            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Teacher
                                                        </Button>
                                                    </Link>
                                                ) : <div />}
                                            </div>
                                            <Link href={`/dashboard/parent/authorizations?studentId=${child.id}`}>
                                                <Button className="w-full h-8 sm:h-12 bg-white dark:bg-zinc-950 hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] border border-zinc-200 dark:border-zinc-900 hover:border-zinc-800 transition-all shadow-md">
                                                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Request Leave Authorization
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-6 sm:mt-12">
                        <UpcomingEventsWidget />
                    </div>
                </>
            ) : (
                <div className="py-10 sm:py-20 text-center bg-white/20 dark:bg-zinc-950/20 rounded-xl sm:rounded-[3rem] border border-dashed border-zinc-200 dark:border-zinc-900/60 max-w-xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 p-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-100 dark:bg-zinc-900 rounded-xl sm:rounded-2xl flex items-center justify-center border border-zinc-300 dark:border-zinc-800 mx-auto shadow-xl">
                        <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-eduGreen-500" />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <h3 className="text-base sm:text-xl font-medium text-zinc-900 dark:text-white tracking-tight">No Linked Students</h3>
                        <p className="text-zinc-600 dark:text-zinc-500 font-medium text-[8px] sm:text-[10px] uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                            To view homework assignments, attendance, billing, and report cards, please link a student profile to this guardian node.
                        </p>
                    </div>
                    <Button 
                        onClick={() => setIsAdding(true)}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-9 sm:h-12 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold text-[8px] sm:text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                        Link Student Profile
                    </Button>
                </div>
            )}
        </div>
    );
}

