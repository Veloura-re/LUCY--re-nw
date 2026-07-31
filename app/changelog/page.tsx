"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GitBranch, Zap, Bug, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText } from "@/components/public/animations";

const releases = [
    {
        version: "v1.0.5", date: "2026-07-04", label: "stable", changes: [
            { type: "new", text: "Redesigned Contact node into a 4-step sequential wizard uplink interface" },
            { type: "new", text: "Overhauled Presentation Deck with 13 slides, stat counters, and 3D hover navigation" },
            { type: "improve", text: "Standardized platform aesthetic to strict monochrome (zinc/white) terminal style" },
            { type: "improve", text: "Updated global browser metadata title to 'LUCY | Academia'" }
        ]
    },
    {
        version: "v1.0.4", date: "2026-03-01", label: "stable", changes: [
            { type: "fix", text: "Resolved race condition in attendance sync during high-concurrency writes" },
            { type: "fix", text: "Parent notification latency reduced from 4s to 0.8s" },
            { type: "improve", text: "Dashboard telemetry rendering optimized for low-bandwidth nodes" }
        ]
    },
    {
        version: "v1.0.3", date: "2026-02-18", label: "stable", changes: [
            { type: "new", text: "AI multi-session chat support with per-user storage isolation" },
            { type: "new", text: "Geography Teacher persona added to the neural persona registry" },
            { type: "fix", text: "Fixed mobile layout overflow on AI chat workspace" },
            { type: "improve", text: "Redesigned Director Institutional Pulse metrics" }
        ]
    },
    {
        version: "v1.0.2", date: "2026-02-05", label: "stable", changes: [
            { type: "new", text: "Automated parent lateness alerts via email on 3+ late records" },
            { type: "new", text: "Role-specific visual onboarding tutorial (Neural Briefing)" },
            { type: "new", text: "MFA tokenization enforcement for Admin and Faculty nodes" },
            { type: "fix", text: "School deletion API cascade timeout resolved" }
        ]
    },
    {
        version: "v1.0.1", date: "2026-01-20", label: "deprecated", changes: [
            { type: "fix", text: "BOLA vulnerability remediation across 60 API endpoints" },
            { type: "fix", text: "RLS enforcement hardened for multi-tenant isolation" },
            { type: "improve", text: "RBAC CRUD permissions tightened across all user roles" }
        ]
    },
    {
        version: "v1.0.0", date: "2026-01-01", label: "genesis", changes: [
            { type: "new", text: "Initial system boot: core scheduling, attendance, and grading matrix" },
            { type: "new", text: "Multi-role auth: Director, Principal, Teacher, Student, Parent" },
            { type: "new", text: "Neural AI assistant initialized with core persona set" }
        ]
    }
];

const typeIcon = (type: string) => {
    if (type === "new") return <Zap className="w-3 h-3 text-slate-900 dark:text-white" />;
    if (type === "fix") return <Bug className="w-3 h-3 text-slate-500 dark:text-zinc-500" />;
    return <Shield className="w-3 h-3 text-slate-400 dark:text-zinc-600" />;
};

const labelStyle = (label: string) => {
    if (label === "stable") return "border-slate-300 dark:border-white/20 text-slate-900 dark:text-white";
    if (label === "deprecated") return "border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-600";
    return "border-slate-300 dark:border-zinc-500 text-slate-400 dark:text-zinc-400";
};

export default function Changelog() {
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
                        <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-3xl mx-auto space-y-24">
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <GitBranch className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">version_history // immutable_log</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                change<br /><GlitchText className="text-slate-300 dark:text-zinc-800">log.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-slate-500 dark:text-zinc-500 text-lg leading-relaxed max-w-xl">
                                a full audit of every state mutation applied to the lucy neural matrix. cryptographically signed and immutable.
                            </p>
                        </Reveal>
                    </section>

                    {/* Timeline */}
                    <section className="relative space-y-0">
                        <div className="absolute left-[11px] top-0 bottom-0 w-px bg-slate-200 dark:bg-zinc-900" />
                        {releases.map((release, i) => (
                            <motion.div
                                key={release.version}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08, duration: 0.3 }}
                                className="relative pl-10 pb-16"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.6, borderColor: "rgba(100,100,100,0.4)" }}
                                    transition={{ type: "spring", stiffness: 400 }}
                                    className="absolute left-0 top-1 w-[23px] h-[23px] border border-slate-300 dark:border-white/15 bg-white dark:bg-black flex items-center justify-center cursor-default"
                                >
                                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }} className="w-2 h-2 bg-slate-900 dark:bg-white" />
                                </motion.div>

                                <div className="space-y-5">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">{release.version}</h2>
                                        <div className={`px-2 py-1 border rounded-md dark:rounded-none text-[8px] uppercase tracking-widest ${labelStyle(release.label)}`}>{release.label}</div>
                                        <span className="text-[10px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest ml-auto">{release.date}</span>
                                    </div>

                                    <TiltCard>
                                        <div className="space-y-3 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-900/10 p-6 rounded-xl dark:rounded-none">
                                            {release.changes.map((change, j) => (
                                                <motion.div key={j} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: j * 0.06 }} className="flex gap-4 items-start text-sm">
                                                    <div className="mt-0.5 shrink-0">{typeIcon(change.type)}</div>
                                                    <span className="text-slate-600 dark:text-zinc-400">{change.text}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </TiltCard>
                                </div>
                            </motion.div>
                        ))}
                    </section>
                </div>
            </main>

            <PageFooter id="CHANGELOG" links={[{ href: "/roadmap", label: "roadmap" }, { href: "/status", label: "status" }, { href: "/docs", label: "docs" }]} />
        </div>
    );
}
