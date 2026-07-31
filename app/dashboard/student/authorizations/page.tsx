"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Calendar as CalendarIcon,
    Clock,
    FileText,
    CheckCircle2,
    XCircle,
    Loader2,
    Plus,
    ShieldCheck,
    Zap
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AuthorizationRequestModal } from "@/components/dashboard/authorization-request-modal";

export default function StudentAuthorizationsPage() {
    const [authorizations, setAuthorizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchAuthorizations();
    }, []);

    const fetchAuthorizations = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/user/authorizations');
            const data = (await res.json()) as any;
            setAuthorizations(data.authorizations || []);
        } catch (error) {
            toast.error("Failed to sync authorization ledger");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative">
                <div className="w-20 h-20 border-2 border-eduGreen-500/20 rounded-full animate-ping absolute inset-0" />
                <Loader2 className="w-10 h-10 text-eduGreen-500 animate-spin relative z-10" />
            </div>
            <p className="text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-[0.4em] text-[10px] mt-8">Accessing Personal Authorizations...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-300 relative pb-20">
            {/* Scanned Line Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]"
                style={{
                    backgroundImage: `repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)`,
                    backgroundSize: '100% 4px'
                }}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-200 dark:border-white/5 pb-12 relative">
                <div className="absolute -left-12 -top-12 w-64 h-64 bg-eduGreen-500/5 blur-[100px] pointer-events-none" />
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-[1px] w-8 bg-eduGreen-500" />
                        <span className="text-[10px] font-medium text-eduGreen-500 uppercase tracking-[0.5em]">Identity Token: Verified</span>
                    </div>
                    <h1 className="text-6xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic leading-none">
                        MY <span className="text-eduGreen-500">PERMISSIONS</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.3em] text-[10px] mt-4 flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4" /> Institutional Presence Waivers & Verification
                    </p>
                </div>

                <Button
                    onClick={() => setShowModal(true)}
                    className="bg-white text-black hover:bg-zinc-200 h-16 px-10 rounded-[2rem] font-bold text-[10px] uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all active:scale-95 group overflow-hidden relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white dark:via-black/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    <Plus className="mr-3 h-5 w-5" /> New Permit
                </Button>
            </div>

            {/* Records Ledger */}
            <div className="grid gap-8">
                <AnimatePresence mode="popLayout">
                    {authorizations.length > 0 ? (
                        authorizations.map((auth, idx) => (
                            <motion.div
                                key={auth.id}
                                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: idx * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <Card className={cn(
                                    "bg-white/40 dark:bg-[#050505]/40 backdrop-blur-[40px] border-zinc-200 dark:border-white/5 rounded-[3rem] overflow-hidden transition-all hover:border-zinc-300 dark:border-white/10 group relative",
                                    auth.status === 'APPROVED' && "hover:border-emerald-500/30",
                                    auth.status === 'REJECTED' && "hover:border-rose-500/30",
                                    auth.status === 'PENDING' && "hover:border-blue-500/30"
                                )}>
                                    {/* Ambient Glow */}
                                    <div className={cn(
                                        "absolute top-0 right-0 w-64 h-64 blur-[100px] opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none",
                                        auth.status === 'APPROVED' ? "bg-emerald-500" :
                                            auth.status === 'REJECTED' ? "bg-rose-500" : "bg-blue-500"
                                    )} />

                                    <CardContent className="p-10 relative z-10">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                            <div className="flex items-center gap-8">
                                                <div className={cn(
                                                    "w-20 h-20 rounded-[2rem] flex items-center justify-center border transition-all shadow-2xl relative overflow-hidden",
                                                    auth.status === 'APPROVED' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                                        auth.status === 'REJECTED' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                                                            "bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/5 text-blue-500"
                                                )}>
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                                                    {auth.status === 'APPROVED' ? <CheckCircle2 className="w-10 h-10 relative z-10" /> :
                                                        auth.status === 'REJECTED' ? <XCircle className="w-10 h-10 relative z-10" /> :
                                                            <Clock className="w-10 h-10 relative z-10 animate-pulse" />}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-4">
                                                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight uppercase italic leading-none">Absence Permit</h3>
                                                        <Badge className={cn(
                                                            "uppercase tracking-[0.3em] text-[8px] font-black px-4 py-1.5 rounded-full border shadow-lg h-fit",
                                                            auth.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-emerald-900/20" :
                                                                auth.status === 'REJECTED' ? "bg-rose-500/10 text-rose-500 border-rose-500/30 shadow-rose-900/20" :
                                                                    "bg-blue-500/10 text-blue-500 border-blue-500/30 shadow-blue-900/20"
                                                        )}>
                                                            {auth.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-6 mt-4 text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.2em]">
                                                        <div className="flex items-center gap-2.5">
                                                            <CalendarIcon className="w-4 h-4 text-zinc-700" />
                                                            <span className="text-zinc-600 dark:text-zinc-400">{new Date(auth.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                            <Zap className="w-3 h-3 text-zinc-800 dark:text-zinc-200" />
                                                            <span className="text-zinc-600 dark:text-zinc-400">{new Date(auth.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 max-w-lg p-6 bg-white/40 dark:bg-zinc-950/40 rounded-[2rem] border border-zinc-200 dark:border-white/5 text-xs font-medium text-zinc-600 dark:text-zinc-400 italic leading-relaxed shadow-inner">
                                                <div className="text-[8px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest mb-2 not-italic">Justification Log</div>
                                                "{auth.reason}"
                                            </div>

                                            <div className="text-right hidden lg:block">
                                                <p className="text-[8px] font-bold text-zinc-700 uppercase tracking-[0.4em] mb-2">Request Hash</p>
                                                <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-500">{auth.id.split('-')[0].toUpperCase()}</p>
                                                <div className="mt-4 flex items-center justify-end gap-2 text-[9px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                                                    {new Date(auth.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>

                                    {/* Bottom Progress Bar Decoration */}
                                    <div className={cn(
                                        "absolute bottom-0 left-0 h-1 transition-all duration-300 group-hover:w-full w-12",
                                        auth.status === 'APPROVED' ? "bg-emerald-500/40" :
                                            auth.status === 'REJECTED' ? "bg-rose-500/40" : "bg-blue-500/40"
                                    )} />
                                </Card>
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-32 border-4 border-dashed border-zinc-200 dark:border-white/5 rounded-[4rem] group hover:border-zinc-300 dark:border-white/10 transition-all"
                        >
                            <div className="relative inline-block mb-8">
                                <div className="absolute inset-0 bg-eduGreen-500/20 blur-[40px] rounded-full animate-pulse" />
                                <FileText className="w-20 h-20 text-zinc-800 dark:text-zinc-200 mx-auto relative z-10" />
                            </div>
                            <div className="text-zinc-600 font-black uppercase tracking-[0.8em] text-xl italic ml-4">CLEAN RECORD</div>
                            <p className="text-zinc-800 dark:text-zinc-200 mt-6 text-[10px] font-bold uppercase tracking-[0.4em]">No active absence permits recorded in the system registry.</p>
                            <Button
                                onClick={() => setShowModal(true)}
                                variant="ghost"
                                className="mt-12 text-eduGreen-500 hover:text-eduGreen-400 hover:bg-eduGreen-500/5 font-black uppercase tracking-[0.4em] text-[10px] h-14 px-10 rounded-2xl border border-eduGreen-500/20"
                            >
                                Initiate Permit Request
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AuthorizationRequestModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={fetchAuthorizations}
            />
        </div>
    );
}
