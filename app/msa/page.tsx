"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, GlitchText } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const clauses = [
    { num: "01", title: "Structure of Agreement", body: "This Master Service Agreement (MSA) forms the central legal framework between LUCY OS and the subscribing Educational Institution. It incorporates by reference our Terms of Service, Privacy Policy, Data Processing Agreement (DPA), and Service Level Agreement (SLA)." },
    { num: "02", title: "Provision of Services", body: "LUCY OS grants the Institution a non-exclusive, non-transferable, revocable license to access and use the platform for its internal academic, administrative, and communication operations during the active subscription term." },
    { num: "03", title: "Subscription Terms & Fees", body: "Fees are billed based on the selected tier (Core Plan, Enterprise). All fees are non-refundable as infrastructure is provisioned instantly upon payment. LUCY OS reserves the right to suspend the school account if payment is overdue by more than 15 days." },
    { num: "04", title: "Intellectual Property Rights", body: "LUCY OS retains all right, title, and interest in the platform, algorithms, AI logic, and source code. The Institution retains full ownership of all data uploaded or entered into the platform." },
    { num: "05", title: "Confidentiality", body: "Both parties agree to hold each other's Confidential Information in strict confidence. This includes LUCY OS's technical architecture and the Institution's student/financial records. Information will only be disclosed to employees or sub-processors on a strict need-to-know basis under binding NDAs." },
    { num: "06", title: "Term and Termination", body: "This MSA remains in effect until the subscription is cancelled or terminated. Either party may terminate for material breach if the breach remains uncured 30 days after written notice. Upon termination, access is revoked and data deletion protocols commence per the DPA." },
    { num: "07", title: "Limitation of Liability", body: "To the maximum extent permitted by law, LUCY OS's aggregate liability arising out of this MSA shall not exceed the total fees paid by the Institution during the twelve (12) months prior to the event giving rise to liability. Neither party shall be liable for consequential, incidental, or indirect damages." },
];

export default function MSA() {
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
                            <FileText className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">legal_policy // effective 2026-01-01</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-none">
                                master service<br /><GlitchText className="text-slate-300 dark:text-zinc-800">agreement.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-slate-500 dark:text-zinc-500 text-base leading-relaxed">
                                the overarching contractual framework establishing the operational and commercial terms between LUCY OS and school accounts.
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
                                <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed pl-10">{clause.body}</p>
                                <div className="pl-10 h-px bg-slate-200 dark:bg-zinc-900 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }} transition={{ duration: 1.3, delay: i * 0.08 }} className="h-full bg-slate-400/20 dark:bg-white/8" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <PageFooter id="MSA_AGREEMENT" links={[{ href: "/sla", label: "sla" }, { href: "/terms", label: "terms" }, { href: "/dpa", label: "dpa" }]} />
        </div>
    );
}
