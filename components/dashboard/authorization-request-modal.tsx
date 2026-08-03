"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar as CalendarIcon, FileText, Globe, Fingerprint, ShieldCheck, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AuthorizationRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId?: string;
    isStaffLeave?: boolean;
    onSuccess?: () => void;
}

export function AuthorizationRequestModal({ isOpen, onClose, studentId: initialStudentId, isStaffLeave, onSuccess }: AuthorizationRequestModalProps) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");
    const [studentId, setStudentId] = useState(initialStudentId || "");
    const [children, setChildren] = useState<any[]>([]);
    const [loadingChildren, setLoadingChildren] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && !isStaffLeave) {
            fetchChildren();
        }
    }, [isOpen, isStaffLeave]);

    const fetchChildren = async () => {
        setLoadingChildren(true);
        try {
            const res = await fetch('/api/parent/children');
            const data = await res.json() as any;
            if (data.students) {
                setChildren(data.students);
                if (data.students.length === 1) {
                    setStudentId(data.students[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to link family schools", error);
        } finally {
            setLoadingChildren(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: 
        // - Parents need a studentId. 
        // - Staff need isStaffLeave to be true.
        // - Students have neither of those, but we still need the dates/reason.
        if (!startDate || !endDate || !reason) {
            toast.error("All mission parameters required");
            return;
        }

        // Specific check for parents (who have children loaded)
        if (children.length > 0 && !isStaffLeave) {
            if (!studentId) {
                toast.error("Target identity required for family requests");
                return;
            }
            // Verify studentId is in children list
            const isOurChild = children.some(c => c.id === studentId);
            if (!isOurChild) {
                toast.error("Security breach: Target student not in your family sector");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const endpoint = children.length > 0 ? '/api/parent/authorizations' : '/api/user/authorizations';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId,
                    startDate,
                    endDate,
                    reason,
                    isStaffLeave
                })
            });

            if (res.ok) {
                toast.success(isStaffLeave ? "Leave request submitted to Command" : "Absence request synchronized");
                onClose();
                setReason("");
                setStartDate("");
                setEndDate("");
                if (onSuccess) onSuccess();
            } else {
                const data = await res.json() as any;
                toast.error(data?.error || "Smart link synchronization failure");
            }
        } catch (error) {
            toast.error("Quantum bridge error detected");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white/95 dark:bg-[#050505]/95 backdrop-blur-[50px] border-slate-200/50 dark:border-white/5 rounded-[3rem] p-0 overflow-hidden max-w-xl shadow-[0_0_80px_rgba(0,0,0,0.1)] dark:shadow-[0_0_80px_rgba(0,0,0,1)] border-t-slate-200/50 dark:border-t-white/10">
                {/* Ambient Glows */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-eduGreen-500/10 blur-[100px]" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/5 blur-[100px]" />
                </div>

                <div className="relative h-2 w-full bg-gradient-to-r from-transparent via-eduGreen-500/40 to-transparent" />

                <DialogHeader className="p-10 pb-6 relative">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-slate-100/50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-inner">
                                <FileText className="w-6 h-6 text-eduGreen-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-4xl font-medium text-slate-900 dark:text-white tracking-tighter uppercase italic">
                                    {isStaffLeave ? "Staff" : "Absence"} <span className="text-eduGreen-500">Permit</span>
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-zinc-500 font-medium uppercase tracking-[0.3em] text-[8px] mt-1">
                                    Authorization System
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="hidden md:flex flex-col items-end gap-1 opacity-40">
                            <ShieldCheck className="w-5 h-5 text-slate-400 dark:text-zinc-600" />
                            <span className="text-[7px] font-mono text-slate-400 dark:text-zinc-600">SECURE_LINK_ACTIVE</span>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-10 pt-0 space-y-8 relative">
                    {/* Student Selection (for parents) */}
                    {!isStaffLeave && !initialStudentId && children.length > 0 && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-medium text-slate-500 dark:text-zinc-600 uppercase tracking-[0.2em] ml-2">Target Identity</label>
                            <div className="relative group">
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-700 group-hover:text-eduGreen-500 transition-all pointer-events-none" />
                                <select
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    className="w-full h-16 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white px-6 font-medium text-sm focus:ring-1 focus:ring-eduGreen-500 focus:border-eduGreen-500/30 transition-all outline-none appearance-none"
                                    required
                                >
                                    <option value="" disabled className="bg-white dark:bg-zinc-950">Select student from link list...</option>
                                    {children.map(child => (
                                        <option key={child.id} value={child.id} className="bg-white dark:bg-zinc-950">
                                            {child.firstName} {child.lastName} ({child.studentCode})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-medium text-slate-500 dark:text-zinc-600 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <CalendarIcon className="w-3 h-3" /> Start Boundary
                            </label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-16 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-eduGreen-500/20 focus:border-eduGreen-500/30 transition-all px-4"
                                required
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-medium text-slate-500 dark:text-zinc-600 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <CalendarIcon className="w-3 h-3" /> End Boundary
                            </label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-16 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-eduGreen-500/20 focus:border-eduGreen-500/30 transition-all px-4"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center ml-2">
                            <label className="text-[10px] font-medium text-slate-500 dark:text-zinc-600 uppercase tracking-[0.2em]">Context / Justification</label>
                            <span className="text-[8px] font-medium text-slate-400 dark:text-zinc-800 uppercase tracking-widest italic leading-none">Internal Protocol Only</span>
                        </div>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Detail the cause for institutional absence / leave system..."
                            className="min-h-[140px] bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-white/5 rounded-[2rem] text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-eduGreen-500/20 focus:border-eduGreen-500/30 resize-none p-6 placeholder:text-slate-400 dark:placeholder:text-zinc-800 dark:text-zinc-200 transition-all"
                            required
                        />
                    </div>

                    <div className="pt-4 grid gap-4">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-20 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-[2rem] font-medium text-[10px] uppercase tracking-[0.4em] transition-all relative overflow-hidden group shadow-2xl active:scale-95"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            {isSubmitting ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin text-white dark:text-black" />
                                    Synchronizing...
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Globe className="w-4 h-4" />
                                    Synchronize Protocol
                                </div>
                            )}
                        </Button>
                        <p className="text-center text-[8px] font-medium text-slate-400 dark:text-zinc-800 uppercase tracking-[0.3em] italic">
                            Authorization pending institutional overlord verification
                        </p>
                    </div>
                </form>

                {/* Scanned Line Overlay Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] from-slate-900/10 dark:from-white/10"
                    style={{
                        backgroundImage: `repeating-linear-gradient(0deg, var(--tw-gradient-stops), transparent 1px, transparent 2px)`,
                        backgroundSize: '100% 4px'
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}
