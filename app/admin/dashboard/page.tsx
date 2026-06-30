"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Plus, School, Users, GraduationCap, Copy, CheckCircle2,
    AlertCircle, Loader2, Trash2, Power, PowerOff, BookOpen,
    ChevronRight, X, ArrowUpRight, Globe, ShieldCheck
} from "lucide-react";
import { ConfirmationModal, AlertModal } from "@/components/ui/confirmation-modal";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { ManagePrincipalsModal } from "@/components/admin/manage-principals-modal";
import { ManageOwnersModal } from "@/components/admin/manage-owners-modal";
import { WelcomeAnnouncement } from "@/components/dashboard/welcome-announcement";

interface School {
    id: string;
    name: string;
    schoolCode: string;
    status: string;
    createdAt: string;
    _count: {
        users: number;
        students: number;
        grades: number;
    };
}

export default function SuperAdminDashboard() {
    const [schools, setSchools] = useState<School[]>([]);
    const [userName, setUserName] = useState("Administrator");
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState("");
    const [ownerEmail, setOwnerEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [copied, setCopied] = useState<'token' | 'url' | null>(null);
    const [emailSent, setEmailSent] = useState(false);

    // Security Disclosures Tab States
    const [activeTab, setActiveTab] = useState<'SCHOOLS' | 'SECURITY' | 'WANTS_ACCESS'>('SCHOOLS');
    interface SecurityReport {
        id: string;
        email: string;
        vulnerabilityType: string;
        severity: string;
        description: string;
        hash: string;
        createdAt: string;
    }
    const [securityReports, setSecurityReports] = useState<SecurityReport[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);

    const fetchSecurityReports = async () => {
        setIsLoadingReports(true);
        try {
            const res = await fetch('/api/admin/security-reports');
            if (!res.ok) throw new Error('Failed to fetch security reports');
            const data = (await res.json()) as any;
            setSecurityReports(data.reports || []);
        } catch (err: any) {
            console.error(err.message);
        } finally {
            setIsLoadingReports(false);
        }
    };

    // Wants Access Tab States
    interface AccessRequest {
        id: string;
        callsign: string;
        email: string;
        message: string;
        createdAt: string;
    }
    const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
    const [isLoadingAccess, setIsLoadingAccess] = useState(false);

    const fetchAccessRequests = async () => {
        setIsLoadingAccess(true);
        try {
            const res = await fetch('/api/admin/wants-access');
            if (!res.ok) throw new Error('Failed to fetch access requests');
            const data = (await res.json()) as any;
            setAccessRequests(data.requests || []);
        } catch (err: any) {
            console.error(err.message);
        } finally {
            setIsLoadingAccess(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'SECURITY') {
            fetchSecurityReports();
        } else if (activeTab === 'WANTS_ACCESS') {
            fetchAccessRequests();
        }
    }, [activeTab]);

    const [confirmAction, setConfirmAction] = useState<{ type: 'SUSPEND' | 'DELETE' | null, schoolId: string, schoolName: string }>({ type: null, schoolId: "", schoolName: "" });
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });
    const [managePrincipalsSchool, setManagePrincipalsSchool] = useState<{ id: string, name: string } | null>(null);
    const [manageOwnersSchool, setManageOwnersSchool] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        fetchSchools();
        fetchUser();
    }, []);

    const fetchUser = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.name) setUserName(user.user_metadata.name);
    };

    const fetchSchools = async () => {
        try {
            const res = await fetch('/api/admin/schools');
            if (!res.ok) throw new Error('Failed to fetch schools');
            const data = (await res.json()) as any;
            setSchools(data.schools || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsCreating(true);
        setEmailSent(false);

        try {
            const res = await fetch('/api/admin/schools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newSchoolName, ownerEmail }),
            });

            if (!res.ok) {
                const data = (await res.json()) as any;
                throw new Error(data.error || 'Failed to create school');
            }

            const data = (await res.json()) as any;
            setInviteUrl(data.inviteUrl);
            setInviteToken(data.inviteToken);
            setEmailSent(data.emailSent);
            setNewSchoolName("");
            setOwnerEmail("");
            fetchSchools();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    };

    const executeSuspend = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/schools/${confirmAction.schoolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'SUSPENDED' }),
            });
            if (!res.ok) throw new Error('Failed to suspend school');
            fetchSchools();
        } catch (err: any) {
            setAlertConfig({ title: "Action Failed", message: err.message, isOpen: true, variant: "error" });
        } finally {
            setConfirmAction({ type: null, schoolId: "", schoolName: "" });
            setIsLoading(false);
        }
    };

    const handleActivateSchool = async (schoolId: string) => {
        try {
            await fetch(`/api/admin/schools/${schoolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ACTIVE' }),
            });
            fetchSchools();
        } catch (err: any) {
            setAlertConfig({ title: 'Activation Failed', message: err.message, isOpen: true, variant: 'error' });
        }
    };

    const executeDelete = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/schools/${confirmAction.schoolId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete school');
            fetchSchools();
        } catch (err: any) {
            setAlertConfig({ title: "Deletion Failed", message: err.message, isOpen: true, variant: "error" });
        } finally {
            setConfirmAction({ type: null, schoolId: "", schoolName: "" });
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string, type: 'token' | 'url') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const totalStaff = schools.reduce((sum, s) => sum + s._count.users, 0);
    const totalStudents = schools.reduce((sum, s) => sum + s._count.students, 0);
    const activeSchools = schools.filter(s => s.status === 'ACTIVE').length;

    return (
        <div className="space-y-10 animate-in fade-in duration-300">

            <DashboardGreeting
                name={userName}
                role="SUPERADMIN"
                gender={null} // Optionally you could fetch this too, but Supreme Architect is gender neutral
            />

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Schools", value: schools.length, sub: `${activeSchools} active`, icon: Globe, color: "from-eduGreen-500/10 to-transparent", border: "border-eduGreen-500/10", text: "text-eduGreen-400" },
                    { label: "Total Staff", value: totalStaff, sub: "Platform users", icon: Users, color: "from-blue-500/10 to-transparent", border: "border-blue-500/10", text: "text-blue-400" },
                    { label: "Students", value: totalStudents, sub: "Active learners", icon: GraduationCap, color: "from-purple-500/10 to-transparent", border: "border-purple-500/10", text: "text-purple-400" },
                    { label: "Grade Levels", value: schools.reduce((sum, s) => sum + s._count.grades, 0), sub: "Across all schools", icon: BookOpen, color: "from-amber-500/10 to-transparent", border: "border-amber-500/10", text: "text-amber-400" },
                ].map((stat, i) => (
                    <div key={i} className={`relative overflow-hidden rounded-2xl border ${stat.border} bg-white/[0.02] p-6 group hover:bg-white/[0.04] transition-all`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-60`} />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.25em]">{stat.label}</span>
                                <stat.icon className={`w-4 h-4 ${stat.text} opacity-60`} />
                            </div>
                            <div className={`text-4xl font-medium ${stat.text} mb-1`}>{stat.value}</div>
                            <div className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">{stat.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/5 gap-2">
                <button
                    onClick={() => setActiveTab('SCHOOLS')}
                    className={cn(
                        "px-6 py-3 border-b-2 font-mono text-xs uppercase tracking-wider font-bold transition-all rounded-t-xl",
                        activeTab === 'SCHOOLS' 
                            ? "border-eduGreen-500 bg-eduGreen-950/10 text-white" 
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    [schools_ledger]
                </button>
                <button
                    onClick={() => setActiveTab('SECURITY')}
                    className={cn(
                        "px-6 py-3 border-b-2 font-mono text-xs uppercase tracking-wider font-bold transition-all rounded-t-xl",
                        activeTab === 'SECURITY' 
                            ? "border-orange-500 bg-orange-950/10 text-white" 
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    [security_disclosures]
                </button>
                <button
                    onClick={() => setActiveTab('WANTS_ACCESS')}
                    className={cn(
                        "px-6 py-3 border-b-2 font-mono text-xs uppercase tracking-wider font-bold transition-all rounded-t-xl",
                        activeTab === 'WANTS_ACCESS' 
                            ? "border-sky-500 bg-sky-950/10 text-white" 
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    [wants_access]
                </button>
            </div>

            {/* Schools Section */}
            {activeTab === 'SCHOOLS' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-medium text-white tracking-tight">Managed Institutions</h2>
                            <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-medium mt-1">
                                {schools.length} environment{schools.length !== 1 ? 's' : ''} registered
                            </p>
                        </div>
                        <Button
                            onClick={() => { setShowForm(true); setInviteToken(null); setInviteUrl(null); }}
                            className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-11 px-6 rounded-xl font-semibold text-[11px] uppercase tracking-widest shadow-xl shadow-eduGreen-900/30 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New School
                        </Button>
                    </div>

                    {/* Inline Create Form */}
                    {showForm && !inviteToken && (
                        <div className="relative rounded-2xl border border-eduGreen-500/20 bg-eduGreen-500/5 p-8 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-eduGreen-500/40 to-transparent" />
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-eduGreen-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-white">Provision New Institution</h3>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mt-0.5">Deploy a new school environment</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSchool} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">Institution Name</label>
                                    <Input
                                        placeholder="e.g. International Academy"
                                        value={newSchoolName}
                                        onChange={e => setNewSchoolName(e.target.value)}
                                        required
                                        className="bg-zinc-900/50 border-zinc-800 rounded-xl h-12 text-white focus:border-eduGreen-600"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">Owner Email</label>
                                    <Input
                                        type="email"
                                        placeholder="owner@institution.edu"
                                        value={ownerEmail}
                                        onChange={e => setOwnerEmail(e.target.value)}
                                        required
                                        className="bg-zinc-900/50 border-zinc-800 rounded-xl h-12 text-white focus:border-eduGreen-600"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="h-12 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-semibold text-[11px] uppercase tracking-widest shadow-lg shadow-eduGreen-900/20 transition-all"
                                    isLoading={isCreating}
                                >
                                    Initialize School
                                </Button>
                            </form>

                            {error && (
                                <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-red-950/20 border border-red-900/30 text-[11px] text-red-400 font-medium">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Invite Token Result */}
                    {inviteToken && (
                        <div className="relative rounded-2xl border border-eduGreen-500/20 bg-zinc-950 p-8 animate-in fade-in zoom-in-95 duration-400 shadow-2xl">
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-eduGreen-500/50 to-transparent" />
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-eduGreen-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        <span className="text-sm font-semibold text-eduGreen-400 uppercase tracking-wider">Institution Provisioned</span>
                                    </div>
                                    {emailSent ? (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-eduGreen-950/40 border border-eduGreen-900/30 text-[9px] font-semibold text-eduGreen-500 uppercase tracking-widest">
                                            <CheckCircle2 className="w-3 h-3" /> Email Sent
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/30 border border-amber-900/30 text-[9px] font-semibold text-amber-500 uppercase tracking-widest">
                                            <AlertCircle className="w-3 h-3" /> Manual Delivery
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">🔑 Invite Token</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3.5 font-mono text-xl text-eduGreen-400 tracking-[0.25em] text-center">
                                            {inviteToken}
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(inviteToken, 'token')}
                                            className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-eduGreen-500/30 flex items-center justify-center text-zinc-500 hover:text-eduGreen-400 transition-all"
                                        >
                                            {copied === 'token' ? <CheckCircle2 className="w-4 h-4 text-eduGreen-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">🔗 Invite URL</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 font-mono text-[10px] text-zinc-400 truncate">
                                            {inviteUrl}
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(inviteUrl || '', 'url')}
                                            className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-eduGreen-500/30 flex items-center justify-center text-zinc-500 hover:text-eduGreen-400 transition-all"
                                        >
                                            {copied === 'url' ? <CheckCircle2 className="w-4 h-4 text-eduGreen-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={() => { setInviteToken(null); setInviteUrl(null); setShowForm(false); }}
                                className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-xl font-semibold text-[10px] uppercase tracking-widest transition-all"
                            >
                                Done
                            </Button>
                        </div>
                    )}

                    {/* Schools List */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-eduGreen-600 opacity-60" />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-700">Loading institutions...</p>
                        </div>
                    ) : schools.length === 0 ? (
                        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-900">
                            <School className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-600 font-medium uppercase tracking-widest text-xs">No schools provisioned yet</p>
                            <p className="text-[10px] text-zinc-700 mt-1">Use the button above to deploy your first institution</p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/5 overflow-hidden">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/[0.02] border-b border-white/5">
                                <div className="col-span-4 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Institution</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Staff</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Students</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Status</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-right">Actions</div>
                            </div>

                            {/* Table Rows */}
                            <div className="divide-y divide-white/5 bg-black">
                                {schools.map((school, idx) => (
                                    <div key={school.id} className="grid grid-cols-12 gap-4 px-6 py-5 hover:bg-white/[0.01] items-center transition-colors">
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:border-eduGreen-500/30 transition-all">
                                                <School className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-white text-xs">{school.name}</h4>
                                                <p className="text-[9px] text-zinc-500 font-mono mt-0.5 select-all">{school.schoolCode}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-center text-xs font-mono text-zinc-400">{school._count.users}</div>
                                        <div className="col-span-2 text-center text-xs font-mono text-zinc-400">{school._count.students}</div>
                                        <div className="col-span-2 text-center">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider",
                                                school.status === 'ACTIVE' && "bg-eduGreen-950/20 border-eduGreen-900/50 text-eduGreen-400",
                                                school.status === 'PENDING' && "bg-amber-950/20 border-amber-900/50 text-amber-400",
                                                school.status === 'SUSPENDED' && "bg-red-950/20 border-red-900/50 text-red-400"
                                            )}>
                                                {school.status}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-2 flex items-center justify-end gap-1.5">
                                            {school.status === 'ACTIVE' ? (
                                                <button
                                                    onClick={() => setConfirmAction({ type: 'SUSPEND', schoolId: school.id, schoolName: school.name })}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-900/40 hover:text-amber-400 text-zinc-500 text-[10px] font-semibold uppercase tracking-widest transition-all"
                                                    title="Suspend"
                                                >
                                                    <PowerOff className="w-3 h-3" />
                                                    <span className="hidden lg:block">Suspend</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleActivateSchool(school.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-eduGreen-900/40 hover:text-eduGreen-400 text-zinc-500 text-[10px] font-semibold uppercase tracking-widest transition-all"
                                                    title="Activate"
                                                >
                                                    <Power className="w-3 h-3" />
                                                    <span className="hidden lg:block">Activate</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setManageOwnersSchool({ id: school.id, name: school.name })}
                                                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-purple-900/40 hover:text-purple-400 text-zinc-600 flex items-center justify-center transition-all"
                                                title="Manage Owners"
                                            >
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setManagePrincipalsSchool({ id: school.id, name: school.name })}
                                                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-blue-900/40 hover:text-blue-400 text-zinc-600 flex items-center justify-center transition-all"
                                                title="Manage Principals"
                                            >
                                                <Users className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setConfirmAction({ type: 'DELETE', schoolId: school.id, schoolName: school.name })}
                                                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-900/40 hover:text-red-400 text-zinc-600 flex items-center justify-center transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Security Reports Section */}
            {activeTab === 'SECURITY' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-medium text-white tracking-tight">Vulnerability Disclosures</h2>
                            <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-medium mt-1">
                                {securityReports.length} report{securityReports.length !== 1 ? 's' : ''} logged in vault
                            </p>
                        </div>
                    </div>

                    {isLoadingReports ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-500 opacity-60" />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-700">Loading reports...</p>
                        </div>
                    ) : securityReports.length === 0 ? (
                        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-900">
                            <ShieldCheck className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-600 font-medium uppercase tracking-widest text-xs">No disclosures logged</p>
                            <p className="text-[10px] text-zinc-700 mt-1">Vulnerabilities reported via the public security portal will appear here</p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/5 overflow-hidden">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/[0.02] border-b border-white/5">
                                <div className="col-span-3 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Reporter Email</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Category</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Severity</div>
                                <div className="col-span-3 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Description</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-right">Logged At</div>
                            </div>
                            
                            {/* Table Rows */}
                            <div className="divide-y divide-white/5 bg-black">
                                {securityReports.map((report, idx) => (
                                    <div key={report.id} className="grid grid-cols-12 gap-4 px-6 py-5 hover:bg-white/[0.01] items-center transition-colors">
                                        <div className="col-span-3 font-mono text-xs text-white select-all truncate">{report.email}</div>
                                        <div className="col-span-2 text-center">
                                            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-400">
                                                {report.vulnerabilityType}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full border text-[9px] font-bold",
                                                report.severity === 'CRITICAL' && "bg-red-950/20 border-red-900/50 text-red-400",
                                                report.severity === 'HIGH' && "bg-orange-950/20 border-orange-900/50 text-orange-400",
                                                report.severity === 'MEDIUM' && "bg-amber-950/20 border-amber-900/50 text-amber-400",
                                                report.severity === 'LOW' && "bg-zinc-900 border-zinc-800 text-zinc-400"
                                            )}>
                                                {report.severity}
                                            </span>
                                        </div>
                                        <div className="col-span-3 text-xs text-zinc-400 leading-relaxed font-mono select-all pr-2">
                                            {report.description}
                                        </div>
                                        <div className="col-span-2 text-right text-[10px] text-zinc-600 font-mono">
                                            {new Date(report.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Wants Access Section */}
            {activeTab === 'WANTS_ACCESS' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-medium text-white tracking-tight">Access Ledger</h2>
                            <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-medium mt-1">
                                {accessRequests.length} request{accessRequests.length !== 1 ? 's' : ''} logged in ledger
                            </p>
                        </div>
                    </div>

                    {isLoadingAccess ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-sky-500 opacity-60" />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-700">Loading requests...</p>
                        </div>
                    ) : accessRequests.length === 0 ? (
                        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-900">
                            <Users className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-600 font-medium uppercase tracking-widest text-xs">No requests logged</p>
                            <p className="text-[10px] text-zinc-700 mt-1">Submissions from the public contact uplink page will appear here</p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/5 overflow-hidden">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/[0.02] border-b border-white/5">
                                <div className="col-span-3 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Callsign / Identifier</div>
                                <div className="col-span-3 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Direct Comm Link</div>
                                <div className="col-span-4 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Payload Content</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-right">Logged At</div>
                            </div>
                            
                            {/* Table Rows */}
                            <div className="divide-y divide-white/5 bg-black">
                                {accessRequests.map((req, idx) => (
                                    <div key={req.id} className="grid grid-cols-12 gap-4 px-6 py-5 hover:bg-white/[0.01] items-center transition-colors">
                                        <div className="col-span-3 font-mono text-xs text-white select-all truncate">{req.callsign}</div>
                                        <div className="col-span-3 font-mono text-xs text-zinc-400 select-all truncate">{req.email}</div>
                                        <div className="col-span-4 text-xs text-zinc-300 leading-relaxed font-mono select-all pr-2">
                                            {req.message}
                                        </div>
                                        <div className="col-span-2 text-right text-[10px] text-zinc-600 font-mono">
                                            {new Date(req.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmAction.type !== null}
                onClose={() => setConfirmAction({ type: null, schoolId: "", schoolName: "" })}
                onConfirm={confirmAction.type === 'DELETE' ? executeDelete : executeSuspend}
                isLoading={isLoading}
                title={confirmAction.type === 'DELETE' ? "Delete Institution" : "Suspend Institution"}
                description={confirmAction.type === 'DELETE'
                    ? `⚠️ This will permanently delete "${confirmAction.schoolName}" and all its data — students, staff, grades, records, and invoices. This action cannot be undone.`
                    : `Suspend access for "${confirmAction.schoolName}"? All active sessions will be terminated.`
                }
                confirmText={confirmAction.type === 'DELETE' ? "Delete Everything" : "Suspend"}
                variant={confirmAction.type === 'DELETE' ? "danger" : "warning"}
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                variant={alertConfig.variant}
            />

            <ManagePrincipalsModal
                isOpen={managePrincipalsSchool !== null}
                onClose={() => setManagePrincipalsSchool(null)}
                schoolId={managePrincipalsSchool?.id || ""}
                schoolName={managePrincipalsSchool?.name || ""}
            />

            <ManageOwnersModal
                isOpen={manageOwnersSchool !== null}
                onClose={() => setManageOwnersSchool(null)}
                schoolId={manageOwnersSchool?.id || ""}
                schoolName={manageOwnersSchool?.name || ""}
            />

            <WelcomeAnnouncement />
        </div>
    );
}
