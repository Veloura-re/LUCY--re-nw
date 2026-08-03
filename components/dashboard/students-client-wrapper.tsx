"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Search, BookOpen, GraduationCap, Users, MessageSquare, Shield, Filter, Calendar, ChevronRight, Trash2, FileText, CreditCard, Printer, Copy, Check } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReactToPrint } from "react-to-print";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import { format } from "date-fns";
import Image from "next/image";
import { PenTool } from "lucide-react";
import dynamic from 'next/dynamic';
import { toast } from "sonner";

const StudentRegistryPrint = dynamic(() => import('@/components/dashboard/student-registry-print').then(m => m.StudentRegistryPrint), { ssr: false });
const ConfirmationModal = dynamic(() => import('@/components/ui/confirmation-modal').then(m => m.ConfirmationModal), { ssr: false });
const AlertModal = dynamic(() => import('@/components/ui/confirmation-modal').then(m => m.AlertModal), { ssr: false });
const GradeStudentModal = dynamic(() => import('@/components/dashboard/grade-student-modal').then(m => m.GradeStudentModal), { ssr: false });

interface StudentsClientWrapperProps {
    initialStudents: any[];
    initialGrades: any[];
    me?: any;
}

export default function StudentsClientWrapper({ initialStudents, initialGrades, me }: StudentsClientWrapperProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newStudent, setNewStudent] = useState({
        firstName: "", lastName: "", grade: "", classId: "", email: "",
        gender: "", dob: "", age: "", address: "", guardianName: "", guardianPhone: "", secondaryPhone: "", photoUrl: ""
    });
    const [students, setStudents] = useState<any[]>(initialStudents || []);
    const [grades] = useState<any[]>(initialGrades || []);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [filterClassId, setFilterClassId] = useState<string>("ALL");
    const [sortBy, setBy] = useState<"NAME" | "CLASS">("NAME");
    const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;

    // Deletion Modal
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });

    // Grading Modal
    const [gradingStudent, setGradingStudent] = useState<any>(null);
    const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

    const handleCopyCode = (e: React.MouseEvent, student: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (!student.studentCode) return;
        navigator.clipboard.writeText(student.studentCode);
        setCopiedCodeId(student.id);
        toast.success(`Access code ${student.studentCode} copied to clipboard!`, {
            description: `Share this code with ${student.firstName}'s guardian for direct portal onboarding.`
        });
        setTimeout(() => setCopiedCodeId(null), 2500);
    };

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `student_registry_${new Date().toISOString().slice(0, 10)}`,
    });

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/school/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStudent)
            });

            if (res.ok) {
                const data = await res.json() as any;
                setIsAdding(false);
                setNewStudent({
                    firstName: "", lastName: "", grade: "", classId: "", email: "",
                    gender: "", dob: "", age: "", address: "", guardianName: "", guardianPhone: "", secondaryPhone: "", photoUrl: ""
                });
                // Invalidate cache implicitly through revalidation or refresh
                // For immediate UI update, we add it to the list
                setStudents(prev => [data.student, ...prev]);
                
                if (data.token) {
                    if (data.emailSent === false) {
                        setAlertConfig({ title: "Email Delivery Failed", message: `The system could not deliver the email. Share this token manually: ${data.token}`, isOpen: true, variant: "error" });
                    } else {
                        setAlertConfig({ title: "Invite Sent", message: `An invitation has been sent to the student. Please remind them to check their spam/junk folder.`, isOpen: true, variant: "success" });
                    }
                } else {
                    setAlertConfig({ title: "Student Enrolled", message: "Student record has been created successfully.", isOpen: true, variant: "success" });
                }
            } else {
                const errData = await res.json().catch(() => ({})) as any;
                setAlertConfig({ 
                    title: "Enrollment Failed", 
                    message: errData?.error || "Failed to create student record. Please check the fields and try again.", 
                    isOpen: true, 
                    variant: "error" 
                });
            }
        } catch (e: any) {
            console.error(e);
            setAlertConfig({ 
                title: "Network Error", 
                message: e?.message || "An unexpected error occurred while saving the student.", 
                isOpen: true, 
                variant: "error" 
            });
        } finally {
            await new Promise(resolve => setTimeout(resolve, 800));
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        setConfirmDeleteId(id);
    };

    const executeDelete = async () => {
        if (!confirmDeleteId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/school/students?id=${confirmDeleteId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                const data = await res.json() as any;
                if (data.pendingApproval) {
                    setAlertConfig({ title: "Request Submitted", message: "A request has been sent to the Owner for approval.", isOpen: true, variant: "success" });
                } else {
                    setStudents(prev => prev.filter(s => s.id !== confirmDeleteId));
                    setAlertConfig({ title: "Student Record Archived", message: "The database has successfully purged the selected entity.", isOpen: true, variant: "success" });
                }
            } else {
                setAlertConfig({ title: "Purge Failed", message: "System locked. Unable to delete active student record.", isOpen: true, variant: "error" });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setConfirmDeleteId(null);
            setLoading(false);
        }
    };

    const isMounted = useRef(false);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                sortBy,
                sortDir,
                ...(filterClassId !== "ALL" && { classId: filterClassId }),
                ...(activeSearch && { search: activeSearch })
            });
            const res = await fetch(`/api/school/students?${params.toString()}`);
            if (res.ok) {
                const data = await res.json() as any;
                setStudents(data.students);
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages || 1);
                }
            }
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            // On first mount, initialStudents already has up to limit items. 
            // We just need to estimate totalPages if not provided. We'll leave it as 1 or dynamically adjust on first sort/search.
            return;
        }
        fetchStudents();
    }, [page, activeSearch, filterClassId, sortBy, sortDir]);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setPage(1);
        setActiveSearch(searchTerm);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-3.5 sm:space-y-8 md:space-y-12 animate-in fade-in duration-500 relative z-10 pb-12 sm:pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-3 sm:pb-10">
                <div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Student <span className="text-eduGreen-500 italic">Registry</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[8px] sm:text-xs mt-1 sm:mt-3">Active Enrollment & Records</p>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <Button
                        onClick={() => handlePrint()}
                        className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white h-9 sm:h-14 px-3 sm:px-6 rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] border border-zinc-200 dark:border-zinc-900 hover:border-zinc-700 transition-all shadow-md"
                    >
                        <Printer className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Print Registry
                    </Button>
                    <Button
                        onClick={() => setIsAdding(true)}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-9 sm:h-14 px-4 sm:px-8 rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-xl shadow-eduGreen-900/20 transition-all active:scale-95"
                    >
                        <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Enrol Student
                    </Button>
                </div>
            </div>

            {/* Compact Search & Filters Bar */}
            <div className="flex flex-col md:flex-row items-center gap-2 sm:gap-3 bg-white/40 dark:bg-zinc-950/40 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-900/50 backdrop-blur-md">
                {/* Search */}
                <form onSubmit={handleSearch} className="relative flex-1 w-full group">
                    <div className="relative flex gap-1.5 sm:gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3 sm:w-3.5 h-3 sm:h-3.5 text-zinc-600 group-focus-within:text-eduGreen-500 transition-colors" />
                            <Input
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 sm:h-10 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-lg sm:rounded-xl pl-8 sm:pl-10 pr-3 sm:pr-4 text-[10px] sm:text-xs text-zinc-900 dark:text-white focus:border-eduGreen-600 transition-all placeholder:text-zinc-700 w-full"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="h-8 sm:h-10 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-lg sm:rounded-xl px-3 sm:px-5 font-medium text-[8px] sm:text-[9px] uppercase tracking-widest transition-all shadow-md shadow-eduGreen-900/10"
                        >
                            Search
                        </Button>
                    </div>
                </form>

                <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto">
                    {/* Class Filter */}
                    <Select value={filterClassId} onValueChange={setFilterClassId}>
                        <SelectTrigger className="h-8 sm:h-10 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-lg sm:rounded-xl px-2.5 sm:px-4 text-[8px] sm:text-[9px] font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-500 min-w-[110px] sm:min-w-[140px]">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <Filter className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <SelectValue placeholder="FILTER" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                            <SelectItem value="ALL">ALL CLASSES</SelectItem>
                            {grades?.map(grade => (
                                <div key={grade.id}>
                                    <div className="px-3 py-2 text-xs font-bold text-zinc-600 uppercase tracking-widest bg-zinc-100/50 dark:bg-zinc-900/50">{grade.name}</div>
                                    {grade.classes?.map((cls: any) => (
                                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                    ))}
                                </div>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Sort */}
                    <Select value={`${sortBy}-${sortDir}`} onValueChange={(v: string) => {
                        const [by, dir] = v.split("-");
                        setBy(by as any);
                        setSortDir(dir as any);
                    }}>
                        <SelectTrigger className="h-8 sm:h-10 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-lg sm:rounded-xl px-2.5 sm:px-4 text-[8px] sm:text-[9px] font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-500 min-w-[100px] sm:min-w-[130px]">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <SelectValue placeholder="SORT" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                            <SelectItem value="NAME-ASC">Name A-Z</SelectItem>
                            <SelectItem value="NAME-DESC">Name Z-A</SelectItem>
                            <SelectItem value="CLASS-ASC">Class A-Z</SelectItem>
                            <SelectItem value="CLASS-DESC">Class Z-A</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Dialog open={isAdding} onOpenChange={(open: boolean) => !open && setIsAdding(false)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>New Student Enrollment</DialogTitle>
                        <DialogDescription>Create new academic entity record</DialogDescription>
                    </DialogHeader>

                    {loading ? (
                        <div className="py-20 flex justify-center items-center scale-90">
                            <SpringingLoader message="Enrolling Student Record" />
                        </div>
                    ) : (
                        <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                            <div className="md:col-span-2 space-y-4">
                                <label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Student Identity</label>
                                <div className="p-4 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-2xl border border-zinc-300 dark:border-zinc-800/50">
                                    <ImageUpload
                                        value={newStudent.photoUrl}
                                        onChange={(url) => setNewStudent({ ...newStudent, photoUrl: url })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Personal Details</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="First Name"
                                        value={newStudent.firstName}
                                        onChange={e => setNewStudent({ ...newStudent, firstName: e.target.value })}
                                        required
                                        className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2"
                                    />
                                    <Input
                                        placeholder="Last Name"
                                        value={newStudent.lastName}
                                        onChange={e => setNewStudent({ ...newStudent, lastName: e.target.value })}
                                        required
                                        className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Select onValueChange={(v: string) => setNewStudent({ ...newStudent, gender: v })}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 border-2 text-zinc-700 dark:text-zinc-300">
                                            <SelectValue placeholder="Gender" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                                            <SelectItem value="MALE">Male</SelectItem>
                                            <SelectItem value="FEMALE">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest ml-1">DOB</label>
                                            <Input
                                                type="date"
                                                value={newStudent.dob}
                                                onChange={e => setNewStudent({ ...newStudent, dob: e.target.value, age: "" })}
                                                className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-10 rounded-xl focus:border-eduGreen-600 transition-all border-2 w-full text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest ml-1">Age</label>
                                            <Input
                                                type="number"
                                                placeholder="Age"
                                                value={newStudent.age}
                                                onChange={e => setNewStudent({ ...newStudent, age: e.target.value, dob: "" })}
                                                className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-10 rounded-xl focus:border-eduGreen-600 transition-all border-2 w-full text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Input
                                    placeholder="Address"
                                    value={newStudent.address}
                                    onChange={e => setNewStudent({ ...newStudent, address: e.target.value })}
                                    className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Academic Placement</label>
                                <Select onValueChange={(v: string) => setNewStudent({ ...newStudent, classId: v })}>
                                    <SelectTrigger className="h-14 rounded-2xl bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 border-2 text-zinc-700 dark:text-zinc-300">
                                        <SelectValue placeholder="Select Class/Grade" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                                        {grades?.map(grade => (
                                            <div key={grade.id}>
                                                <div className="px-3 py-2 text-xs font-bold text-zinc-600 uppercase tracking-widest bg-zinc-100/50 dark:bg-zinc-900/50">{grade.name}</div>
                                                {grade.classes?.map((cls: any) => (
                                                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                                ))}
                                            </div>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2 mt-4 block">Guardian Contact</label>
                                <Input
                                    placeholder="Guardian Name"
                                    value={newStudent.guardianName}
                                    onChange={e => setNewStudent({ ...newStudent, guardianName: e.target.value })}
                                    className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Guardian Phone"
                                        value={newStudent.guardianPhone}
                                        onChange={e => setNewStudent({ ...newStudent, guardianPhone: e.target.value })}
                                        className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2"
                                    />
                                    <Input
                                        placeholder="Secondary Phone"
                                        value={newStudent.secondaryPhone}
                                        onChange={e => setNewStudent({ ...newStudent, secondaryPhone: e.target.value })}
                                        className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2"
                                    />
                                </div>
                                <Input
                                    type="email"
                                    placeholder="Student/Guardian Email (for Invite)"
                                    value={newStudent.email}
                                    onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                                    className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2"
                                />
                            </div>

                            <div className="md:col-span-2 flex justify-end gap-4 mt-6">
                                <Button type="button" onClick={() => setIsAdding(false)} className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white h-14 px-8 rounded-2xl font-medium text-xs uppercase tracking-[0.2em] transition-all">
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-14 px-10 rounded-2xl font-medium text-xs uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-900/20">
                                    Confirm Enrollment
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {(students || []).map((student) => (
                    <div key={student.id} className="group relative">
                        <Card className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-950 hover:bg-zinc-200 dark:hover:bg-zinc-900/30 transition-all h-full rounded-xl sm:rounded-2xl md:rounded-[2rem] group/card shadow-none hover:shadow-xl hover:shadow-black/50 overflow-hidden border">
                            <Link href={`/dashboard/students/${student.id}`} className="block">
                                <CardHeader className="p-3.5 sm:p-6 md:p-8 pb-2 sm:pb-4 flex flex-row items-start justify-between border-b border-zinc-200 dark:border-zinc-900/30">
                                    <div className="flex items-center gap-2.5 sm:gap-4">
                                        <div className="w-9 h-12 sm:w-12 sm:h-16 relative rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900/50 flex items-center justify-center text-sm sm:text-xl font-medium text-zinc-900 dark:text-white shadow-inner overflow-hidden shrink-0">
                                            {student.photoUrl ? (
                                                <Image src={student.photoUrl} alt="" fill sizes="48px" className="object-cover" />
                                            ) : (
                                                `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`
                                            )}
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm sm:text-base md:text-lg font-medium text-zinc-900 dark:text-white leading-none group-hover/card:text-eduGreen-400 transition-colors">
                                                {student.firstName} {student.lastName}
                                            </CardTitle>
                                            <div className="mt-1 sm:mt-1.5 flex items-center gap-1.5">
                                                <button
                                                    onClick={(e) => handleCopyCode(e, student)}
                                                    title="Click to copy Parent Access Code"
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[8px] sm:text-[9px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-eduGreen-500 hover:border-eduGreen-500/40 transition-all cursor-pointer group/code"
                                                >
                                                    <span>{student.studentCode}</span>
                                                    {copiedCodeId === student.id ? (
                                                        <Check className="w-2.5 h-2.5 text-eduGreen-500" />
                                                    ) : (
                                                        <Copy className="w-2.5 h-2.5 opacity-50 group-hover/code:opacity-100" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${student.enrollmentStatus === 'ACTIVE' ? 'bg-eduGreen-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                                </CardHeader>
                            </Link>

                            <CardContent className="p-3.5 sm:p-6 md:p-8 pt-1.5 sm:pt-2">
                                <Link href={`/dashboard/students/${student.id}`} className="block">
                                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-4">
                                        <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800/50 text-[8px] sm:text-[9px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                                            <GraduationCap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            {student.grade?.name}
                                        </div>
                                        <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800/50 text-[8px] sm:text-[9px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                                            <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            {student.class?.name || "Unassigned"}
                                        </div>
                                        <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800/50 text-[8px] sm:text-[9px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                                            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            {student.gender || "STUDENT"}
                                        </div>
                                        {student.finance && (
                                            <div className={cn(
                                                "px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg border text-[8px] sm:text-[9px] font-medium uppercase tracking-wider flex items-center gap-1.5 sm:gap-2",
                                                Number(student.finance.unpaidCount) > 0
                                                    ? "bg-amber-950/10 border-amber-900/20 text-amber-600 dark:text-amber-500"
                                                    : "bg-eduGreen-950/10 border-eduGreen-900/20 text-eduGreen-500"
                                            )}>
                                                <CreditCard className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                {Number(student.finance.unpaidCount) > 0 ? `$${student.finance.outstanding} Due` : "All Paid"}
                                            </div>
                                        )}
                                        {student.user && (
                                            <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-eduGreen-950/10 border border-eduGreen-900/20 text-[8px] sm:text-[9px] font-medium text-eduGreen-600 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                                                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                Portal Active
                                            </div>
                                        )}
                                    </div>
                                </Link>

                                <div className="mt-4 sm:mt-8 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-900/50 pt-2.5 sm:pt-4 relative z-20">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <Button
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDelete(student.id);
                                            }}
                                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full hover:bg-rose-500/10 text-zinc-600 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </Button>
                                        <Link href={`/dashboard/students/${student.id}`}>
                                            <Button
                                                variant="ghost"
                                                className="h-7 sm:h-8 px-2 sm:px-3 rounded-md sm:rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-900 text-[8px] sm:text-[9px] font-medium uppercase tracking-widest text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                            >
                                                View Dossier <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setGradingStudent(student);
                                            }}
                                            className="h-7 sm:h-8 px-2 sm:px-3 rounded-md sm:rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-900 text-[8px] sm:text-[9px] font-medium uppercase tracking-widest text-eduGreen-600 hover:text-eduGreen-500 transition-colors"
                                        >
                                            <PenTool className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-2" /> Add Mark
                                        </Button>
                                        <Link href={`/dashboard/students/${student.id}?tab=academic`}>
                                            <Button
                                                variant="ghost"
                                                className="h-7 sm:h-8 px-2 sm:px-3 rounded-md sm:rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-900 text-[8px] sm:text-[9px] font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                            >
                                                <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-2" /> Marklist
                                            </Button>
                                        </Link>
                                    </div>
                                    {student.user && (
                                        <Link href={`/dashboard/messages?userId=${student.user.id}`} onClick={(e) => e.stopPropagation()}>
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-eduGreen-600 hover:text-white transition-all text-zinc-600">
                                                <MessageSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            </div>
                                        </Link>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8 pb-4">
                    <Button
                        variant="outline"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300 dark:hover:bg-zinc-800"
                    >
                        Previous
                    </Button>
                    <span className="text-zinc-600 dark:text-zinc-500 font-medium text-sm tracking-wider uppercase">
                        Page <span className="text-zinc-900 dark:text-white">{page}</span> of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300 dark:hover:bg-zinc-800"
                    >
                        Next
                    </Button>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={executeDelete}
                title={me?.role === 'PRINCIPAL' ? "Request Record Archival" : "Archive Student Record"}
                description={me?.role === 'PRINCIPAL' ? "Request approval to permanently deactivate the student's academic profile." : "This action will permanently deactivate the student's academic profile. Historical grade data will be retained in cold storage."}
                confirmText={me?.role === 'PRINCIPAL' ? "Request Archival" : "Archive Record"}
                variant="danger"
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                variant={alertConfig.variant}
            />

            <GradeStudentModal
                isOpen={!!gradingStudent}
                onClose={() => setGradingStudent(null)}
                student={gradingStudent}
            />

            {/* Hidden Print Template */}
            <div className="absolute -left-[9999px] top-0 overflow-hidden" aria-hidden="true">
                <StudentRegistryPrint ref={printRef} students={students || []} />
            </div>
        </div >
    );
}
