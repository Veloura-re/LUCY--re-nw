import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Mail, Loader2, ArrowDownCircle, UserX, User, ShieldCheck, Copy, CheckCircle2 } from "lucide-react";
import { ConfirmationModal, AlertModal } from "@/components/ui/confirmation-modal";
import { cn } from "@/lib/utils";

interface Owner {
    id: string;
    name: string | null;
    email: string;
    photoUrl: string | null;
    createdAt: string;
}

interface Invite {
    id: string;
    email: string;
    token: string;
    createdAt: string;
    expiresAt: string;
}

interface ManageOwnersModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId: string;
    schoolName: string;
}

export function ManageOwnersModal({ isOpen, onClose, schoolId, schoolName }: ManageOwnersModalProps) {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviting, setIsInviting] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [confirmAction, setConfirmAction] = useState<{ type: 'DEMOTE' | 'REMOVE' | 'DELETE_INVITE' | null, id: string, name: string }>({ type: null, id: "", name: "" });
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && schoolId) {
            fetchOwners();
        } else {
            setNewEmail("");
            setError(null);
        }
    }, [isOpen, schoolId]);

    const fetchOwners = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/schools/${schoolId}/owners`);
            if (!res.ok) throw new Error("Failed to fetch owners");
            const data = (await res.json()) as any;
            setOwners(data.owners);
            setInvites(data.invites);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsInviting(true);

        try {
            const res = await fetch(`/api/admin/schools/${schoolId}/owners`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail })
            });

            if (!res.ok) {
                const data = (await res.json()) as any;
                throw new Error(data.error || "Failed to invite owner");
            }
            const data = (await res.json()) as any;
            
            setNewEmail("");
            fetchOwners();
            setAlertConfig({ title: "Invite Created", message: `An invitation has been created for ${newEmail}. Please remind them to check their spam/junk folder.`, isOpen: true, variant: "success" });
            
            if (!data.emailSent) {
                setTimeout(() => {
                    setAlertConfig({ title: "Email Delivery Failed", message: `The system could not deliver the email. Share this token manually: ${data.inviteToken}`, isOpen: true, variant: "error" });
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsInviting(false);
        }
    };

    const handleAction = async () => {
        const { type, id } = confirmAction;
        setIsLoading(true);

        try {
            if (type === 'DEMOTE') {
                const res = await fetch(`/api/admin/schools/${schoolId}/owners/${id}`, { method: 'PATCH' });
                if (!res.ok) throw new Error("Failed to demote owner");
            } else if (type === 'REMOVE') {
                const res = await fetch(`/api/admin/schools/${schoolId}/owners/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error("Failed to remove owner");
            } else if (type === 'DELETE_INVITE') {
                const res = await fetch(`/api/admin/schools/${schoolId}/owners/${id}?type=invite`, { method: 'DELETE' });
                if (!res.ok) throw new Error("Failed to delete invite");
            }
            fetchOwners();
        } catch (err: any) {
            setAlertConfig({ title: "Action Failed", message: err.message, isOpen: true, variant: "error" });
        } finally {
            setConfirmAction({ type: null, id: "", name: "" });
            setIsLoading(false);
        }
    };

    const copyToken = (token: string) => {
        const url = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const resetAndClose = () => {
        onClose();
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
                <DialogContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-900 text-slate-900 dark:text-white max-w-2xl rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center border border-slate-200 dark:border-zinc-800">
                                <ShieldCheck className="w-5 h-5 text-eduGreen-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-medium tracking-tight">Manage Owners</DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-zinc-500 font-medium uppercase tracking-widest text-[10px] mt-1">
                                    {schoolName}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Invite Form */}
                    <form onSubmit={handleInvite} className="mb-8 flex gap-3 items-end">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Invite New Owner</label>
                            <Input
                                type="email"
                                placeholder="owner@institution.edu"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                required
                                className="bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 rounded-xl h-12 text-slate-900 dark:text-white focus:border-eduGreen-600"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="h-12 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-semibold text-[11px] uppercase tracking-widest shadow-lg shadow-eduGreen-900/20 px-6 transition-all shrink-0"
                            isLoading={isInviting}
                        >
                            <Mail className="w-4 h-4 mr-2" /> Dispatch Invite
                        </Button>
                    </form>

                    {error && (
                        <div className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-[11px] text-red-600 dark:text-red-400 font-medium">
                            {error}
                        </div>
                    )}

                    {/* Lists */}
                    {isLoading && owners.length === 0 && invites.length === 0 ? (
                        <div className="py-20 flex justify-center items-center">
                            <Loader2 className="w-8 h-8 animate-spin text-eduGreen-600 opacity-60" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Active Owners */}
                            <div>
                                <h3 className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-3">Active Owners ({owners.length})</h3>
                                {owners.length === 0 ? (
                                    <div className="text-center py-6 bg-slate-50 dark:bg-zinc-900/20 rounded-2xl border border-slate-200 dark:border-zinc-800/50">
                                        <p className="text-[11px] text-slate-500 dark:text-zinc-500">No active owners found.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {owners.map(p => (
                                            <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/50 rounded-2xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                                        {p.photoUrl ? (
                                                            <img src={p.photoUrl} alt={p.name || ''} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{p.name || 'Unnamed'}</p>
                                                        <p className="text-[11px] text-slate-500 dark:text-zinc-500">{p.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => setConfirmAction({ type: 'DEMOTE', id: p.id, name: p.name || p.email })}
                                                        className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 h-8"
                                                    >
                                                        <ArrowDownCircle className="w-3.5 h-3.5 mr-1.5" /> Demote to Teacher
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => setConfirmAction({ type: 'REMOVE', id: p.id, name: p.name || p.email })}
                                                        className="text-[10px] font-semibold uppercase tracking-widest text-red-600 dark:text-red-500 hover:text-red-600 dark:text-red-400 hover:bg-red-500/10 h-8"
                                                    >
                                                        <UserX className="w-3.5 h-3.5 mr-1.5" /> Unlink
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Pending Invites */}
                            {invites.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-3">Pending Invites ({invites.length})</h3>
                                    <div className="space-y-3">
                                        {invites.map(inv => (
                                            <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/50 rounded-2xl border-dashed">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center border border-slate-200 dark:border-zinc-700/50 border-dashed">
                                                        <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.email}</p>
                                                        <p className="text-[10px] text-amber-600 dark:text-amber-500 uppercase tracking-widest mt-0.5">Pending Acceptance</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => copyToken(inv.token)}
                                                        className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 h-8 w-8 p-0"
                                                        title="Copy Invite Link"
                                                    >
                                                        {copiedToken === inv.token ? <CheckCircle2 className="w-4 h-4 text-eduGreen-500" /> : <Copy className="w-4 h-4" />}
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => setConfirmAction({ type: 'DELETE_INVITE', id: inv.id, name: inv.email })}
                                                        className="text-[10px] font-semibold uppercase tracking-widest text-red-600 dark:text-red-500 hover:text-red-600 dark:text-red-400 hover:bg-red-500/10 h-8"
                                                    >
                                                        <UserX className="w-3.5 h-3.5 mr-1.5" /> Revoke
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                isOpen={confirmAction.type !== null}
                onClose={() => setConfirmAction({ type: null, id: "", name: "" })}
                onConfirm={handleAction}
                isLoading={isLoading}
                title={
                    confirmAction.type === 'DEMOTE' ? "Demote Owner" : 
                    confirmAction.type === 'REMOVE' ? "Unlink User" : 
                    "Revoke Invitation"
                }
                description={
                    confirmAction.type === 'DEMOTE' ? `Are you sure you want to demote ${confirmAction.name} to a standard TEACHER role? They will lose access to school management settings but retain their data.` :
                    confirmAction.type === 'REMOVE' ? `Are you sure you want to remove ${confirmAction.name} from this school completely? They will no longer have access to this school's data, though their account will remain.` :
                    `Are you sure you want to revoke the pending invite for ${confirmAction.name}?`
                }
                confirmText={
                    confirmAction.type === 'DEMOTE' ? "Demote to Teacher" : 
                    confirmAction.type === 'REMOVE' ? "Unlink from School" : 
                    "Revoke Invite"
                }
                variant={confirmAction.type === 'DEMOTE' ? "warning" : "danger"}
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                variant={alertConfig.variant}
            />
        </>
    );
}
