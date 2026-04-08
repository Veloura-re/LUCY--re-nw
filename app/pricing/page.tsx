"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, GlitchText, MatrixRain, MagneticButton, Typewriter } from "@/components/public/animations";

const terminalLines = [
    "> pricing_engine: loading...",
    "> tier_config: PENDING_FINALIZATION",
    "> rate_cards: COMPILING",
    "> sla_matrix: CALCULATING",
    "> eta: Q2 2026",
    "> status: COMING_SOON_",
];

export default function Pricing() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        await new Promise(r => setTimeout(r, 900));
        setLoading(false);
        setSubmitted(true);
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
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_os</span>
                    </Link>
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
                <div className="max-w-2xl w-full space-y-16 text-center">

                    {/* Animated terminal */}
                    <div className="relative overflow-hidden border border-white/5 bg-zinc-950/80 p-8 text-left">
                        <div className="absolute inset-0 opacity-20"><MatrixRain cols={10} /></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-2 h-2 bg-white/20 rounded-full" />
                                <div className="w-2 h-2 bg-white/10 rounded-full" />
                                <div className="w-2 h-2 bg-white/5 rounded-full" />
                                <span className="text-[8px] text-zinc-700 uppercase tracking-widest ml-2">pricing_engine_v2.0</span>
                            </div>
                            <Typewriter lines={terminalLines} className="space-y-1.5" />
                        </div>
                    </div>

                    {/* Headline */}
                    <div className="space-y-6">
                        <Reveal>
                            <div className="flex items-center justify-center gap-3 text-zinc-600">
                                <Clock className="w-4 h-4" />
                                <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                                <span className="text-[10px] uppercase tracking-[0.4em]">pricing_matrix // coming_soon</span>
                                <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                                <Clock className="w-4 h-4" />
                            </div>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                pricing<br /><GlitchText className="text-zinc-800">soon.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-zinc-500 text-lg leading-relaxed max-w-lg mx-auto">
                                we're finalizing our pricing tiers. institutional pilots are free — drop your email and we'll notify you when pricing goes live.
                            </p>
                        </Reveal>
                    </div>

                    {/* Waitlist form */}
                    <Reveal delay={0.3}>
                        <AnimatePresence mode="wait">
                            {!submitted ? (
                                <motion.form key="form" onSubmit={handleSubmit} initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-0 border border-white/10 overflow-hidden">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="callsign@institution.node"
                                        className="flex-1 bg-black px-6 py-4 text-sm text-white placeholder:text-zinc-700 outline-none border-r border-white/10"
                                    />
                                    <MagneticButton>
                                        <button type="submit" disabled={loading} className="h-full px-8 bg-white text-black text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-200 transition-colors disabled:opacity-60 whitespace-nowrap">
                                            {loading ? "routing..." : "notify_me"}
                                        </button>
                                    </MagneticButton>
                                </motion.form>
                            ) : (
                                <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-6 border border-white/10 flex items-center justify-center gap-4 text-sm">
                                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: 3, duration: 0.2 }} className="w-2 h-2 bg-white rounded-full" />
                                    <span className="text-zinc-400">uplink_registered // we'll reach out when pricing launches</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Reveal>

                    {/* Sneak peek tiers (locked) */}
                    <div className="space-y-4">
                        <Reveal className="text-[9px] text-zinc-700 uppercase tracking-widest">tier_preview // [REDACTED]</Reveal>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { tier: "Pilot Node", price: "Free", period: "3-month pilot" },
                                { tier: "Core Matrix", price: "$250", period: "/ month" },
                                { tier: "Enterprise", price: "Custom", period: "per institution" },
                            ].map((t, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: false }}
                                    transition={{ delay: i * 0.1 }}
                                    className="relative border border-white/5 bg-zinc-950/50 p-6 space-y-3 overflow-hidden group"
                                >
                                    {/* Blur overlay */}
                                    <div className="absolute inset-0 backdrop-blur-sm bg-black/55 flex items-center justify-center z-10">
                                        <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.4 }} className="text-[8px] uppercase tracking-[0.3em] text-zinc-700">classified</motion.div>
                                    </div>
                                    {/* Ghosted content visible through blur */}
                                    <div className="text-2xl font-bold text-zinc-700">{t.price}</div>
                                    <div className="text-xs text-zinc-800 uppercase tracking-widest">{t.period}</div>
                                    <div className="text-sm font-bold uppercase text-zinc-700">{t.tier}</div>
                                    <div className="text-xs text-zinc-800 space-y-1">
                                        <div>• ████████</div>
                                        <div>• ████████</div>
                                        <div>• ████████</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Interim CTA */}
                    <Reveal className="flex flex-wrap gap-4 justify-center">
                        <MagneticButton>
                            <Link href="/demo"><Button variant="outline" className="h-12 px-8 rounded-none border-white/20 text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all font-bold">try_demo</Button></Link>
                        </MagneticButton>
                        <MagneticButton>
                            <Link href="/contact"><Button variant="outline" className="h-12 px-8 rounded-none border-white/20 text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">speak_to_team</Button></Link>
                        </MagneticButton>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="PRICING_COMING_SOON" links={[{ href: "/features", label: "features" }, { href: "/demo", label: "demo" }, { href: "/contact", label: "uplink" }]} />
        </div>
    );
}
