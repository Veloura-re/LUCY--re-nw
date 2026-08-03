"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText, MagneticButton } from "@/components/public/animations";

interface Comment { id: string; callsign: string; message: string; emoji: string; createdAt: string; }

const EMOJIS = ["🔭", "⚡", "🛸", "🧠", "🌐", "⬡", "🔒", "🚀", "💡", "🌍", "🤖", "✨"];

function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

export default function Wall() {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ callsign: "", message: "", emoji: "🔭" });
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "limit">("idle");

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetch("/api/public/comments");
            if (res.ok) {
                const data = (await res.json()) as { comments?: Comment[] };
                setComments(data.comments ?? []);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchComments();
        const interval = setInterval(fetchComments, 15000); // poll every 15s
        return () => clearInterval(interval);
    }, [fetchComments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.callsign.trim() || !form.message.trim()) return;
        setStatus("loading");
        try {
            const res = await fetch("/api/public/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.status === 429) { setStatus("limit"); return; }
            if (!res.ok) { setStatus("error"); return; }
            const data = (await res.json()) as { comment: Comment };
            setComments(prev => [data.comment, ...prev]);
            setForm({ callsign: "", message: "", emoji: "🔭" });
            setStatus("success");
            setTimeout(() => setStatus("idle"), 3000);
        } catch {
            setStatus("error");
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-zinc-900 dark:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-4 transition-colors">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <motion.div whileHover={{ scale: 1.12, rotate: 5 }} className="w-6 h-6 bg-slate-900 dark:bg-white flex items-center justify-center">
                            <span className="text-zinc-900 dark:text-white dark:text-black font-black text-xs">L</span>
                        </motion.div>
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">lucy_os</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle className="scale-90" />
                        <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />back_to_home</Button></Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-24 sm:pt-32 pb-20 sm:pb-40 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto space-y-12 sm:space-y-20">

                    {/* Hero */}
                    <section className="space-y-6 sm:space-y-8">
                        <Reveal className="flex items-center gap-3 sm:gap-4 text-slate-400 dark:text-zinc-500">
                            <MessageSquare className="w-4 h-4 shrink-0" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] font-bold">signal_wall // public_messages</span>
                            <div className="ml-auto flex items-center gap-2 text-[9px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest">
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.3, repeat: Infinity }} className="w-1.5 h-1.5 bg-slate-900 dark:bg-white rounded-full" />
                                live
                            </div>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
                                signal<br /><GlitchText className="text-slate-400 dark:text-zinc-800">wall.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-slate-500 dark:text-zinc-500 text-base sm:text-lg leading-relaxed max-w-xl">
                                leave a message for the community. public messages from users around the world — live and unfiltered.
                            </p>
                        </Reveal>
                    </section>

                    {/* Submit form */}
                    <Reveal>
                        <form onSubmit={handleSubmit} className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/30 p-8 space-y-6 rounded-xl dark:rounded-none">
                            <div className="text-[9px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest mb-2 font-bold">new_message</div>

                            {/* Emoji picker */}
                            <div className="space-y-2">
                                <div className="text-[9px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest font-bold">signal_icon</div>
                                <div className="flex flex-wrap gap-2">
                                    {EMOJIS.map(e => (
                                        <motion.button key={e} type="button" onClick={() => setForm(f => ({ ...f, emoji: e }))}
                                            whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                                            className={`w-10 h-10 border text-lg transition-all rounded-md dark:rounded-none ${form.emoji === e ? "border-slate-400 bg-slate-200 dark:border-white/40 dark:bg-white/10 shadow-sm" : "border-slate-200 bg-white dark:bg-transparent dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20"}`}
                                        >{e}</motion.button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="text-[9px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest font-bold">callsign</div>
                                    <input
                                        type="text"
                                        maxLength={40}
                                        required
                                        value={form.callsign}
                                        onChange={e => setForm(f => ({ ...f, callsign: e.target.value }))}
                                        placeholder="your_handle"
                                        className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/5 focus:border-slate-400 dark:focus:border-zinc-300 dark:border-white/20 outline-none px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-700 transition-colors rounded-md dark:rounded-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[9px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest font-bold">message</div>
                                        <div className={`text-[8px] uppercase tracking-widest transition-colors font-bold ${form.message.length > 250 ? "text-red-600 dark:text-red-500" : "text-slate-500 dark:text-zinc-700"}`}>{form.message.length}/280</div>
                                    </div>
                                    <textarea
                                        rows={3}
                                        maxLength={280}
                                        required
                                        value={form.message}
                                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                        placeholder="transmit your signal..."
                                        className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/5 focus:border-slate-400 dark:focus:border-zinc-300 dark:border-white/20 outline-none px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-700 resize-none transition-colors rounded-md dark:rounded-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <MagneticButton>
                                    <button type="submit" disabled={status === "loading" || status === "success"} className="h-12 px-8 bg-slate-900 text-zinc-900 dark:text-white dark:bg-white dark:text-black text-[10px] uppercase tracking-widest font-bold hover:bg-slate-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center gap-2 rounded-md dark:rounded-none">
                                        {status === "loading" ? (
                                            <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="w-3 h-3 border border-white dark:border-black border-t-transparent rounded-full" />routing...</>
                                        ) : status === "success" ? (
                                            <>✓ transmitted</>
                                        ) : (
                                            <>transmit <Send className="w-3 h-3" /></>
                                        )}
                                    </button>
                                </MagneticButton>
                                <AnimatePresence>
                                    {status === "limit" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[9px] text-red-600 dark:text-red-500 uppercase tracking-widest font-bold">daily limit reached for this callsign</motion.div>}
                                    {status === "error" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[9px] text-red-600 dark:text-red-500 uppercase tracking-widest font-bold">message_failed — try again</motion.div>}
                                </AnimatePresence>
                            </div>
                        </form>
                    </Reveal>

                    {/* Comment feed */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Reveal className="flex items-center gap-3 text-slate-400 dark:text-zinc-500">
                                <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                                <span className="text-[10px] uppercase tracking-[0.4em]">incoming_signals // {comments.length}_received</span>
                            </Reveal>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }} className="inline-block w-4 h-4 border border-slate-400 dark:border-white/20 border-t-slate-900 dark:border-t-white/80 rounded-full" />
                                <div className="text-[9px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest mt-4">fetching_signals...</div>
                            </div>
                        ) : comments.length === 0 ? (
                            <div className="py-20 text-center text-slate-500 dark:text-zinc-700 text-[10px] uppercase tracking-widest">no messages yet — be first to signal</div>
                        ) : (
                            <div className="space-y-px border border-slate-200 dark:border-white/5 overflow-hidden rounded-xl dark:rounded-none">
                                <AnimatePresence>
                                    {comments.map((c, i) => (
                                        <motion.div
                                            key={c.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ delay: i < 10 ? i * 0.04 : 0 }}
                                            className="bg-white dark:bg-black border-b last:border-b-0 border-slate-200 dark:border-white/5 p-6 flex gap-5 group hover:bg-slate-50 dark:hover:bg-zinc-900/10 transition-colors cursor-default"
                                        >
                                            <div className="text-2xl shrink-0 mt-0.5">{c.emoji}</div>
                                            <div className="flex-1 space-y-2 min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-bold text-sm uppercase tracking-tight text-slate-900 dark:text-white">{c.callsign}</span>
                                                    <motion.div animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.2 }} className="text-[9px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest">{timeAgo(c.createdAt)}</motion.div>
                                                </div>
                                                <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed break-words">{c.message}</p>
                                                <div className="h-px bg-slate-200 dark:bg-zinc-900 overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.8, delay: i * 0.04 }} className="h-full bg-slate-300 dark:bg-white/5" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <PageFooter id="SIGNAL_WALL" links={[{ href: "/", label: "home" }, { href: "/about", label: "about" }, { href: "/contact", label: "contact" }]} />
        </div>
    );
}
