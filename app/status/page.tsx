"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const services = [
    { name: "API Gateway", status: "operational", latency: "12ms", uptime: "100%" },
    { name: "Auth Node", status: "operational", latency: "8ms", uptime: "100%" },
    { name: "Database Vault", status: "operational", latency: "4ms", uptime: "100%" },
    { name: "AI Engine", status: "operational", latency: "220ms", uptime: "99.8%" },
    { name: "Email Dispatch", status: "operational", latency: "1.2s", uptime: "99.9%" },
    { name: "File Upload CDN", status: "operational", latency: "48ms", uptime: "100%" },
];

const incidents = [
    { date: "2026-02-12", resolved: true, title: "AI latency spike — 8min window", desc: "Upstream model rate limits caused 220ms→1800ms spikes. Mitigated by retry queue." },
    { date: "2026-01-28", resolved: true, title: "Email dispatch queue delay", desc: "SMTP relay congestion caused 3-minute parent notification delays. Resolved by switching secondary relay." },
    { date: "2026-01-09", resolved: true, title: "Auth token rotation edge case", desc: "A race condition during concurrent logins caused ~0.01% of sessions to fail on refresh. Patched in v1.0.2." },
];

export default function Status() {
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

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-4xl mx-auto space-y-24">

                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-emerald-500 dark:text-emerald-400">
                            <Activity className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-emerald-400/30" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">system_status // live_monitor</span>
                            <motion.div animate={{ opacity: [1, 0, 1], scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                system<br /><GlitchText className="text-slate-300 dark:text-zinc-800">status.</GlitchText>
                            </h1>
                        </Reveal>

                        {/* Overall status badge */}
                        <Reveal delay={0.2}>
                            <motion.div whileHover={{ scale: 1.02 }} className="inline-flex items-center gap-4 p-6 border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/5 cursor-default rounded-xl dark:rounded-none">
                                <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.8 }} className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
                                <div>
                                    <div className="text-[8px] text-slate-400 dark:text-zinc-600 uppercase tracking-widest">overall_system_health</div>
                                    <div className="text-slate-900 dark:text-white font-bold uppercase tracking-tight">All Systems Operational</div>
                                </div>
                            </motion.div>
                        </Reveal>
                    </section>

                    {/* Service Grid */}
                    <section className="space-y-6">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">service_schools</span>
                        </Reveal>
                        <div className="space-y-px border border-slate-200 dark:border-white/5 overflow-hidden rounded-xl dark:rounded-none">
                            {services.map((svc, i) => (
                                <TiltCard key={i}>
                                    <motion.div
                                        initial={{ opacity: 0, x: -15 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.07 }}
                                        className="bg-white dark:bg-black hover:bg-slate-50 dark:hover:bg-zinc-900/20 border-b border-slate-200 dark:border-white/5 last:border-b-0 p-6 flex items-center justify-between gap-4 group cursor-default transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <motion.div animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.4 }} className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full shrink-0" />
                                            <span className="font-bold text-sm uppercase tracking-tight text-slate-900 dark:text-white">{svc.name}</span>
                                        </div>
                                        <div className="flex items-center gap-8 text-[9px] uppercase tracking-widest text-slate-500 dark:text-zinc-600">
                                            <div className="hidden md:flex gap-2"><span>latency:</span><span className="text-slate-900 dark:text-white">{svc.latency}</span></div>
                                            <div className="flex gap-2"><span>uptime:</span><span className="text-slate-900 dark:text-white">{svc.uptime}</span></div>
                                            <div className="px-2 py-1 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] rounded-md dark:rounded-none">{svc.status}</div>
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>
                    </section>

                    {/* Incident history */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">past_incidents // resolved</span>
                        </Reveal>
                        <div className="space-y-4">
                            {incidents.map((inc, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-6 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-900/5 space-y-3 rounded-xl dark:rounded-none">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                                            <span className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">{inc.title}</span>
                                        </div>
                                        <div className="flex gap-3 text-[8px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest">
                                            <Clock className="w-3 h-3" />
                                            {inc.date}
                                        </div>
                                    </div>
                                    <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed pl-6">{inc.desc}</p>
                                    <div className="pl-6 h-px bg-slate-200 dark:bg-zinc-900 overflow-hidden">
                                        <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }} transition={{ duration: 1.3, delay: i * 0.2 }} className="h-full bg-emerald-400/20" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            <PageFooter id="SYSTEM_STATUS" links={[{ href: "/changelog", label: "changelog" }, { href: "/docs", label: "docs" }, { href: "/support", label: "support" }]} />
        </div>
    );
}
