"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, ArrowDownCircle, UserX, User, Copy, CheckCircle2, Crown, ShieldAlert } from "lucide-react";
import { ConfirmationModal, AlertModal } from "@/components/ui/confirmation-modal";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";

interface Principal {
    id: string;
    name: string | null;
    email: string;
    photoUrl: string | null;
    createdAt: string;
    preferences?: any;
}

interface Invite {
    id: string;
    email: string;
    token: string;
    createdAt: string;
    expiresAt: string;
}

export default function PrincipalsClient({ schoolId, schoolName }: { schoolId: string, schoolName: string }) {
    const [principals, setPrincipals] = useState<Principal[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviting, setIsInviting] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [confirmAction, setConfirmAction] = useState<{ type: 'DEMOTE' | 'REMOVE' | 'DELETE_INVITE' | null, id: string, name: string }>({ type: null, id: "", name: "" });
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    useEffect(() => {
        fetchPrincipals();
    }, []);

    const fetchPrincipals = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/school/principals`);
            if (!res.ok) throw new Error("Failed to fetch principals");
            const data = (await res.json()) as any;
            
            // Ensure preferences is parsed if it's a string
            const parsedPrincipals = data.principals.map((p: any) => {
                let prefs = p.preferences;
                if (typeof prefs === 'string') {
                    try { prefs = JSON.parse(prefs); } catch (e) { prefs = {}; }
                }
                return { ...p, preferences: prefs || {} };
            });

            setPrincipals(parsedPrincipals);
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
            const res = await fetch(`/api/school/principals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail })
            });

            if (!res.ok) {
                const data = (await res.json()) as any;
                throw new Error(data.error || "Failed to invite principal");
            }
            
            setNewEmail("");
            fetchPrincipals();
            setAlertConfig({ title: "Invite Sent", message: `An invitation has been sent to ${newEmail}.`, isOpen: true, variant: "success" });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsInviting(false);
        }
    };

    const toggleFullAccess = async (principalId: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setPrincipals(prev => prev.map(p => {
                if (p.id === principalId) {
                    return { ...p, preferences: { ...p.preferences, fullAccess: !currentStatus } };
                }
                return p;
            }));

            const res = await fetch(`/api/school/principals/${principalId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullAccess: !currentStatus })
            });
            if (!res.ok) throw new Error("Failed to update permissions");
        } catch (err: any) {
            // Revert on error
            fetchPrincipals();
            setAlertConfig({ title: "Update Failed", message: err.message, isOpen: true, variant: "error" });
        }
    };

    const handleAction = async () => {
        const { type, id } = confirmAction;
        setIsLoading(true);

        try {
            if (type === 'DEMOTE') {
                const res = await fetch(`/api/school/principals/${id}`, { 
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'DEMOTE' })
                });
                if (!res.ok) throw new Error("Failed to demote principal");
            } else if (type === 'REMOVE') {
                const res = await fetch(`/api/school/principals/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error("Failed to remove principal");
            } else if (type === 'DELETE_INVITE') {
                const res = await fetch(`/api/school/principals/${id}?type=invite`, { method: 'DELETE' });
                if (!res.ok) throw new Error("Failed to delete invite");
            }
            fetchPrincipals();
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

    return (
        <div className="space-y-10 animate-in fade-in duration-300 max-w-5xl">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-eduGreen-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">Principal Management</h1>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mt-1">Delegated Authority Control</p>
                </div>
            </div>

            {/* Invite Form */}
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-eduGreen-500/20 to-transparent" />
                
                <h3 className="text-lg font-medium text-white mb-6 tracking-tight">Dispatch Invitation</h3>
                
                <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4 items-end max-w-2xl">
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">Principal Email Address</label>
                        <Input
                            type="email"
                            placeholder="principal@institution.edu"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            required
                            className="bg-zinc-950 border-zinc-800 rounded-xl h-12 text-white focus:border-eduGreen-600"
                        />
                    </div>
                    <Button
                        type="submit"
                        className="h-12 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-semibold text-[11px] uppercase tracking-widest px-8 transition-all shrink-0 w-full md:w-auto"
                        isLoading={isInviting}
                    >
                        <Mail className="w-4 h-4 mr-2" /> Send Invite
                    </Button>
                </form>

                {error && (
                    <div className="mt-6 inline-flex items-center gap-3 p-3 rounded-xl bg-red-950/20 border border-red-900/30 text-[11px] text-red-400 font-medium">
                        {error}
                    </div>
                )}
            </div>

            {/* Lists */}
            {isLoading && principals.length === 0 && invites.length === 0 ? (
                <div className="py-32 flex justify-center items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Active Principals */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white tracking-tight">Active Principals</h3>
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full">{principals.length} Authorized</span>
                        </div>
                        
                        {principals.length === 0 ? (
                            <div className="text-center py-16 bg-zinc-950/30 rounded-3xl border border-dashed border-zinc-800/50">
                                <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">No active principals found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {principals.map(p => (
                                    <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-zinc-950/40 border border-zinc-800/50 rounded-3xl gap-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-800">
                                                {p.photoUrl ? (
                                                    <Image src={p.photoUrl} alt={p.name || ''} width={48} height={48} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5 text-zinc-500" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-base font-medium text-white">{p.name || 'Unnamed Principal'}</p>
                                                <p className="text-xs text-zinc-500 mt-0.5">{p.email}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-6 justify-between md:justify-end bg-zinc-900/30 p-3 rounded-2xl md:bg-transparent md:p-0">
                                            <div className="flex items-center gap-3 pr-6 border-r border-zinc-800">
                                                <Switch 
                                                    checked={p.preferences?.fullAccess === true}
                                                    onCheckedChange={() => toggleFullAccess(p.id, p.preferences?.fullAccess === true)}
                                                    className="data-[state=checked]:bg-eduGreen-500"
                                                />
                                                <div>
                                                    <p className="text-[11px] font-semibold text-white tracking-wide">Bypass Approvals</p>
                                                    <p className="text-[9px] text-zinc-500 tracking-widest uppercase mt-0.5">Full System Access</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => setConfirmAction({ type: 'DEMOTE', id: p.id, name: p.name || p.email })}
                                                    className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 h-9"
                                                >
                                                    <ArrowDownCircle className="w-3.5 h-3.5 mr-1.5" /> Demote
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => setConfirmAction({ type: 'REMOVE', id: p.id, name: p.name || p.email })}
                                                    className="text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-400 hover:bg-red-500/10 h-9 px-2"
                                                    title="Unlink User"
                                                >
                                                    <UserX className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Invites */}
                    {invites.length > 0 && (
                        <div className="pt-8 border-t border-zinc-900">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white tracking-tight">Pending Dispatch</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {invites.map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between p-5 bg-zinc-950/20 border border-zinc-800/50 rounded-3xl border-dashed">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                                                <Mail className="w-4 h-4 text-zinc-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{inv.email}</p>
                                                <p className="text-[9px] text-amber-500 uppercase tracking-widest mt-1">Pending Acceptance</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => copyToken(inv.token)}
                                                className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 h-8 w-8 p-0"
                                                title="Copy Invite Link"
                                            >
                                                {copiedToken === inv.token ? <CheckCircle2 className="w-4 h-4 text-eduGreen-500" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => setConfirmAction({ type: 'DELETE_INVITE', id: inv.id, name: inv.email })}
                                                className="text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
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
                onClose={() => setConfirmAction({ type: null, id: "", name: "" })}
                onConfirm={handleAction}
                isLoading={isLoading}
                title={
                    confirmAction.type === 'DEMOTE' ? "Demote Principal" : 
                    confirmAction.type === 'REMOVE' ? "Unlink User" : 
                    "Revoke Invitation"
                }
                description={
                    confirmAction.type === 'DEMOTE' ? `Are you sure you want to demote ${confirmAction.name} to a standard TEACHER role? They will lose access to school management settings.` :
                    confirmAction.type === 'REMOVE' ? `Are you sure you want to remove ${confirmAction.name} from this school completely?` :
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
        </div>
    );
}
