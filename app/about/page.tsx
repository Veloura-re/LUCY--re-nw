"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Info, ArrowLeft, Cpu, Globe, Shield, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, ParticleField, Reveal, PageFooter, GlitchText, ScanBar } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const milestones = [
    { year: "2023", title: "Genesis Protocol", desc: "Initial research into modular academic operating systems begins. Core smart routing algorithms drafted." },
    { year: "2024", title: "Alpha Deployment", desc: "First institutional pilot with a single test school. Attendance and scheduling modules operational." },
    { year: "2025", title: "Vault Architecture", desc: "Security layer rewritten from scratch. RBAC enforcement, AES-256 vaults, and audit ledgers deployed." },
    { year: "2026", title: "Public Launch v1.0", desc: "Full public launch. Multi-school support, AI persona system, parent integration, and compliance certifications achieved." },
];

const techStack = [
    { label: "core_engine", val: "next.js 14" },
    { label: "smart_db", val: "postgresql" },
    { label: "vault_logic", val: "aes_256" },
    { label: "auth", val: "supabase" },
    { label: "ai_layer", val: "openai_api" },
    { label: "deploy", val: "vercel_edge" },
];

export default function About() {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-zinc-900 dark:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-4 transition-colors">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">lucy_os</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle className="scale-90" />
                        <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />back_to_home</Button></Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-24 sm:pt-32 pb-20 sm:pb-40 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto space-y-16 sm:space-y-32">

                    {/* Hero */}
                    <section className="space-y-6 sm:space-y-8 relative overflow-hidden">
                        <ParticleField count={35} />
                        <Reveal className="flex items-center gap-3 sm:gap-4 text-slate-400 dark:text-zinc-500">
                            <motion.div animate={{ width: ["32px", "64px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] font-bold">system_origin // genesis_directive</span>
                            <motion.div animate={{ opacity: [1, 0, 1], scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} className="w-1.5 h-1.5 bg-slate-900 dark:bg-white rounded-full" />
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                about<br /><GlitchText className="text-slate-300 dark:text-zinc-800">lucy_os.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-2xl">
                            <p className="text-slate-500 dark:text-zinc-500 text-base sm:text-xl leading-relaxed">
                                conceived as a modular response to monolithic educational friction. lucy is the synthesis of cognitive routing and institutional logistics, built to run at scale without compromise.
                            </p>
                        </Reveal>
                        <Reveal delay={0.3}><ScanBar /></Reveal>
                    </section>

                    {/* Mission Blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { id: "ORIGIN_PROTOCOL", title: "The Genesis", body: "lucy was initiated to solve the latency between data ingestion and academic output. the protocol bypasses traditional administrative overhead in favor of direct smart coordination between roles." },
                            { id: "OPERATIONAL_DIR", title: "System Goals", items: ["zero-friction scheduling for high-concurrency environments.", "cryptographically secured scholar identity matrices.", "distributed data consistency for isolated institutions.", "ai-driven cognitive routing for academic intelligence."] }
                        ].map((block, i) => (
                            <TiltCard key={i}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="h-full p-10 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-900/10 space-y-6 group cursor-default relative overflow-hidden rounded-xl dark:rounded-none"
                                >
                                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />
                                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.02) 0%, transparent 70%)" }} />
                                    <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest relative z-10">{block.id}</div>
                                    <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 dark:text-white relative z-10">{block.title}</h2>
                                    {"body" in block ? (
                                        <p className="text-slate-500 dark:text-zinc-500 text-sm leading-relaxed relative z-10">{block.body}</p>
                                    ) : (
                                        <ul className="space-y-3 relative z-10">
                                            {block.items!.map((item, j) => (
                                                <motion.li key={j} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: j * 0.08 }} className="flex gap-4 text-sm text-slate-500 dark:text-zinc-500">
                                                    <span className="text-slate-900 dark:text-white shrink-0">[{String(j + 1).padStart(2, "0")}]</span>{item}
                                                </motion.li>
                                            ))}
                                        </ul>
                                    )}
                                </motion.div>
                            </TiltCard>
                        ))}
                    </div>

                    {/* Timeline */}
                    <section className="space-y-12">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">evolution_log // version_history</span>
                        </Reveal>
                        <div className="relative">
                            <div className="absolute left-[10px] top-0 bottom-0 w-px bg-slate-200 dark:bg-zinc-900" />
                            {milestones.map((m, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="pl-10 pb-14 relative">
                                    <motion.div whileHover={{ scale: 1.5 }} className="absolute left-0 top-1 w-5 h-5 border border-slate-300 dark:border-white/20 bg-white dark:bg-black flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-white" />
                                    </motion.div>
                                    <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest mb-2">{m.year}</div>
                                    <h3 className="text-xl font-bold uppercase tracking-tight mb-3 text-slate-900 dark:text-white">{m.title}</h3>
                                    <p className="text-slate-500 dark:text-zinc-500 text-sm leading-relaxed">{m.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* Tech Stack */}
                    <Reveal>
                        <div className="p-10 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/5 space-y-8 rounded-xl dark:rounded-none">
                            <div className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                                <Cpu className="w-4 h-4" />
                                <span className="text-[10px] uppercase tracking-[0.4em]">technical_stack</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {techStack.map((t, i) => (
                                    <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} whileHover={{ y: -3 }} className="space-y-1 cursor-default">
                                        <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest">{t.label}</div>
                                        <div className="text-sm text-slate-900 dark:text-white font-bold">{t.val}</div>
                                        <div className="h-px bg-slate-200 dark:bg-zinc-900 overflow-hidden">
                                            <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.1 }} className="h-full bg-slate-400 dark:bg-white/15" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="ABOUT_PROTOCOL" links={[{ href: "/features", label: "specs" }, { href: "/security", label: "vault" }, { href: "/contact", label: "contact" }]} />
        </div>
    );
}
