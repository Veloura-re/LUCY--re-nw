"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, GlitchText } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const clauses = [
    { num: "01", title: "Uptime Guarantee", body: "LUCY OS guarantees a 99.9% Monthly Uptime Percentage for all Core Plan schools, and 99.99% for Enterprise Plan. Uptime is calculated as total monthly minutes minus downtime minutes, divided by total monthly minutes." },
    { num: "02", title: "Downtime Definition & Exclusions", body: "Downtime occurs when the platform is completely inaccessible or when critical database read/write operations fail system-wide. Exclusions include: scheduled maintenance (announced 7 days prior), upstream provider outages (AWS/Vercel/Supabase), force majeure, or issues caused by the Institution's network/hardware." },
    { num: "03", title: "Incident Severity & Response Times", body: "Incidents are categorized by severity. \n\nSeverity 1 (Critical Outage - Platform down): 30-minute initial response, continuous updates every hour. \nSeverity 2 (High - Major feature degraded): 2-hour response. \nSeverity 3 (Medium - Minor feature bug): 12-hour response. \nSeverity 4 (Low - UI glitch/inquiry): 24-hour response." },
    { num: "04", title: "What Happens When Something Breaks?", body: "Upon detecting a Severity 1 or 2 incident, our automated monitoring triggers an immediate pager alert to the engineering team. We immediately update the LUCY OS Status Page. Engineers will execute pre-configured disaster recovery runbooks to reroute traffic or roll back degraded updates. You will receive an incident post-mortem within 48 hours of resolution detailing the root cause and preventative measures taken." },
    { num: "05", title: "Service Credits (Remedy)", body: "If we fail to meet the Uptime Guarantee, you are eligible for Service Credits applied to future billing. \n\nFor 99.9% target: \n< 99.9% to >= 99.0%: 10% credit. \n< 99.0%: 25% credit. \n\nClaims must be submitted to support within 15 days of the month-end." },
    { num: "06", title: "Data Backup & Disaster Recovery", body: "LUCY OS performs continuous Point-in-Time Recovery (PITR) backups via PostgreSQL WAL streaming. In the event of catastrophic data corruption, we guarantee a Recovery Point Objective (RPO) of 5 minutes and a Recovery Time Objective (RTO) of 4 hours." },
];

export default function SLA() {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-zinc-900 dark:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-4 transition-colors">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">LUCY OS</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle className="scale-90" />
                        <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />back_to_home</Button></Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-3xl mx-auto space-y-20">
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <Activity className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">uptime_policy // effective 2026-01-01</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-none">
                                service level<br /><GlitchText className="text-slate-300 dark:text-zinc-800">agreement.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-slate-500 dark:text-zinc-500 text-base leading-relaxed">
                                operational guarantees, response system, and technical remedies defining platform reliability.
                            </p>
                        </Reveal>
                    </section>

                    <div className="space-y-0 border border-slate-200 dark:border-white/5 overflow-hidden rounded-xl dark:rounded-none">
                        {clauses.map((clause, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                                className="p-8 border-b border-slate-200 dark:border-white/5 last:border-b-0 space-y-3 group cursor-default transition-colors dark:hover:!bg-[rgba(255,255,255,0.015)]"
                            >
                                <div className="flex gap-6 items-baseline">
                                    <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.4 }} className="text-[9px] text-slate-400 dark:text-zinc-700 shrink-0 font-bold">[{clause.num}]</motion.div>
                                    <h2 className="text-base font-bold uppercase tracking-tight group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{clause.title}</h2>
                                </div>
                                <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed pl-10 whitespace-pre-wrap">{clause.body}</p>
                                <div className="pl-10 h-px bg-slate-200 dark:bg-zinc-900 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }} transition={{ duration: 1.3, delay: i * 0.08 }} className="h-full bg-slate-400/20 dark:bg-white/8" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <PageFooter id="SLA_AGREEMENT" links={[{ href: "/msa", label: "msa" }, { href: "/terms", label: "terms" }, { href: "/insurance", label: "insurance" }]} />
        </div>
    );
}
