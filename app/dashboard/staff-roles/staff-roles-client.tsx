"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, UserX, User, Copy, CheckCircle2, Briefcase, Coins, Scroll } from "lucide-react";
import { ConfirmationModal, AlertModal } from "@/components/ui/confirmation-modal";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { INVITABLE_STAFF_ROLES, STAFF_ROLE_LABELS, STAFF_ROLE_SCOPE, type InvitableStaffRole } from "@/lib/staff-roles";

interface StaffMember {
    id: string;
    name: string | null;
    email: string;
    photoUrl: string | null;
    role: InvitableStaffRole;
    verified: boolean;
    createdAt: string;
}

interface Invite {
    id: string;
    email: string;
    role: InvitableStaffRole;
    token: string;
    createdAt: string;
    expiresAt: string;
}

const ROLE_ICONS = { ACCOUNTANT: Coins, RECORDER: Scroll } as const;

type ConfirmState = { type: 'REMOVE' | 'REVOKE' | null; id: string; email: string; name: string };
const NO_CONFIRM: ConfirmState = { type: null, id: "", email: "", name: "" };

export default function StaffRolesClient({ schoolName }: { schoolName: string }) {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviting, setIsInviting] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [role, setRole] = useState<InvitableStaffRole>("ACCOUNTANT");
    const [error, setError] = useState<string | null>(null);

    const [confirmAction, setConfirmAction] = useState<ConfirmState>(NO_CONFIRM);
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const fetchStaff = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/school/staff-roles`);
            if (!res.ok) throw new Error("Failed to fetch finance and records staff");
            const data = (await res.json()) as { staff: StaffMember[]; invites: Invite[] };
            setStaff(data.staff);
            setInvites(data.invites);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsInviting(true);

        try {
            const res = await fetch(`/api/school/staff-roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, role })
            });
            const data = (await res.json()) as any;
            if (!res.ok) throw new Error(data.error || "Failed to send invitation");

            const invitedEmail = newEmail;
            setNewEmail("");
            fetchStaff();
            setAlertConfig({ title: "Invite Created", message: `${STAFF_ROLE_LABELS[role]} invitation created for ${invitedEmail}. Please remind them to check their spam/junk folder.`, isOpen: true, variant: "success" });

            if (!data.emailSent) {
                setTimeout(() => {
                    const errorMsg = data.emailError ? `Reason: ${data.emailError}` : "The system could not deliver the email.";
                    setAlertConfig({ title: "Email Delivery Failed", message: `${errorMsg} Share this invitation link manually: ${window.location.origin}/invite/${data.inviteToken}`, isOpen: true, variant: "error" });
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsInviting(false);
        }
    };

    const handleAction = async () => {
        const { type, id, email } = confirmAction;
        setIsLoading(true);

        try {
            if (type === 'REMOVE') {
                // Same removal flow as every other staff member, including Owner approval for directors.
                const res = await fetch(`/api/school/teachers/delete`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = (await res.json().catch(() => ({}))) as any;
                if (!res.ok) throw new Error(data.error || "Failed to remove staff member");
                if (data.pendingApproval) {
                    setAlertConfig({ title: "Approval Required", message: data.message || "A removal request was sent to the Owner.", isOpen: true, variant: "info" });
                }
            } else if (type === 'REVOKE') {
                const res = await fetch(`/api/school/staff-roles?inviteId=${encodeURIComponent(id)}`, { method: 'DELETE' });
                if (!res.ok) throw new Error("Failed to revoke invitation");
            }
            fetchStaff();
        } catch (err: any) {
            setAlertConfig({ title: "Action Failed", message: err.message, isOpen: true, variant: "error" });
        } finally {
            setConfirmAction(NO_CONFIRM);
            setIsLoading(false);
        }
    };

    const copyToken = (token: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-300 max-w-5xl">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-eduGreen-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Finance & Records Staff</h1>
                    <p className="text-xs text-zinc-600 dark:text-zinc-500 uppercase tracking-widest font-medium mt-1">{schoolName} // Delegated Departments</p>
                </div>
            </div>

            {/* Invite Form */}
            <div className="bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-300 dark:border-zinc-800/50 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-eduGreen-500/20 to-transparent" />

                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-6 tracking-tight">Dispatch Invitation</h3>

                <form onSubmit={handleInvite} className="space-y-6 max-w-2xl">
                    <fieldset className="space-y-2">
                        <legend className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Role</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {INVITABLE_STAFF_ROLES.map(option => {
                                const Icon = ROLE_ICONS[option];
                                const selected = role === option;
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => setRole(option)}
                                        className={cn(
                                            "flex items-start gap-4 p-4 min-h-[44px] rounded-2xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eduGreen-500",
                                            selected
                                                ? "border-eduGreen-500/60 bg-eduGreen-500/10"
                                                : "border-zinc-300 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/40 hover:border-zinc-400 dark:hover:border-zinc-700"
                                        )}
                                    >
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", selected ? "border-eduGreen-500/40 bg-eduGreen-500/10" : "border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900")}>
                                            <Icon className={cn("w-5 h-5", selected ? "text-eduGreen-500" : "text-zinc-600 dark:text-zinc-500")} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{STAFF_ROLE_LABELS[option]}</p>
                                            <p className="text-[11px] text-zinc-600 dark:text-zinc-500 mt-0.5 leading-snug">{STAFF_ROLE_SCOPE[option]}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2 w-full">
                            <label htmlFor="staff-email" className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">{STAFF_ROLE_LABELS[role]} Email Address</label>
                            <Input
                                id="staff-email"
                                type="email"
                                placeholder={`${role.toLowerCase()}@institution.edu`}
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                required
                                className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 rounded-xl h-12 text-zinc-900 dark:text-white focus:border-eduGreen-600"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="h-12 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-semibold text-[11px] uppercase tracking-widest px-8 transition-all shrink-0 w-full md:w-auto"
                            isLoading={isInviting}
                        >
                            <Mail className="w-4 h-4 mr-2" /> Send Invite
                        </Button>
                    </div>
                </form>

                {error && (
                    <div role="alert" className="mt-6 inline-flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-[11px] text-red-600 dark:text-red-400 font-medium">
                        {error}
                    </div>
                )}
            </div>

            {/* Lists */}
            {isLoading && staff.length === 0 && invites.length === 0 ? (
                <div className="py-32 flex justify-center items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Active staff */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white tracking-tight">Active Staff</h3>
                            <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full">{staff.length} Authorized</span>
                        </div>

                        {staff.length === 0 ? (
                            <div className="text-center py-16 bg-white/30 dark:bg-zinc-950/30 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800/50">
                                <p className="text-[11px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest font-medium">No accountants or recorders yet. Send an invitation above.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {staff.map(member => (
                                    <div key={member.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/40 dark:bg-zinc-950/40 border border-zinc-300 dark:border-zinc-800/50 rounded-3xl gap-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-300 dark:border-zinc-800">
                                                {member.photoUrl ? (
                                                    <Image unoptimized src={member.photoUrl} alt={member.name || ''} width={48} height={48} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5 text-zinc-600 dark:text-zinc-500" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-base font-medium text-zinc-900 dark:text-white">{member.name || `Unnamed ${STAFF_ROLE_LABELS[member.role]}`}</p>
                                                <p className="text-xs text-zinc-600 dark:text-zinc-500 mt-0.5">{member.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 justify-between md:justify-end">
                                            <span className="text-[10px] font-semibold uppercase tracking-widest text-eduGreen-600 dark:text-eduGreen-400 bg-eduGreen-500/10 border border-eduGreen-500/30 px-3 py-1.5 rounded-full">{STAFF_ROLE_LABELS[member.role]}</span>
                                            <Button
                                                variant="ghost"
                                                onClick={() => setConfirmAction({ type: 'REMOVE', id: member.id, email: member.email, name: member.name || member.email })}
                                                className="text-red-600 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 h-11 w-11 p-0 focus-visible:ring-2 focus-visible:ring-red-500"
                                                title="Remove from school"
                                                aria-label={`Remove ${member.name || member.email} from school`}
                                            >
                                                <UserX className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Invites */}
                    {invites.length > 0 && (
                        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-900">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white tracking-tight">Pending Dispatch</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {invites.map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between p-5 bg-white/20 dark:bg-zinc-950/20 border border-zinc-300 dark:border-zinc-800/50 rounded-3xl border-dashed gap-3">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-300 dark:border-zinc-800 shrink-0">
                                                <Mail className="w-4 h-4 text-zinc-600 dark:text-zinc-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{inv.email}</p>
                                                <p className="text-[9px] text-amber-600 dark:text-amber-500 uppercase tracking-widest mt-1">{STAFF_ROLE_LABELS[inv.role]} // Pending Acceptance</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                onClick={() => copyToken(inv.token)}
                                                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/5 h-11 w-11 p-0 focus-visible:ring-2 focus-visible:ring-eduGreen-500"
                                                title="Copy Invite Link"
                                                aria-label={`Copy invitation link for ${inv.email}`}
                                            >
                                                {copiedToken === inv.token ? <CheckCircle2 className="w-4 h-4 text-eduGreen-500" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => setConfirmAction({ type: 'REVOKE', id: inv.id, email: inv.email, name: inv.email })}
                                                className="text-red-600 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 h-11 w-11 p-0 focus-visible:ring-2 focus-visible:ring-red-500"
                                                title="Revoke invitation"
                                                aria-label={`Revoke invitation for ${inv.email}`}
                                            >
                                                <UserX className="w-4 h-4" />
                                            </Button>
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
                onClose={() => setConfirmAction(NO_CONFIRM)}
                onConfirm={handleAction}
                isLoading={isLoading}
                title={confirmAction.type === 'REMOVE' ? "Remove From School" : "Revoke Invitation"}
                description={
                    confirmAction.type === 'REMOVE'
                        ? `Are you sure you want to remove ${confirmAction.name} from this school? They will immediately lose access to its finance or records.`
                        : `Are you sure you want to revoke the pending invite for ${confirmAction.name}?`
                }
                confirmText={confirmAction.type === 'REMOVE' ? "Remove From School" : "Revoke Invite"}
                variant="danger"
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                variant={alertConfig.variant}
            />
        </div>
    );
}
