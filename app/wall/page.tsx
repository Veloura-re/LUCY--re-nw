"use client";

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
                const data = await res.json();
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
            const data = await res.json();
            setComments(prev => [data.comment, ...prev]);
            setForm({ callsign: "", message: "", emoji: "🔭" });
            setStatus("success");
            setTimeout(() => setStatus("idle"), 3000);
        } catch {
            setStatus("error");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono lowercase tracking-tight">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-md px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <motion.div whileHover={{ scale: 1.12, rotate: 5 }} className="w-6 h-6 bg-white flex items-center justify-center">
                            <span className="text-black font-black text-xs">L</span>
                        </motion.div>
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_academia</span>
                    </Link>
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-4xl mx-auto space-y-20">

                    {/* Hero */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <MessageSquare className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">signal_wall // public_transmissions</span>
                            <div className="ml-auto flex items-center gap-2 text-[9px] text-zinc-700 uppercase tracking-widest">
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.3, repeat: Infinity }} className="w-1.5 h-1.5 bg-white rounded-full" />
                                live
                            </div>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                signal<br /><GlitchText className="text-zinc-800">wall.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-zinc-500 text-lg leading-relaxed max-w-xl">
                                leave a transmission for the matrix. public signals from operators around the world — live and unfiltered.
                            </p>
                        </Reveal>
                    </section>

                    {/* Submit form */}
                    <Reveal>
                        <form onSubmit={handleSubmit} className="border border-white/10 bg-zinc-950/30 p-8 space-y-6">
                            <div className="text-[9px] text-zinc-700 uppercase tracking-widest mb-2">new_transmission</div>

                            {/* Emoji picker */}
                            <div className="space-y-2">
                                <div className="text-[9px] text-zinc-700 uppercase tracking-widest">signal_icon</div>
                                <div className="flex flex-wrap gap-2">
                                    {EMOJIS.map(e => (
                                        <motion.button key={e} type="button" onClick={() => setForm(f => ({ ...f, emoji: e }))}
                                            whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                                            className={`w-10 h-10 border text-lg transition-all ${form.emoji === e ? "border-white/40 bg-white/10" : "border-white/5 hover:border-white/20"}`}
                                        >{e}</motion.button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="text-[9px] text-zinc-700 uppercase tracking-widest">callsign</div>
                                    <input
                                        type="text"
                                        maxLength={40}
                                        required
                                        value={form.callsign}
                                        onChange={e => setForm(f => ({ ...f, callsign: e.target.value }))}
                                        placeholder="your_handle"
                                        className="w-full bg-black border border-white/5 focus:border-white/20 outline-none px-4 py-3 text-sm text-white placeholder:text-zinc-700 transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[9px] text-zinc-700 uppercase tracking-widest">message</div>
                                        <div className={`text-[8px] uppercase tracking-widest transition-colors ${form.message.length > 250 ? "text-red-500" : "text-zinc-700"}`}>{form.message.length}/280</div>
                                    </div>
                                    <textarea
                                        rows={3}
                                        maxLength={280}
                                        required
                                        value={form.message}
                                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                        placeholder="transmit your signal..."
                                        className="w-full bg-black border border-white/5 focus:border-white/20 outline-none px-4 py-3 text-sm text-white placeholder:text-zinc-700 resize-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <MagneticButton>
                                    <button type="submit" disabled={status === "loading" || status === "success"} className="h-12 px-8 bg-white text-black text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center gap-2">
                                        {status === "loading" ? (
                                            <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="w-3 h-3 border border-black border-t-transparent rounded-full" />routing...</>
                                        ) : status === "success" ? (
                                            <>✓ transmitted</>
                                        ) : (
                                            <>transmit <Send className="w-3 h-3" /></>
                                        )}
                                    </button>
                                </MagneticButton>
                                <AnimatePresence>
                                    {status === "limit" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[9px] text-red-500 uppercase tracking-widest">daily limit reached for this callsign</motion.div>}
                                    {status === "error" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[9px] text-red-500 uppercase tracking-widest">transmission_failed — try again</motion.div>}
                                </AnimatePresence>
                            </div>
                        </form>
                    </Reveal>

                    {/* Comment feed */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Reveal className="flex items-center gap-3 text-zinc-500">
                                <div className="h-px w-12 bg-zinc-800" />
                                <span className="text-[10px] uppercase tracking-[0.4em]">incoming_signals // {comments.length}_received</span>
                            </Reveal>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }} className="inline-block w-4 h-4 border border-white/20 border-t-white/80 rounded-full" />
                                <div className="text-[9px] text-zinc-700 uppercase tracking-widest mt-4">fetching_signals...</div>
                            </div>
                        ) : comments.length === 0 ? (
                            <div className="py-20 text-center text-zinc-700 text-[10px] uppercase tracking-widest">no transmissions yet — be first to signal</div>
                        ) : (
                            <div className="space-y-px border border-white/5 overflow-hidden">
                                <AnimatePresence>
                                    {comments.map((c, i) => (
                                        <motion.div
                                            key={c.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ delay: i < 10 ? i * 0.04 : 0 }}
                                            className="bg-black border-b last:border-b-0 border-white/5 p-6 flex gap-5 group hover:bg-zinc-900/10 transition-colors cursor-default"
                                        >
                                            <div className="text-2xl shrink-0 mt-0.5">{c.emoji}</div>
                                            <div className="flex-1 space-y-2 min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-bold text-sm uppercase tracking-tight">{c.callsign}</span>
                                                    <motion.div animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.2 }} className="text-[9px] text-zinc-700 uppercase tracking-widest">{timeAgo(c.createdAt)}</motion.div>
                                                </div>
                                                <p className="text-zinc-400 text-sm leading-relaxed break-words">{c.message}</p>
                                                <div className="h-px bg-zinc-900 overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.8, delay: i * 0.04 }} className="h-full bg-white/5" />
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

            <PageFooter id="SIGNAL_WALL" links={[{ href: "/", label: "home" }, { href: "/about", label: "about" }, { href: "/contact", label: "uplink" }]} />
        </div>
    );
}
