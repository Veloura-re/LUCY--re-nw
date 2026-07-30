'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Plus, School, Users, GraduationCap, Copy, CheckCircle2,
    AlertCircle, Loader2, Trash2, Power, PowerOff,
    X, ShieldCheck, Search, SlidersHorizontal
} from "lucide-react";
import { ConfirmationModal, AlertModal } from "@/components/ui/confirmation-modal";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { ManagePrincipalsModal } from "@/components/admin/manage-principals-modal";
import { ManageOwnersModal } from "@/components/admin/manage-owners-modal";
import { toast } from "sonner";

interface SchoolType {
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

export default function SchoolsLedgerPage() {
    const [schools, setSchools] = useState<SchoolType[]>([]);
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

    // Filtering & Searching States
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'SUSPENDED'>('ALL');

    const [confirmAction, setConfirmAction] = useState<{ type: 'SUSPEND' | 'DELETE' | null, schoolId: string, schoolName: string }>({ type: null, schoolId: "", schoolName: "" });
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });
    const [managePrincipalsSchool, setManagePrincipalsSchool] = useState<{ id: string, name: string } | null>(null);
    const [manageOwnersSchool, setManageOwnersSchool] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        fetchSchools();
    }, []);

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
            toast.success("School suspended successfully");
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
            const res = await fetch(`/api/admin/schools/${schoolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ACTIVE' }),
            });
            if (!res.ok) throw new Error('Failed to activate school');
            toast.success("School activated successfully");
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
            toast.success("School purged successfully");
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

    // Client-side Filtering
    const filteredSchools = schools.filter(school => {
        const matchesSearch = school.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              school.schoolCode.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || school.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-orbitron tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                        <School className="w-6 h-6 text-eduGreen-500" />
                        INSTITUTION LEDGER
                    </h1>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest font-medium mt-1">
                        Register, deploy, and manage distinct school instances
                    </p>
                </div>
                <Button
                    onClick={() => { setShowForm(true); setInviteToken(null); setInviteUrl(null); }}
                    className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-11 px-6 rounded-xl font-semibold text-[11px] uppercase tracking-widest shadow-xl shadow-eduGreen-900/30 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    Provision School
                </Button>
            </div>

            {/* Create Form */}
            {showForm && !inviteToken && (
                <div className="relative rounded-2xl border border-eduGreen-500/20 bg-eduGreen-500/5 p-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-eduGreen-500/40 to-transparent" />
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center">
                                <Plus className="w-4 h-4 text-eduGreen-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Provision New Institution</h3>
                                <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest font-medium mt-0.5">Deploy a new school environment</p>
                            </div>
                        </div>
                        <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleCreateSchool} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Institution Name</label>
                            <Input
                                placeholder="e.g. International Academy"
                                value={newSchoolName}
                                onChange={e => setNewSchoolName(e.target.value)}
                                required
                                className="bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-xl h-12 text-zinc-900 dark:text-white focus:border-eduGreen-600"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Owner Email</label>
                            <Input
                                type="email"
                                placeholder="owner@institution.edu"
                                value={ownerEmail}
                                onChange={e => setOwnerEmail(e.target.value)}
                                required
                                className="bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-xl h-12 text-zinc-900 dark:text-white focus:border-eduGreen-600"
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
                <div className="relative rounded-2xl border border-eduGreen-500/20 bg-white dark:bg-zinc-950 p-8 animate-in fade-in zoom-in-95 duration-400 shadow-2xl">
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
                                <div className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-5 py-3.5 font-mono text-xl text-eduGreen-400 tracking-[0.25em] text-center">
                                    {inviteToken}
                                </div>
                                <button
                                    onClick={() => copyToClipboard(inviteToken, 'token')}
                                    className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500/30 flex items-center justify-center text-zinc-600 dark:text-zinc-500 hover:text-eduGreen-400 transition-all"
                                >
                                    {copied === 'token' ? <CheckCircle2 className="w-4 h-4 text-eduGreen-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">🔗 Invite URL</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-3.5 font-mono text-[10px] text-zinc-600 dark:text-zinc-400 truncate">
                                    {inviteUrl}
                                </div>
                                <button
                                    onClick={() => copyToClipboard(inviteUrl || '', 'url')}
                                    className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500/30 flex items-center justify-center text-zinc-600 dark:text-zinc-500 hover:text-eduGreen-400 transition-all"
                                >
                                    {copied === 'url' ? <CheckCircle2 className="w-4 h-4 text-eduGreen-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={() => { setInviteToken(null); setInviteUrl(null); setShowForm(false); }}
                        className="w-full h-11 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-500 hover:text-white rounded-xl font-semibold text-[10px] uppercase tracking-widest transition-all"
                    >
                        Done
                    </Button>
                </div>
            )}

            {/* Filtering Settings Panel */}
            <div className="bg-zinc-100/40 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-600 dark:text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search school name or code..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl h-10 pl-9 pr-4 text-xs text-zinc-900 dark:text-white focus:border-eduGreen-500 focus:outline-none placeholder-zinc-600"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                    <SlidersHorizontal className="w-4 h-4 text-zinc-600 dark:text-zinc-500 mr-2 flex-shrink-0" />
                    {(['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                                statusFilter === status
                                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-400 dark:border-zinc-700"
                                    : "bg-transparent text-zinc-600 dark:text-zinc-500 border-transparent hover:text-zinc-400"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* School Ledger Table */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-eduGreen-600 opacity-60" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-700">Loading ledger...</p>
                </div>
            ) : filteredSchools.length === 0 ? (
                <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-900">
                    <School className="w-10 h-10 text-zinc-800 dark:text-zinc-200 mx-auto mb-4" />
                    <p className="text-zinc-600 font-medium uppercase tracking-widest text-xs">No schools discovered</p>
                    <p className="text-[10px] text-zinc-700 mt-1">Adjust filters or provision your first institution above</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-200 dark:bg-white/5 border-b border-zinc-200 dark:border-white/5">
                        <div className="col-span-4 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Institution</div>
                        <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Staff</div>
                        <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Students</div>
                        <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Status</div>
                        <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-right">Actions</div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-white/5 bg-white dark:bg-black">
                        {filteredSchools.map((school) => (
                            <div key={school.id} className="grid grid-cols-12 gap-4 px-6 py-5 hover:bg-zinc-200 dark:hover:bg-zinc-900/30 items-center transition-colors text-zinc-900 dark:text-white">
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                                        <School className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-xs">{school.name}</h4>
                                        <p className="text-[9px] text-zinc-600 dark:text-zinc-500 font-mono mt-0.5 select-all">{school.schoolCode}</p>
                                    </div>
                                </div>
                                <div className="col-span-2 text-center text-xs font-mono text-zinc-600 dark:text-zinc-400">{school._count.users}</div>
                                <div className="col-span-2 text-center text-xs font-mono text-zinc-600 dark:text-zinc-400">{school._count.students}</div>
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
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-amber-900/40 hover:text-amber-400 text-zinc-600 dark:text-zinc-500 text-[10px] font-semibold uppercase tracking-widest transition-all"
                                            title="Suspend"
                                        >
                                            <PowerOff className="w-3 h-3" />
                                            <span className="hidden lg:block">Suspend</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleActivateSchool(school.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-900/40 hover:text-eduGreen-400 text-zinc-600 dark:text-zinc-500 text-[10px] font-semibold uppercase tracking-widest transition-all"
                                            title="Activate"
                                        >
                                            <Power className="w-3 h-3" />
                                            <span className="hidden lg:block">Activate</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setManageOwnersSchool({ id: school.id, name: school.name })}
                                        className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-purple-900/40 hover:text-purple-400 text-zinc-600 flex items-center justify-center transition-all"
                                        title="Manage Owners"
                                    >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setManagePrincipalsSchool({ id: school.id, name: school.name })}
                                        className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-blue-900/40 hover:text-blue-400 text-zinc-600 flex items-center justify-center transition-all"
                                        title="Manage Principals"
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setConfirmAction({ type: 'DELETE', schoolId: school.id, schoolName: school.name })}
                                        className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-red-900/40 hover:text-red-400 text-zinc-600 flex items-center justify-center transition-all"
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
        </div>
    );
}
