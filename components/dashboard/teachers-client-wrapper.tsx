"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Copy, Trash2, ShieldCheck, Mail, MailCheck, Users, Search, MessageSquare, AlertCircle, Pencil, Download, Filter, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";
import { PersonnelPrint } from "@/components/dashboard/personnel-print";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { ConfirmationModal, AlertModal } from "@/components/ui/confirmation-modal";
import { IDCardModal } from "@/components/dashboard/id-card-modal";
import { ImageUpload } from "@/components/ui/image-upload";
import { EditTeacherModal } from "@/components/dashboard/edit-teacher-modal";
import { InviteFacultyModal } from "@/components/dashboard/invite-faculty-modal";
import Image from "next/image";

interface TeachersClientWrapperProps {
    initialTeachers: any[];
    schoolInfo: { name: string, address: string, logoUrl?: string } | null;
    me: any;
}

export default function TeachersClientWrapper({ initialTeachers, schoolInfo, me }: TeachersClientWrapperProps) {
    const [teachers, setTeachers] = useState<any[]>(initialTeachers);
    
    // Stats calculation
    const activeStat = teachers.filter((t: any) => t.status === 'ACTIVE').length;
    const pendingStat = teachers.filter((t: any) => t.status === 'PENDING').length;

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Teacher_Registry_${format(new Date(), 'yyyy-MM-dd')}`,
    });

    const [isInviting, setIsInviting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [sortBy, setBy] = useState<"NAME" | "STATUS">("NAME");
    const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;

    const [copied, setCopied] = useState(false);

    const handleCopyInvite = (token: string) => {
        if (!token) return;
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lucyos.5-cn.net';
        navigator.clipboard.writeText(`${origin}/invite/${token}`);
        setCopied(true);
        setAlertConfig({
            title: "Invite Link Copied",
            message: "The invitation link has been copied to your clipboard. Send it directly to the faculty member.",
            isOpen: true,
            variant: "success"
        });
        setTimeout(() => setCopied(false), 2000);
    };

    // Modal State
    const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });
    const [selectedTeacherForID, setSelectedTeacherForID] = useState<any>(null);
    const [selectedTeacherForEdit, setSelectedTeacherForEdit] = useState<any>(null);

    const isMounted = useRef(false);

    const fetchTeachers = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                sortBy,
                sortDir,
                status: filterStatus,
                ...(activeSearch && { search: activeSearch })
            });
            const res = await fetch(`/api/school/teachers?${params.toString()}`);
            if (res.ok) {
                const data = await res.json() as any;
                setTeachers(data.teachers);
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages || 1);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }
        fetchTeachers();
    }, [page, activeSearch, filterStatus, sortBy, sortDir]);

    const refreshRegistry = async () => {
        setPage(1);
        await fetchTeachers();
    };

    const handleInviteSuccess = (token: string, user: any) => {
        refreshRegistry();
    };

    const executeDelete = async () => {
        if (!confirmDeleteEmail) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/school/teachers/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: confirmDeleteEmail })
            });

            if (res.ok) {
                const data = await res.json() as any;
                if (data.pendingApproval) {
                    setAlertConfig({ title: "Request Submitted", message: "A request has been sent to the Owner for approval.", isOpen: true, variant: "success" });
                } else {
                    refreshRegistry();
                }
            } else {
                setAlertConfig({ title: "Operation Failed", message: "Institutional access policy prevented removal.", isOpen: true, variant: "error" });
            }
        } finally {
            setConfirmDeleteEmail(null);
            setIsLoading(false);
        }
    };



    const filteredTeachers = teachers; // Filtering and sorting is now done server-side

    return (
        <div className="max-w-5xl mx-auto space-y-3.5 sm:space-y-8 md:space-y-12 animate-in fade-in duration-300 relative z-10 pb-12 sm:pb-20">
            {/* Print Component */}
            <div className="absolute -left-[9999px] top-0 overflow-hidden" aria-hidden="true">
               <PersonnelPrint ref={printRef} data={teachers} />
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-3 sm:pb-10">
                <div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Academic <span className="text-eduGreen-500 italic">Personnel</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[8px] sm:text-xs mt-1 sm:mt-3">Institutional Faculty & Staff Registry</p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
                    <Button
                        onClick={() => handlePrint()}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-8 sm:h-14 px-3 sm:px-8 rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-md shadow-eduGreen-900/20 border border-eduGreen-500/50 transition-all active:scale-95 flex-1 sm:flex-initial"
                    >
                        <Download className="w-3.5 h-3.5 sm:w-5 sm:h-5 mr-1.5 sm:mr-3" /> Export PDF Registry
                    </Button>
                    <Button
                        onClick={() => setIsInviting(true)}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-8 sm:h-14 px-3 sm:px-10 rounded-lg sm:rounded-2xl font-medium text-[8px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-md shadow-eduGreen-900/20 transition-all active:scale-95 flex-1 sm:flex-initial"
                    >
                        <Plus className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Invite Faculty
                    </Button>
                </div>
            </div>

            {/* Compact Search & Filters Bar */}
            <div className="flex flex-col md:flex-row items-center gap-2 sm:gap-3 bg-white/40 dark:bg-zinc-950/40 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-900/50 backdrop-blur-md">
                <form onSubmit={(e) => { e.preventDefault(); setPage(1); setActiveSearch(searchTerm); }} className="relative flex-1 w-full group">
                    <div className="relative flex gap-1.5 sm:gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3 sm:w-3.5 h-3 sm:h-3.5 text-zinc-600 group-focus-within:text-eduGreen-500 transition-colors" />
                            <Input
                                placeholder="Search faculty..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 sm:h-10 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-lg sm:rounded-xl pl-8 sm:pl-10 pr-3 sm:pr-4 text-[10px] sm:text-xs text-zinc-900 dark:text-white focus:border-eduGreen-600 transition-all placeholder:text-zinc-700 w-full"
                            />
                        </div>
                        <Button type="submit" className="h-8 sm:h-10 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-lg sm:rounded-xl px-3 sm:px-5 font-medium text-[8px] sm:text-[9px] uppercase tracking-widest transition-all">Search</Button>
                    </div>
                </form>

                <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto">
                    <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                        <SelectTrigger className="h-8 sm:h-10 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-lg sm:rounded-xl px-2.5 sm:px-4 text-[8px] sm:text-[9px] font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-500 flex-1 md:min-w-[140px]">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <Filter className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <SelectValue placeholder="STATUS" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                            <SelectItem value="ALL">ALL STATUS</SelectItem>
                            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                            <SelectItem value="PENDING">PENDING</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={`${sortBy}-${sortDir}`} onValueChange={(v: string) => {
                        const [by, dir] = v.split("-");
                        setBy(by as any);
                        setSortDir(dir as any);
                        setPage(1);
                    }}>
                        <SelectTrigger className="h-8 sm:h-10 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-lg sm:rounded-xl px-2.5 sm:px-4 text-[8px] sm:text-[9px] font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-500 flex-1 md:min-w-[130px]">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <SelectValue placeholder="SORT" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                            <SelectItem value="NAME-ASC">Name A-Z</SelectItem>
                            <SelectItem value="NAME-DESC">Name Z-A</SelectItem>
                            <SelectItem value="STATUS-ASC">Status A-Z</SelectItem>
                            <SelectItem value="STATUS-DESC">Status Z-A</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-2.5 sm:gap-8">
                {[
                    { label: "Active Faculty", value: activeStat, sub: "Verified Personnel" },
                    { label: "Pending Access", value: pendingStat, sub: "Awaiting Connection" }
                ].map((stat, i) => (
                    <Card key={i} className="bg-white/20 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-900 rounded-xl sm:rounded-3xl p-3.5 sm:p-8 hover:border-eduGreen-900/30 transition-all border-t-zinc-800/20">
                        <p className="text-[8px] sm:text-[10px] font-medium uppercase tracking-widest text-zinc-700 mb-1 sm:mb-2">{stat.label}</p>
                        <p className="text-xl sm:text-4xl font-medium text-zinc-900 dark:text-white">{stat.value}</p>
                        <p className="text-[7px] sm:text-[9px] font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-widest mt-1 sm:mt-2">{stat.sub}</p>
                    </Card>
                ))}
            </div>

            <Card className="bg-white/20 dark:bg-zinc-950/20 backdrop-blur-xl border-zinc-200 dark:border-zinc-900 rounded-xl sm:rounded-2xl md:rounded-[2.5rem] shadow-none overflow-hidden">
                <CardHeader className="p-3.5 sm:p-6 md:p-10 border-b border-zinc-200 dark:border-zinc-900/30">
                    <CardTitle className="text-base sm:text-2xl font-medium text-zinc-900 dark:text-white tracking-tight">Staff Directory</CardTitle>
                    <p className="text-[7px] sm:text-[9px] font-medium text-zinc-600 uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-0.5 sm:mt-1">Authorized Academic Personnel</p>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-900/40">
                        {filteredTeachers.map((teacher, idx) => (
                            <div key={idx} className="p-3 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 hover:bg-eduGreen-950/5 transition-all group">
                                <Link href={teacher.id ? `/dashboard/teachers/${teacher.id}` : '#'} className="flex items-center gap-3 sm:gap-6 cursor-pointer w-full sm:w-auto">
                                    <div className="w-9 h-11 sm:w-12 sm:h-16 rounded-md sm:rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900/50 flex items-center justify-center font-medium text-xs sm:text-base text-zinc-800 dark:text-zinc-200 uppercase group-hover:border-eduGreen-900/30 relative overflow-hidden transition-all shrink-0">
                                        {teacher.photoUrl ? <Image unoptimized src={teacher.photoUrl} alt="" fill sizes="48px" className="object-cover" /> : (teacher.name?.[0] || "?")}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-zinc-900 dark:text-white dark:text-zinc-100 group-hover:text-eduGreen-400 tracking-tight text-xs sm:text-lg transition-colors truncate">{teacher.name || "Awaiting Setup"}</p>
                                        <p className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest truncate">{teacher.email}</p>
                                    </div>
                                </Link>
                                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t border-zinc-100 dark:border-zinc-900/30 sm:border-t-0">
                                    {teacher.status === 'ACTIVE' ? (
                                        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-eduGreen-950/20 border border-eduGreen-900/30 shrink-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-eduGreen-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                            <span className="text-[7px] sm:text-[9px] font-medium text-eduGreen-500 uppercase tracking-widest">Active Access</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-900/30 shrink-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            <span className="text-[7px] sm:text-[9px] font-medium text-amber-600 dark:text-amber-500 uppercase tracking-widest">Invite Sent</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        {teacher.token && (
                                            <Button variant="ghost" size="icon" onClick={() => handleCopyInvite(teacher.token)} title="Copy Invitation Link" className="w-7 h-7 sm:w-10 sm:h-10 rounded-md sm:rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-eduGreen-500">
                                                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </Button>
                                        )}
                                        {teacher.id && <Link href={`/dashboard/messages?userId=${teacher.id}`}><Button variant="ghost" size="icon" className="w-7 h-7 sm:w-10 sm:h-10 rounded-md sm:rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-eduGreen-500"><MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button></Link>}
                                        <Button variant="ghost" size="icon" onClick={() => setSelectedTeacherForEdit(teacher)} className="w-7 h-7 sm:w-10 sm:h-10 rounded-md sm:rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setSelectedTeacherForID(teacher)} className="w-7 h-7 sm:w-10 sm:h-10 rounded-md sm:rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteEmail(teacher.email)} className="w-7 h-7 sm:w-10 sm:h-10 rounded-md sm:rounded-xl text-zinc-800 dark:text-zinc-200 hover:text-red-600 dark:text-red-500"><Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white/40 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-900/50 backdrop-blur-md">
                    <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || isLoading}
                            className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <ConfirmationModal 
                isOpen={!!confirmDeleteEmail} 
                onClose={() => setConfirmDeleteEmail(null)} 
                onConfirm={executeDelete} 
                isLoading={isLoading} 
                title={me?.role === 'PRINCIPAL' ? "Request Personnel Dismissal" : "Personnel Offboarding"} 
                description={me?.role === 'PRINCIPAL' ? `Request approval to revoke system access for ${confirmDeleteEmail}?` : `Revoke system access for ${confirmDeleteEmail}?`} 
                confirmText={me?.role === 'PRINCIPAL' ? "Request Dismissal" : "Terminate Access"} 
                variant="danger" 
            />
            <AlertModal isOpen={alertConfig.isOpen} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} title={alertConfig.title} message={alertConfig.message} variant={alertConfig.variant} />
            <IDCardModal isOpen={!!selectedTeacherForID} onClose={() => setSelectedTeacherForID(null)} user={selectedTeacherForID} type="TEACHER" schoolName={schoolInfo?.name} schoolAddress={schoolInfo?.address} schoolLogo={schoolInfo?.logoUrl} />
            <EditTeacherModal isOpen={!!selectedTeacherForEdit} onClose={() => setSelectedTeacherForEdit(null)} onSuccess={refreshRegistry} teacher={selectedTeacherForEdit} />
            <InviteFacultyModal isOpen={isInviting} onClose={() => setIsInviting(false)} onSuccess={handleInviteSuccess} />
        </div>
    );
}
