"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cpu, ArrowLeft, Users, Database, Calendar, Shield, Network, Command, Activity, Search } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, ParticleField, Reveal, PageFooter, GlitchText, ScanBar } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const specs = [
    { icon: Users, title: "Role Configuration", id: "0x01", desc: "Assign cryptographic access tokens separating Director, Admin, Faculty, Scholar, and Parent (Observer) domains — each scoped to their own data silo." },
    { icon: Database, title: "Data Ingestion", id: "0x02", desc: "Process attendance records, grades, timetables, and behavioral metadata via synchronized API clusters with full audit trail." },
    { icon: Calendar, title: "Temporal Phasing", id: "0x03", desc: "Algorithmic generation of complex scheduling matrices. Optimize resource allocation across subjects, rooms, and temporal constraints." },
    { icon: Shield, title: "AES-256 Vault", id: "0x04", desc: "End-to-end payload encryption for all scholar data. TLS 1.3 in transit. Isolated schemas per institution." },
    { icon: Network, title: "Neural Mesh", id: "0x05", desc: "Single-tenant deployment architecture with clean API boundaries. No shared infrastructure between institutional clients." },
    { icon: Command, title: "Command Interface", id: "0x06", desc: "Direct administrative oversight via role-specific dashboards. Every UI element maps to a secured API endpoint." },
    { icon: Activity, title: "Live Telemetry", id: "0x07", desc: "Real-time attendance ingestion with parent notification dispatch. Configurable late thresholds and automated email alerts." },
    { icon: Search, title: "Deep Audit", id: "0x08", desc: "Cryptographically signed append-only ledger of every data mutation. Full actor + timestamp + IP traceability." },
];

const logLines = [
    "[system_log] node_01_initiate...",
    "[auth] crypt_handshake: success",
    "[attendance] ingest_vector: class_047",
    "[vault] hash_check: 4f8s...2x9 [OK]",
    "[audit] write_record: teacher_id_07",
    "[system_log] listening_on_port: 443_",
];

export default function Features() {
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
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-6xl mx-auto space-y-24">

                    <section className="space-y-8 text-center relative overflow-hidden">
                        <ParticleField count={40} />
                        <Reveal className="flex items-center justify-center gap-4 text-slate-400 dark:text-zinc-500">
                            <motion.div animate={{ width: ["32px", "64px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">technical_specifications // v1.0</span>
                            <motion.div animate={{ width: ["32px", "64px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity, delay: 1 }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
                                system<br /><GlitchText className="text-slate-400 dark:text-zinc-800">capabilities.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-2xl mx-auto">
                            <p className="text-slate-500 dark:text-zinc-500 text-xl leading-relaxed">
                                granular breakdown of the lucy neural matrix. engineered for resilience and high-throughput academic coordination.
                            </p>
                        </Reveal>
                        <Reveal delay={0.3} className="max-w-xs mx-auto"><ScanBar /></Reveal>
                    </section>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-slate-200 dark:bg-white/10 border border-slate-200 dark:border-white/10 overflow-hidden rounded-xl dark:rounded-none">
                        {specs.map((spec, i) => (
                            <TiltCard key={i}>
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.06 }}
                                    className="bg-white dark:bg-black p-10 space-y-6 group cursor-default h-full relative overflow-hidden"
                                >
                                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />
                                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.03) 0%, transparent 70%)" }} />
                                    <div className="flex justify-between items-start relative z-10">
                                        <motion.div whileHover={{ rotate: 12, scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
                                            <spec.icon className="w-6 h-6 text-slate-400 dark:text-zinc-600 group-hover:text-emerald-500 dark:group-hover:text-white transition-colors duration-300" />
                                        </motion.div>
                                        <motion.div animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.3 }} className="text-[8px] text-slate-400 dark:text-zinc-800 font-bold">{spec.id}</motion.div>
                                    </div>
                                    <div className="space-y-3 relative z-10">
                                        <h3 className="text-base font-bold uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-white transition-colors">{spec.title}</h3>
                                        <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed">{spec.desc}</p>
                                    </div>
                                    <div className="h-px bg-slate-200 dark:bg-zinc-900 overflow-hidden relative z-10">
                                        <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }} transition={{ duration: 1.3, delay: i * 0.08 }} className="h-full bg-slate-400 dark:bg-white/10" />
                                    </div>
                                </motion.div>
                            </TiltCard>
                        ))}
                    </div>

                    {/* Audit Panel */}
                    <Reveal>
                        <div className="p-10 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/5 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center rounded-xl dark:rounded-none">
                            <div className="space-y-6">
                                <h2 className="text-3xl font-bold uppercase tracking-tighter text-slate-900 dark:text-white">Cryptographic Transparency</h2>
                                <p className="text-slate-500 dark:text-zinc-500 text-sm leading-relaxed">
                                    every action within lucy_os is recorded on a cryptographically verifiable ledger. audits can be performed in real-time without compromising the integrity of the scholar vault.
                                </p>
                                <div className="space-y-3">
                                    {["audit_integrity", "encryption_coverage", "api_uptime"].map((label, i) => (
                                        <div key={i} className="space-y-1">
                                            <div className="flex justify-between text-[9px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest font-bold">
                                                <span>{label}</span><span className="text-emerald-600 dark:text-white">verified</span>
                                            </div>
                                            <div className="h-px bg-slate-200 dark:bg-zinc-900 overflow-hidden">
                                                <motion.div initial={{ width: 0 }} whileInView={{ width: ["98%", "100%", "98%"][i] }} viewport={{ once: true }} transition={{ duration: 1.3, delay: i * 0.2 }} className="h-full bg-emerald-500 dark:bg-white/30" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white dark:bg-black border border-slate-200 dark:border-white/5 p-6 font-mono text-[9px] space-y-1.5 rounded-xl dark:rounded-none shadow-inner dark:shadow-none">
                                {logLines.map((line, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className={i === logLines.length - 1 ? "text-slate-900 dark:text-white font-bold" : "text-slate-500 dark:text-zinc-600"}>
                                        {line}
                                    </motion.div>
                                ))}
                                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.7 }} className="inline-block text-slate-500 dark:text-zinc-600">_</motion.span>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="FEATURES_SPEC" links={[{ href: "/about", label: "about" }, { href: "/pricing", label: "tiers" }, { href: "/security", label: "vault" }]} />
        </div>
    );
}
