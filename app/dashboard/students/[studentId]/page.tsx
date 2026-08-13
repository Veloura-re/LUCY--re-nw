"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    GraduationCap, BookOpen, Clock, FileText,
    ArrowLeft, TrendingUp, ShieldAlert, MessageSquare,
    Save, Plus, Trash2, Calendar, CreditCard, ShieldCheck, Sparkles
} from "lucide-react";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, calculateAge } from "@/lib/utils";
import { format } from "date-fns";
import { IDCardModal } from "@/components/dashboard/id-card-modal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useReactToPrint } from "react-to-print";
import Image from "next/image";
import { StudentDossierPrint } from "@/components/dashboard/student-dossier-print";
import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard";
import { StudentTermSummary } from "@/components/dashboard/student-term-summary";

function StudentProfileContent() {
    const formatDate = (dateString: any, fmt: string) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "N/A";
            return format(date, fmt);
        } catch (error) {
            return "N/A";
        }
    };

    const { studentId } = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("academic");
    const [remarks, setRemarks] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [newRemark, setNewRemark] = useState("");
    const [newNote, setNewNote] = useState("");
    const [isAddingRemark, setIsAddingRemark] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showIDCard, setShowIDCard] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [gradesData, setGradesData] = useState<any[]>([]); // For grade/class selection
    const [editSelectedGradeId, setEditSelectedGradeId] = useState<string>(""); // Tracks grade in edit form
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [userRole, setUserRole] = useState<string>("");
    const searchParams = useSearchParams();

    useRealtimeDashboard(data?.student?.schoolId);
    const dossierRef = useRef<HTMLDivElement>(null);

    const isDirector = userRole === 'PRINCIPAL' || userRole === 'OWNER' || userRole === 'SUPERADMIN';
    const canAddRemark = isDirector || userRole === 'HOMEROOM';
    const canAddNote = isDirector || userRole === 'HOMEROOM';

    const handleExportDossier = useReactToPrint({
        contentRef: dossierRef,
        documentTitle: data?.student ? `${data.student.firstName}_${data.student.lastName}_Dossier` : 'Student_Dossier',
    });

    const isFetchingRef = useRef(false);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        if (!studentId) return;
        fetchStudentData();
    }, [studentId]);

    const fetchStudentData = async (retryAttempt = 0) => {
        if (isFetchingRef.current && retryAttempt === 0) return;
        isFetchingRef.current = true;
        try {
            const res = await fetch(`/api/school/students/${studentId}/report-card`);
            if (!res.ok) {
                if (retryAttempt < 2) {
                    await new Promise(resolve => setTimeout(resolve, 800 * (retryAttempt + 1)));
                    return fetchStudentData(retryAttempt + 1);
                }
                const errData: any = await res.json().catch(() => ({}));
                setData({ error: errData.error || "Student Record Not Found" });
                return;
            }
            const d: any = await res.json();
            setData(d);
            setRemarks(d.remarks || []);
            setNotes(d.internalNotes || []);
            setUserRole(d.userRole || "");

            // Pre-fill edit form
            if (d.student) {
                setEditForm({
                    firstName: d.student.firstName,
                    lastName: d.student.lastName,
                    email: d.student.email || "",
                    guardianName: d.student.guardianName || "",
                    guardianPhone: d.student.guardianPhone || "",
                    secondaryPhone: d.student.secondaryPhone || "",
                    photoUrl: d.student.photoUrl || "",
                    address: d.student.address || "",
                    dob: d.student.dob && !isNaN(new Date(d.student.dob).getTime()) ? format(new Date(d.student.dob), 'yyyy-MM-dd') : "",
                    age: d.student.dob && !isNaN(new Date(d.student.dob).getTime()) ? calculateAge(d.student.dob) : "",
                    gender: d.student.gender || "MALE",
                    studentCode: d.student.studentCode,
                    classId: d.student.classId || "",
                    gradeId: d.student.gradeId || "",
                });
                setEditSelectedGradeId(d.student.gradeId || "");
            }
        } catch (e: any) {
            console.error("fetchStudentData error:", e);
            if (retryAttempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 800 * (retryAttempt + 1)));
                return fetchStudentData(retryAttempt + 1);
            }
            setData({ error: "Cold-Start Interruption: Click Retry to re-connect." });
        } finally {
            isFetchingRef.current = false;
            setLoading(false);
        }
    };

    // Fetch grades for class selection if editing
    const fetchGradesData = async () => {
        const res = await fetch('/api/school/classes');
        const d: any = await res.json();
        if (d.grades) {
            setGradesData(d.grades);
        }
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/school/students', {
                method: 'PUT',
                body: JSON.stringify({ id: studentId, ...editForm })
            });

            if (res.ok) {
                toast.success("Student Dossier Synchronized");
                setIsEditing(false);
                fetchStudentData();
            } else {
                const errorData: any = await res.json();
                toast.error(errorData.error || "Connection Failure: Mutation Rejected");
            }
        } catch (err) {
            console.error(err);
            toast.error("Smart Link Failure: Request Timed Out");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddRemark = async () => {
        if (!newRemark.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/school/students/${studentId}/remarks`, {
                method: 'POST',
                body: JSON.stringify({ content: newRemark, term: "CURRENT" })
            });
            if (res.ok) {
                toast.success("Institutional Remark Synchronized");
                setNewRemark("");
                setIsAddingRemark(false);
                fetchStudentData();
            } else {
                toast.error("Connection Jammed: Remark Rejected");
            }
        } catch (e) {
            console.error(e);
            toast.error("Signal Lost: Remark dropped");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/school/students/${studentId}/notes`, {
                method: 'POST',
                body: JSON.stringify({ content: newNote })
            });
            if (res.ok) {
                toast.success("Confidential Note Encrypted");
                setNewNote("");
                setIsAddingNote(false);
                fetchStudentData();
            } else {
                toast.error("Security Breach: Note Rejected");
            }
        } catch (e) {
            console.error(e);
            toast.error("Smart Link Offline: Note lost");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRunAiAnalysis = async () => {
        setAnalyzing(true);
        try {
            const res = await fetch(`/api/school/students/${studentId}/ai-analysis`);
            if (res.ok) {
                const resData: any = await res.json();
                setAiAnalysis(resData.analysis);
                toast.success("AI Predictive Analysis Complete");
            } else {
                toast.error("Connection Jammed: AI Analysis Failed");
            }
        } catch (e) {
            toast.error("Smart Link Offline: AI Server unreachable");
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><SpringingLoader message="Synthesizing Student Dossier" /></div>;
    
    if (!data?.student) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-eduGreen-500/10 border border-eduGreen-500/30 flex items-center justify-center text-eduGreen-500 mb-2">
                <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide text-zinc-900 dark:text-white">
                {data?.error || "Student Record Unavailable"}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md">
                The institutional connection is re-establishing or the scholar record is unassigned.
            </p>
            <div className="flex items-center gap-3 mt-4">
                <Button
                    onClick={() => { setLoading(true); fetchStudentData(); }}
                    className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest h-11"
                >
                    Retry Connection
                </Button>
                <Button
                    onClick={() => router.push('/dashboard/students')}
                    variant="outline"
                    className="rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest h-11"
                >
                    Return to Registry
                </Button>
            </div>
        </div>
    );

    const student = data.student || {};
    const grades = Array.isArray(data.grades) ? data.grades : [];
    const assignments = Array.isArray(data.assignments) ? data.assignments : [];
    const attendance = data.attendance || { rate: 0, present: 0, absent: 0, total: 0 };

    const getPerformanceColor = (pct: number) => {
        if (pct >= 80) return { text: "text-emerald-500", border: "border-emerald-900/30", bg: "bg-emerald-900/10" };
        if (pct >= 60) return { text: "text-blue-500", border: "border-blue-900/30", bg: "bg-blue-900/10" };
        if (pct >= 40) return { text: "text-amber-600 dark:text-amber-500", border: "border-amber-900/30", bg: "bg-amber-900/10" };
        return { text: "text-rose-500", border: "border-rose-900/30", bg: "bg-rose-900/10" };
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-300 pb-20">
            {/* Hidden Print Target */}
            {data && data.student && (
                <div className="absolute -left-[9999px] top-0 overflow-hidden" aria-hidden="true">
                    <StudentDossierPrint
                        ref={dossierRef}
                        student={student}
                        grades={grades}
                        assignments={assignments}
                        attendance={attendance}
                        remarks={data.remarks || []}
                    />
                </div>
            )}
            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <Button
                    onClick={() => router.back()}
                    variant="ghost"
                    className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white font-black uppercase tracking-widest text-[10px] gap-2"
                >
                    <ArrowLeft className="w-4 h-4" /> Return to Registry
                </Button>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        onClick={() => setShowIDCard(true)}
                        className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-6 shadow-sm transition-all flex items-center gap-2"
                    >
                        <CreditCard className="w-4 h-4 text-eduGreen-400 dark:text-eduGreen-600" /> Print ID Card
                    </Button>
                    <Button
                        onClick={() => handleExportDossier()}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-6 flex items-center gap-2"
                    >
                        Export Full Dossier
                    </Button>
                    {isDirector && (
                        <Button
                            onClick={() => { setIsEditing(true); fetchGradesData(); }}
                            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-6 shadow-sm transition-all"
                        >
                            Edit Profile
                        </Button>
                    )}
                </div>
            </div>

            <IDCardModal
                isOpen={showIDCard}
                onClose={() => setShowIDCard(false)}
                user={student}
                type="STUDENT"
                schoolName={student.school?.name}
                schoolAddress={student.school?.address}
                schoolLogo={student.school?.logoUrl}
            />

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-900 dark:text-white max-w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2.5rem]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic">Edit Student Profile</DialogTitle>
                        <DialogDescription className="text-zinc-600 dark:text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Update registry information</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="md:col-span-2 flex justify-center py-4 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-2xl">
                            <ImageUpload value={editForm.photoUrl} onChange={(url) => setEditForm({ ...editForm, photoUrl: url })} bucket="avatars" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500 ml-2">First Name</label>
                            <Input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500 ml-2">Last Name</label>
                            <Input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500 ml-2">Email</label>
                            <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500 ml-2">Date of Birth</label>
                            <Input type="date" value={editForm.dob} onChange={e => setEditForm({ ...editForm, dob: e.target.value })} className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500 ml-2">Guardian Name</label>
                            <Input value={editForm.guardianName} onChange={e => setEditForm({ ...editForm, guardianName: e.target.value })} className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500 ml-2">Guardian Phone</label>
                            <Input value={editForm.guardianPhone} onChange={e => setEditForm({ ...editForm, guardianPhone: e.target.value })} className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500 ml-2">Secondary Phone (Optional)</label>
                            <Input value={editForm.secondaryPhone} onChange={e => setEditForm({ ...editForm, secondaryPhone: e.target.value })} className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500 ml-2">Edit Age (Auto-calculates DOB)</label>
                            <Input
                                type="number"
                                value={editForm.age}
                                onChange={e => {
                                    const age = e.target.value;
                                    const dob = format(new Date(new Date().getFullYear() - parseInt(age || "0"), 0, 1), 'yyyy-MM-dd');
                                    setEditForm({ ...editForm, age, dob });
                                }}
                                placeholder="Enter Age"
                                className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl"
                            />
                        </div>

                        {/* Grade / Class Assignment */}
                        <div className="md:col-span-2 border-t border-zinc-300 dark:border-zinc-800 pt-4 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500 ml-2">Class Assignment</label>
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    value={editSelectedGradeId}
                                    onValueChange={(gradeId: string) => {
                                        setEditSelectedGradeId(gradeId);
                                        setEditForm({ ...editForm, gradeId, classId: "" });
                                    }}
                                >
                                    <SelectTrigger className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl h-11">
                                        <SelectValue placeholder="Select Grade" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                                        {gradesData.map((g: any) => (
                                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={editForm.classId || ""}
                                    onValueChange={(classId: string) => setEditForm({ ...editForm, classId })}
                                    disabled={!editSelectedGradeId}
                                >
                                    <SelectTrigger className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl h-11">
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                                        {gradesData.find((g: any) => g.id === editSelectedGradeId)?.classes.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-black uppercase text-[10px] tracking-widest">Cancel</Button>
                            <Button type="submit" isLoading={submitting} className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl px-8">Save Changes</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Profile Info Card */}
            <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl border-zinc-200 dark:border-zinc-900 rounded-[3rem]  border-t-zinc-800/20">
                <div className="p-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-white dark:bg-zinc-950 border-2 border-eduGreen-900/30 flex items-center justify-center text-4xl font-black text-eduGreen-500 shadow-2xl relative overflow-hidden">
                            {student.photoUrl ? (
                                <Image src={student.photoUrl} alt="" fill sizes="128px" className="object-cover" />
                            ) : (
                                <>{student.firstName?.[0] || "S"}{student.lastName?.[0] || "T"}</>
                            )}
                            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-eduGreen-500 shadow-[0_0_15px_rgba(59,214,141,0.5)]" />
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                            <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight italic">
                                {student.firstName} <span className="text-zinc-700 not-italic ml-2">{student.lastName}</span>
                            </h1>
                            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-eduGreen-950/20 border border-eduGreen-900/30 text-[10px] font-black text-eduGreen-500 uppercase tracking-[0.2em] shadow-lg shadow-eduGreen-950/10">
                                Active Learner
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-6 text-[11px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-eduGreen-700" />
                                <span>{student.class?.grade?.name || "No Grade"} / {student.class?.name || "Unassigned"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-amber-700" />
                                <span>ID: {student.studentCode}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-700" />
                                <span>Enrolled: {formatDate(student.enrolledAt, 'MMM yyyy')} • {calculateAge(student.dob)}Y</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="p-6 bg-zinc-100/40 dark:bg-zinc-900/40 rounded-3xl border border-zinc-300 dark:border-zinc-800/80 text-center min-w-[120px]">
                            <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Attendance</div>
                            <div className="text-2xl font-black text-zinc-900 dark:text-white italic">
                                {attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0}%
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowIDCard(true)}
                            variant="outline"
                            className="h-full py-6 px-5 rounded-3xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100/40 dark:bg-zinc-900/40 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                            <CreditCard className="w-5 h-5 text-eduGreen-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Print ID Card</span>
                        </Button>
                    </div>
                </div>

                {student.parentLinks && student.parentLinks.length > 0 && (
                    <div className="px-10 pb-10 flex flex-wrap gap-4">
                        <div className="w-full text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-eduGreen-600" />
                            Verified Guardians (Official Link)
                        </div>
                        {student.parentLinks.map((link: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-300 dark:border-zinc-800 rounded-2xl group/parent hover:border-eduGreen-900/50 transition-all">
                                <Avatar className="h-8 w-8 border border-zinc-300 dark:border-zinc-800">
                                    <AvatarFallback className="text-[10px] font-black bg-white dark:bg-zinc-950 text-zinc-600">
                                        {link.parent?.name?.[0] || 'G'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-tight group-hover/parent:text-eduGreen-400 transition-colors">
                                        {link.parent?.name}
                                    </div>
                                    <div className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
                                        {link.parent?.email}
                                    </div>
                                </div>
                                <Link href={`/dashboard/messages?userId=${link.parent?.id}`}>
                                    <div className="ml-2 w-8 h-8 rounded-xl bg-white dark:bg-zinc-950 flex items-center justify-center text-zinc-700 hover:text-eduGreen-500 hover:bg-eduGreen-950/20 transition-all">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Tabs defaultValue="academic" className="space-y-8" onValueChange={setActiveTab}>
                <TabsList className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-900 p-1.5 rounded-2xl h-auto flex-wrap justify-start">
                    <TabsTrigger value="academic" className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-eduGreen-600 data-[state=active]:text-zinc-900 dark:text-white">Academic DNA</TabsTrigger>
                    <TabsTrigger value="terms" className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-eduGreen-600 data-[state=active]:text-zinc-900 dark:text-white">Term Summary</TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-eduGreen-600 data-[state=active]:text-zinc-900 dark:text-white">Biometric Log</TabsTrigger>
                    <TabsTrigger value="remarks" className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-eduGreen-600 data-[state=active]:text-zinc-900 dark:text-white">Institutional Remarks</TabsTrigger>
                    <TabsTrigger value="notes" className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-eduGreen-600 data-[state=active]:text-zinc-900 dark:text-white">Faculty Notes (Secure)</TabsTrigger>
                    <TabsTrigger value="ai" className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-zinc-900 dark:text-white flex items-center gap-2"><Sparkles className="w-3 h-3"/> AI Insights</TabsTrigger>
                </TabsList>

                {/* --- Academic Section --- */}
                <TabsContent value="academic" className="animate-in slide-in-from-bottom-4 duration-300">
                    <div className="grid lg:grid-cols-12 gap-8">
                        <Card className="lg:col-span-8 bg-zinc-100/30 dark:bg-zinc-900/30 backdrop-blur-md border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] ">
                            <CardHeader className="p-8 border-b border-zinc-300 dark:border-zinc-800/50 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-black text-zinc-900 dark:text-white italic">Execution <span className="text-zinc-700 not-italic ml-1">System</span></CardTitle>
                                    <CardDescription className="text-zinc-600 font-bold uppercase tracking-widest text-[9px] mt-1">Validated academic grade records</CardDescription>
                                </div>
                                <div className="hidden md:flex gap-1.5 h-6">
                                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1 bg-eduGreen-500/20 rounded-full" style={{ height: `${20 + i * 15}%` }} />)}
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 pb-4">
                                {/* Grade Trend SVG Chart */}
                                {grades.length > 1 && (
                                    <div className="mb-10 p-6 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 rounded-3xl border border-zinc-300 dark:border-zinc-800/50 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-eduGreen-500/5 to-transparent opacity-50" />
                                        <div className="flex items-center gap-2 mb-6">
                                            <TrendingUp className="w-3.5 h-3.5 text-eduGreen-500" />
                                            <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Efficiency Progression</span>
                                        </div>
                                        <div className="h-32 w-full relative">
                                            <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 100" preserveAspectRatio="none">
                                                <defs>
                                                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3BD68D" stopOpacity="0.4" />
                                                        <stop offset="100%" stopColor="#3BD68D" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                {/* Area under curve */}
                                                <path
                                                    d={`M 0 100 ${grades.map((g: any, i: number) => `L ${(i / (grades.length - 1)) * 1000} ${100 - (g.score / 100) * 100}`).join(' ')} L 1000 100 Z`}
                                                    fill="url(#lineGrad)"
                                                    className="transition-all duration-300"
                                                />
                                                {/* Line */}
                                                <path
                                                    d={grades.map((g: any, i: number) => `${i === 0 ? 'M' : 'L'} ${(i / (grades.length - 1)) * 1000} ${100 - (g.score / 100) * 100}`).join(' ')}
                                                    fill="none"
                                                    stroke="#3BD68D"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="drop-shadow-[0_0_8px_rgba(59,214,141,0.5)]"
                                                />
                                                {/* Data Points */}
                                                {grades.map((g: any, i: number) => (
                                                    <circle
                                                        key={i}
                                                        cx={(i / (grades.length - 1)) * 1000}
                                                        cy={100 - (g.score / 100) * 100}
                                                        r="6"
                                                        fill="#000"
                                                        stroke="#3BD68D"
                                                        strokeWidth="3"
                                                        className="hover:r-8 hover:fill-eduGreen-500 transition-all cursor-pointer"
                                                    />
                                                ))}
                                            </svg>
                                        </div>
                                    </div>
                                )}

                                <div className="divide-y divide-zinc-950 border-t border-zinc-200 dark:border-zinc-900/50 -mx-8">
                                    {grades.length === 0 ? (
                                        <div className="p-20 text-center opacity-40">
                                            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-zinc-800 dark:text-zinc-200" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">No validated records discovered</p>
                                        </div>
                                    ) : (
                                        grades.map((grade: any, i: number) => (
                                            <div key={i} className="p-8 flex items-center justify-between hover:bg-eduGreen-900/5 transition-all group">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 flex items-center justify-center group-hover:border-eduGreen-900/30 transition-colors">
                                                        <BookOpen className="w-5 h-5 text-zinc-800 dark:text-zinc-200 group-hover:text-eduGreen-500 transition-colors" />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-zinc-900 dark:text-white tracking-tight uppercase text-sm">{grade.subject?.name}</div>
                                                        <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{grade.exam?.title || "Class Assessment"}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8">
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mb-1">{formatDate(grade.createdAt, 'MMM dd')}</div>
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-900 text-[9px] font-black uppercase text-zinc-600 dark:text-zinc-500">
                                                            {grade.status}
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "w-16 h-16 rounded-2xl bg-white dark:bg-zinc-950 border flex flex-col items-center justify-center font-black italic shadow-inner",
                                                        grade.exam?.totalMarks ? getPerformanceColor((parseFloat(grade.score) / grade.exam.totalMarks) * 100).border : "border-zinc-200 dark:border-zinc-900"
                                                    )}>
                                                        <span className={cn(
                                                            "text-xl",
                                                            grade.exam?.totalMarks ? getPerformanceColor((parseFloat(grade.score) / grade.exam.totalMarks) * 100).text : "text-eduGreen-500"
                                                        )}>{grade.score}</span>
                                                        {grade.exam?.totalMarks && <span className="text-[9px] text-zinc-600 not-italic">/ {grade.exam.totalMarks}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="lg:col-span-4 space-y-8">
                            <Card className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] p-8">
                                <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-6">Subject Variance</h4>
                                <div className="space-y-6">
                                    {grades.length === 0 ? (
                                        <div className="text-center py-10 opacity-30 text-[9px] font-black uppercase tracking-widest">No Subject Data Available</div>
                                    ) : (
                                        // Calculate subject variance dynamically
                                        Array.from(new Set(grades.map((g: any) => g.subject?.name))).slice(0, 5).map((subjectName: any, i) => {
                                            const subjectGrades = grades.filter((g: any) => g.subject?.name === subjectName);
                                            const totalScore = subjectGrades.reduce((acc: number, curr: any) => {
                                                const pct = curr.exam?.totalMarks ? (parseFloat(curr.score) / curr.exam.totalMarks) * 100 : parseFloat(curr.score);
                                                return acc + pct;
                                            }, 0);
                                            const avg = Math.round(totalScore / subjectGrades.length);

                                            return (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex justify-between text-[10px] font-black uppercase">
                                                        <span className="text-zinc-600 dark:text-zinc-400">{subjectName}</span>
                                                        <span className={cn("text-zinc-900 dark:text-white", getPerformanceColor(avg).text)}>{avg}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-white dark:bg-zinc-950 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-900/50">
                                                        <div
                                                            className={cn("h-full rounded-full shadow-[0_0_8px_rgba(33,201,141,0.3)] transition-all duration-300", getPerformanceColor(avg).bg.replace('bg-', 'bg-').replace('/10', ''))}
                                                            style={{ width: `${avg}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="terms" className="animate-in slide-in-from-bottom-4 duration-300">
                    <StudentTermSummary data={data} />
                </TabsContent>

                {/* --- Attendance Section --- */}
                <TabsContent value="attendance" className="animate-in slide-in-from-bottom-4 duration-300">
                    <div className="grid lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-1 space-y-4">
                            <Card className="p-8 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] text-center">
                                <Clock className="w-8 h-8 text-eduGreen-500 mx-auto mb-4" />
                                <div className="text-4xl font-black text-zinc-900 dark:text-white italic">{attendance.present}</div>
                                <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mt-1">Days Present</div>
                            </Card>
                            <Card className="p-8 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] text-center">
                                <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-500 mx-auto mb-4" />
                                <div className="text-4xl font-black text-zinc-900 dark:text-white italic">{attendance.absent}</div>
                                <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mt-1">Unexcused Absence</div>
                            </Card>
                        </div>
                        <Card className="lg:col-span-3 bg-zinc-100/30 dark:bg-zinc-900/30 backdrop-blur-md border-zinc-200 dark:border-zinc-900 rounded-[2.5rem]">
                            <CardHeader className="p-8 border-b border-zinc-300 dark:border-zinc-800/50">
                                <CardTitle className="text-xl font-black text-zinc-900 dark:text-white italic">Temporal <span className="text-zinc-700 not-italic ml-1">Flow</span></CardTitle>
                                <CardDescription className="text-zinc-600 font-bold uppercase tracking-widest text-[9px] mt-1">Historical attendance records</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {attendance.history && attendance.history.length > 0 ? (
                                    <div className="divide-y divide-zinc-950">
                                        {attendance.history.map((record: any, i: number) => (
                                            <div key={i} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center border",
                                                        record.status === 'PRESENT' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                                            record.status === 'ABSENT' ? "bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-500" :
                                                                "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500"
                                                    )}>
                                                        <Calendar className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                                            {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.2em] mt-0.5">Verified Entry Node</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Badge className={cn(
                                                        "rounded-lg px-3 py-1 text-[8px] font-black uppercase tracking-widest border-0",
                                                        record.status === 'PRESENT' ? "bg-emerald-500/20 text-emerald-400" :
                                                            record.status === 'ABSENT' ? "bg-red-500/20 text-red-600 dark:text-red-400" :
                                                                "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                    )}>
                                                        {record.status}
                                                    </Badge>
                                                    <div className="text-[10px] font-mono text-zinc-700">08:00 AM</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center opacity-30">
                                        <p className="text-[10px] font-black uppercase tracking-widest">No Biometric Logs Discovered</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- Remarks Section --- */}
                <TabsContent value="remarks" className="animate-in slide-in-from-bottom-4 duration-300">
                    <Card className="bg-zinc-100/30 dark:bg-zinc-900/30 backdrop-blur-md border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] ">
                        <CardHeader className="p-8 border-b border-zinc-300 dark:border-zinc-800/50 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Institutional Narrative</CardTitle>
                                <CardDescription className="text-zinc-600 font-bold uppercase tracking-widest text-[9px] mt-1">Formal term observations for parents & students</CardDescription>
                            </div>
                            {canAddRemark && (
                                <Button
                                    onClick={() => setIsAddingRemark(!isAddingRemark)}
                                    className="bg-eduGreen-600/10 hover:bg-eduGreen-600/20 text-eduGreen-500 border border-eduGreen-900/30 rounded-xl h-10 font-black uppercase text-[9px] tracking-widest"
                                >
                                    <Plus className="w-3 h-3 mr-2" /> {isAddingRemark ? "Cancel" : "New Remark"}
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-8">
                            {isAddingRemark && (
                                <div className="mb-8 p-6 bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-900 rounded-3xl animate-in slide-in-from-top-4 duration-300">
                                    <textarea
                                        value={newRemark}
                                        onChange={(e) => setNewRemark(e.target.value)}
                                        placeholder="Enter formal academic or behavioral observation..."
                                        className="w-full bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-2xl p-4 text-sm font-bold text-zinc-900 dark:text-white focus:border-eduGreen-600 outline-none transition-all min-h-[120px]"
                                    />
                                    <div className="flex justify-end mt-4">
                                        <Button
                                            onClick={handleAddRemark}
                                            disabled={submitting || !newRemark.trim()}
                                            className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl h-10 px-6 font-black uppercase text-[9px] tracking-[0.2em]"
                                        >
                                            {submitting ? "Encrypting..." : "Publish Remark"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-6">
                                {remarks.length === 0 ? (
                                    <div className="py-20 text-center opacity-30">
                                        <FileText className="w-10 h-10 mx-auto mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No formal observations registered</p>
                                    </div>
                                ) : (
                                    remarks.map((r, i) => (
                                        <div key={i} className="p-8 bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-900/50 rounded-3xl relative">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 border border-zinc-300 dark:border-zinc-800">
                                                        <AvatarFallback className="text-[9px] font-black bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-500">{(r.teacher?.name && r.teacher.name[0]) || 'T'}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="text-[10px] font-black text-zinc-900 dark:text-white dark:text-zinc-100 uppercase tracking-tight">{r.teacher?.name}</div>
                                                        <div className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">Authorized Faculty</div>
                                                    </div>
                                                </div>
                                                <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">{formatDate(r.createdAt, 'MMM yyyy')}</div>
                                            </div>
                                            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 leading-relaxed italic pr-12">"{r.content}"</p>
                                            <div className="absolute bottom-6 right-8 text-[8px] font-black text-eduGreen-600/50 uppercase tracking-[0.2em]">Validated Node</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- Notes Section --- */}
                <TabsContent value="notes" className="animate-in slide-in-from-bottom-4 duration-300">
                    <Card className="bg-eduGreen-950/5 border-eduGreen-900/20 rounded-[2.5rem] ">
                        <CardHeader className="p-8 border-b border-eduGreen-900/10 flex flex-row items-center justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <ShieldAlert className="w-4 h-4 text-eduGreen-500" />
                                    <span className="text-[10px] font-black text-eduGreen-500 uppercase tracking-[0.3em]">Confidential Protocol</span>
                                </div>
                                <CardTitle className="text-xl font-black text-zinc-900 dark:text-white">Faculty Internal Data</CardTitle>
                                <CardDescription className="text-zinc-600 font-bold uppercase tracking-widest text-[9px] mt-1">Privileged observations NOT visible to parents or students</CardDescription>
                            </div>
                            {canAddNote && (
                                <Button
                                    onClick={() => setIsAddingNote(!isAddingNote)}
                                    className="bg-eduGreen-600/10 hover:bg-eduGreen-600/20 text-eduGreen-500 border border-eduGreen-900/30 rounded-xl h-10 font-black uppercase text-[9px] tracking-widest"
                                >
                                    <Plus className="w-3 h-3 mr-2" /> {isAddingNote ? "Cancel" : "Log internal Incident"}
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-8">
                            {isAddingNote && (
                                <div className="mb-8 p-6 bg-zinc-300 dark:bg-white/10 dark:bg-zinc-950/10 border border-eduGreen-900/20 rounded-3xl animate-in slide-in-from-top-4 duration-300">
                                    <textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Record confidential disciplinary or behavioral data..."
                                        className="w-full bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-2xl p-4 text-sm font-bold text-zinc-900 dark:text-white focus:border-eduGreen-600 outline-none transition-all min-h-[120px]"
                                    />
                                    <div className="flex justify-end mt-4">
                                        <Button
                                            onClick={handleAddNote}
                                            disabled={submitting || !newNote.trim()}
                                            className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl h-10 px-6 font-black uppercase text-[9px] tracking-[0.2em]"
                                        >
                                            {submitting ? "Securing..." : "Commit to Secure Node"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-6">
                                {(!data.internalNotes || data.internalNotes.length === 0) ? (
                                    <div className="py-20 text-center opacity-40">
                                        <MessageSquare className="w-10 h-10 mx-auto mb-4 text-eduGreen-900" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-eduGreen-900/50">Registry is clear of disciplinary incidents</p>
                                    </div>
                                ) : (
                                    data.internalNotes.map((n: any, i: number) => (
                                        <div key={i} className="p-8 bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-900/50 rounded-3xl relative">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 border border-zinc-300 dark:border-zinc-800">
                                                        <AvatarFallback className="text-[9px] font-black bg-zinc-100 dark:bg-zinc-900 text-eduGreen-500">{(n.author?.name && n.author.name[0]) || 'A'}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="text-[10px] font-black text-zinc-900 dark:text-white dark:text-zinc-100 uppercase tracking-tight">{n.author?.name}</div>
                                                        <div className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">Reporting Official</div>
                                                    </div>
                                                </div>
                                                <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">{formatDate(n.createdAt, 'MMM dd, HH:mm')}</div>
                                            </div>
                                            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 leading-relaxed italic pr-12">{n.content}</p>
                                            <div className="absolute top-8 right-8 text-eduGreen-500/20">
                                                <ShieldAlert className="w-6 h-6" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- AI Insights Section --- */}
                <TabsContent value="ai" className="animate-in slide-in-from-bottom-4 duration-300">
                    <Card className="bg-zinc-100/30 dark:bg-zinc-900/30 backdrop-blur-md border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] ">
                        <CardHeader className="p-8 border-b border-zinc-300 dark:border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <Sparkles className="w-4 h-4 text-blue-500" />
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Predictive Analytics Engine</span>
                                </div>
                                <CardTitle className="text-xl font-black text-zinc-900 dark:text-white italic">AI Risk <span className="text-zinc-600 dark:text-zinc-500 not-italic ml-1">Assessment</span></CardTitle>
                                <CardDescription className="text-zinc-600 font-bold uppercase tracking-widest text-[9px] mt-1">Synthesize academic and behavioral data into actionable insights</CardDescription>
                            </div>
                            {canAddNote && (
                                <Button
                                    onClick={handleRunAiAnalysis}
                                    disabled={analyzing}
                                    className="bg-blue-600 hover:bg-blue-500 text-zinc-900 dark:text-white rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest"
                                >
                                    {analyzing ? <SpringingLoader message="Analyzing..." /> : "Generate Analysis"}
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-8">
                            {!aiAnalysis && !analyzing && (
                                <div className="py-20 text-center opacity-40">
                                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-900" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting execution command</p>
                                </div>
                            )}
                            
                            {aiAnalysis && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-4 p-6 rounded-3xl border bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50" style={{
                                        borderColor: aiAnalysis.riskLevel === 'Low' ? '#059669' : aiAnalysis.riskLevel === 'Medium' ? '#d97706' : '#e11d48'
                                    }}>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500 mb-1">Overall Risk Level</div>
                                            <div className="text-2xl font-black text-zinc-900 dark:text-white">{aiAnalysis.riskLevel}</div>
                                            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 mt-2">{aiAnalysis.summary}</p>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Key Observations</h4>
                                            <ul className="space-y-3">
                                                {aiAnalysis.keyObservations?.map((obs: string, idx: number) => (
                                                    <li key={idx} className="flex gap-3 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                                        {obs}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Recommended Interventions</h4>
                                            <ul className="space-y-3">
                                                {aiAnalysis.recommendedInterventions?.map((int: string, idx: number) => (
                                                    <li key={idx} className="flex gap-3 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                                        {int}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
}

export default function StudentProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <SpringingLoader message="Accessing Identity Database" />
            </div>
        }>
            <StudentProfileContent />
        </Suspense>
    );
}
