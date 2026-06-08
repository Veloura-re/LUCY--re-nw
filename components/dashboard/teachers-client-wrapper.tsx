"use client";

import { useState, useRef } from "react";
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
    const [copied, setCopied] = useState(false);

    // Modal State
    const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });
    const [selectedTeacherForID, setSelectedTeacherForID] = useState<any>(null);
    const [selectedTeacherForEdit, setSelectedTeacherForEdit] = useState<any>(null);

    const refreshRegistry = async () => {
        try {
            const res = await fetch('/api/school/teachers');
            const data = await res.json() as any;
            if (data.teachers) setTeachers(data.teachers);
        } catch (e) { console.error(e); }
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
                refreshRegistry();
            } else {
                setAlertConfig({ title: "Operation Failed", message: "Institutional access policy prevented removal.", isOpen: true, variant: "error" });
            }
        } finally {
            setConfirmDeleteEmail(null);
            setIsLoading(false);
        }
    };



    const filteredTeachers = teachers
        .filter(t => {
            const matchesSearch = activeSearch === "" ||
                (t.name?.toLowerCase().includes(activeSearch.toLowerCase()) ||
                    t.email?.toLowerCase().includes(activeSearch.toLowerCase()) ||
                    t.teacherCode?.toLowerCase().includes(activeSearch.toLowerCase()));

            const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            let comparison = 0;
            if (sortBy === "NAME") comparison = (a.name || "").localeCompare(b.name || "");
            else if (sortBy === "STATUS") comparison = a.status.localeCompare(b.status);
            return sortDir === "ASC" ? comparison : -comparison;
        });

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10">
            {/* Print Component */}
            <div className="absolute -left-[9999px] top-0 overflow-hidden" aria-hidden="true">
               <PersonnelPrint ref={printRef} data={teachers} />
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-900 pb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-white">
                        Academic <span className="text-eduGreen-500 italic">Personnel</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Institutional Faculty & Staff Registry</p>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => handlePrint()}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-14 px-8 rounded-2xl font-medium text-xs uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-900/20 border border-eduGreen-500/50 transition-all active:scale-95"
                    >
                        <Download className="w-5 h-5 mr-3" /> Export PDF Registry
                    </Button>
                    <Button
                        onClick={() => setIsInviting(true)}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-14 px-10 rounded-2xl font-medium text-xs uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-900/20 transition-all active:scale-95 mb-1"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Invite Faculty
                    </Button>
                </div>
            </div>

            {/* Compact Search & Filters Bar */}
            <div className="flex flex-col md:flex-row items-center gap-3 bg-zinc-950/40 p-3 rounded-2xl border border-zinc-900/50 backdrop-blur-md">
                <form onSubmit={(e) => { e.preventDefault(); setActiveSearch(searchTerm); }} className="relative flex-1 w-full group">
                    <div className="relative flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-eduGreen-500 transition-colors" />
                            <Input
                                placeholder="Search faculty..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-10 bg-zinc-900/50 border-zinc-800 rounded-xl pl-10 pr-4 text-xs text-white focus:border-eduGreen-600 transition-all placeholder:text-zinc-700 w-full"
                            />
                        </div>
                        <Button type="submit" className="h-10 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl px-5 font-medium text-[9px] uppercase tracking-widest transition-all">Search</Button>
                    </div>
                </form>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-10 bg-zinc-900/50 border-zinc-800 rounded-xl px-4 text-[9px] font-medium uppercase tracking-widest text-zinc-500 min-w-[140px]">
                            <div className="flex items-center gap-2">
                                <Filter className="w-3 h-3" />
                                <SelectValue placeholder="STATUS" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                            <SelectItem value="ALL">ALL STATUS</SelectItem>
                            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                            <SelectItem value="PENDING">PENDING</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={`${sortBy}-${sortDir}`} onValueChange={(v: string) => {
                        const [by, dir] = v.split("-");
                        setBy(by as any);
                        setSortDir(dir as any);
                    }}>
                        <SelectTrigger className="h-10 bg-zinc-900/50 border-zinc-800 rounded-xl px-4 text-[9px] font-medium uppercase tracking-widest text-zinc-500 min-w-[130px]">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                <SelectValue placeholder="SORT" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                            <SelectItem value="NAME-ASC">Name A-Z</SelectItem>
                            <SelectItem value="NAME-DESC">Name Z-A</SelectItem>
                            <SelectItem value="STATUS-ASC">Status A-Z</SelectItem>
                            <SelectItem value="STATUS-DESC">Status Z-A</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                    { label: "Active Faculty", value: activeStat, sub: "Verified Personnel" },
                    { label: "Pending Access", value: pendingStat, sub: "Awaiting Uplink" }
                ].map((stat, i) => (
                    <Card key={i} className="bg-zinc-950/20 border-zinc-900 rounded-3xl p-8 hover:border-eduGreen-900/30 transition-all border-t-zinc-800/20">
                        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-700 mb-2">{stat.label}</p>
                        <p className="text-4xl font-medium text-white">{stat.value}</p>
                        <p className="text-[9px] font-medium text-zinc-800 uppercase tracking-widest mt-2">{stat.sub}</p>
                    </Card>
                ))}
            </div>



            <Card className="bg-zinc-950/20 backdrop-blur-xl border-zinc-900 rounded-[2.5rem] shadow-none overflow-hidden">
                <CardHeader className="p-10 border-b border-zinc-900/30">
                    <CardTitle className="text-2xl font-medium text-white tracking-tight">Staff Directory</CardTitle>
                    <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.2em] mt-1">Authorized Academic Personnel</p>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-zinc-900/40">
                        {filteredTeachers.map((teacher, idx) => (
                            <div key={idx} className="p-6 flex items-center justify-between hover:bg-eduGreen-950/5 transition-all group">
                                <Link href={teacher.id ? `/dashboard/teachers/${teacher.id}` : '#'} className="flex items-center gap-6 cursor-pointer">
                                    <div className="w-12 h-16 rounded-lg bg-zinc-950 border border-zinc-900/50 flex items-center justify-center font-medium text-zinc-800 uppercase group-hover:border-eduGreen-900/30 relative overflow-hidden transition-all">
                                        {teacher.photoUrl ? <Image src={teacher.photoUrl} alt="" fill sizes="48px" className="object-cover" /> : (teacher.name?.[0] || "?")}
                                    </div>
                                    <div>
                                        <p className="font-medium text-zinc-100 group-hover:text-eduGreen-400 tracking-tight text-lg transition-colors">{teacher.name || "Awaiting Setup"}</p>
                                        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">{teacher.email}</p>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-4">
                                    {teacher.status === 'ACTIVE' ? (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-eduGreen-950/20 border border-eduGreen-900/30">
                                            <div className="w-1.5 h-1.5 rounded-full bg-eduGreen-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                            <span className="text-[9px] font-medium text-eduGreen-500 uppercase tracking-widest">Active Access</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/20 border border-amber-900/30">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            <span className="text-[9px] font-medium text-amber-500 uppercase tracking-widest">Invite Sent</span>
                                        </div>
                                    )}
                                    {teacher.id && <Link href={`/dashboard/messages?userId=${teacher.id}`}><Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-zinc-400 hover:text-eduGreen-500"><MessageSquare className="w-4 h-4" /></Button></Link>}
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedTeacherForEdit(teacher)} className="w-10 h-10 rounded-xl text-zinc-400 hover:text-white"><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedTeacherForID(teacher)} className="w-10 h-10 rounded-xl text-zinc-400 hover:text-white"><ShieldCheck className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteEmail(teacher.email)} className="w-10 h-10 rounded-xl text-zinc-800 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <ConfirmationModal isOpen={!!confirmDeleteEmail} onClose={() => setConfirmDeleteEmail(null)} onConfirm={executeDelete} isLoading={isLoading} title="Personnel Offboarding" description={`Revoke system access for ${confirmDeleteEmail}?`} confirmText="Terminate Access" variant="danger" />
            <AlertModal isOpen={alertConfig.isOpen} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} title={alertConfig.title} message={alertConfig.message} variant={alertConfig.variant} />
            <IDCardModal isOpen={!!selectedTeacherForID} onClose={() => setSelectedTeacherForID(null)} user={selectedTeacherForID} type="TEACHER" schoolName={schoolInfo?.name} schoolAddress={schoolInfo?.address} schoolLogo={schoolInfo?.logoUrl} />
            <EditTeacherModal isOpen={!!selectedTeacherForEdit} onClose={() => setSelectedTeacherForEdit(null)} onSuccess={refreshRegistry} teacher={selectedTeacherForEdit} />
            <InviteFacultyModal isOpen={isInviting} onClose={() => setIsInviting(false)} onSuccess={handleInviteSuccess} />
        </div>
    );
}
