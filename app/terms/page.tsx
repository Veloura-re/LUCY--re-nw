"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, GlitchText } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const clauses = [
    { num: "01", title: "Agreement & Permitted Educational Use", body: "By creating an account on LUCY OS, you acknowledge and agree to these terms. Platform usage is licensed exclusively for institutional management and academic administration. Commercial data harvesting, scraping, or utilization for non-educational monetization is strictly prohibited." },
    { num: "02", title: "Credential Integrity & Account Liability", body: "Institutions are responsible for maintaining the absolute security of administrative keys, invite tokens, and passwords. The institution assumes full liability for all actions, data entries, and system configurations made under their school account." },
    { num: "03", title: "Institutional Data Ownership", body: "All academic data (student lists, grades, marks, schedules) remains the exclusive property of the institutional Responsible Party. LUCY OS claims zero intellectual property or ownership rights over any institutional data." },
    { num: "04", title: "AI Disclaimer & Hallucination Defense", body: "LUCY OS incorporates artificial intelligence to assist with grading calculations and feedback. All AI-generated outputs are provided 'as-is'. The institution agrees that AI outputs must not be used for safety-critical, disciplinary, or final academic decisions without independent human review. LUCY OS disclaims all liability for AI hallucinations, grading errors, or model bias." },
    { num: "05", title: "Acceptable Use & Zero Tolerance Security", body: "Any attempt to inject malicious code, execute DDoS attacks, bypass authentication layers, scrape data, or breach tenant isolation (Row-Level Security) is met with immediate, permanent account termination. We employ automated heuristics and logs auditing to track violations, and reserve the right to ban IP ranges and provide forensic tracking logs to cybercrime authorities for prosecution." },
    { num: "06", title: "Service Level Agreement (SLA) & Outage Exclusions", body: "We guarantee a 99.9% uptime monthly target for Core Plan schools and 99.99% for Enterprise Plan. Downtime calculations exclude scheduled maintenance windows (announced 7 days in advance), force majeure events, and upstream third-party hosting outages (Vercel, Supabase, or AWS) beyond our direct control." },
    { num: "07", title: "SLA Remedy Credit System", body: "If monthly availability falls below the target, the sole and exclusive remedy is the issuance of Service Credits applied to the next billing cycle: 10% credit for drop below target, and 25% credit for drop below 99.0%. Service Credits in any single month are strictly capped at 30% of the monthly subscription fee." },
    { num: "08", title: "Warranty Disclaimer", body: "The platform is provided on an 'as-is' and 'as-available' basis. LUCY OS disclaims all warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to any implied warranties of merchantability, fitness for a particular purpose, or error-free system operation." },
    { num: "09", title: "Limitation of Liability & Consequential Damage Cap", body: "LUCY OS shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including lost tuition revenue, reputational harm, or data loss. Our aggregate direct liability for any claim is strictly capped at the total amount of subscription fees paid by the institution in the 12 months immediately preceding the event." },
    { num: "10", title: "Mutual Indemnification", body: "The institution agrees to defend, indemnify, and hold harmless LUCY OS against any third-party claims, liabilities, or expenses arising from the institution's violation of privacy laws, upload of copyrighted curriculum without license, or misuse of user information." },
    { num: "11", title: "Governing Law & Disputes Jurisdiction", body: "These terms are governed exclusively by the laws of Ethiopia. The parties submit to the sole jurisdiction of the Federal Courts in Addis Ababa for any disputes arising from this agreement." },
    { num: "12", title: "Fulfillment Policy", body: "Upon successful payment of the subscription fee, the school account is instantly provisioned and activated automatically. All SaaS features associated with the selected tier are immediately available. No physical goods are provided under this agreement." },
    { num: "13", title: "No Refund Policy", body: "Due to the immediate provisioning of server resources and cloud infrastructure upon payment, all subscription fees are strictly non-refundable. This applies to both monthly and annual commitments, regardless of actual usage levels during the billing cycle." },
    { num: "14", title: "General Disclaimer", body: "LUCY OS and its developers provide the software 'as is' without any warranty, express or implied. We do not warrant that the service will meet your specific requirements, be entirely secure, or error-free. The institution assumes all responsibility for decisions made based on platform data." },
];

export default function Terms() {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight transition-colors duration-300">
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

            <main className="relative z-10 pt-24 sm:pt-32 pb-20 sm:pb-40 px-4 sm:px-6">
                <div className="max-w-3xl mx-auto space-y-12 sm:space-y-20">

                    <section className="space-y-6 sm:space-y-8">
                        <Reveal className="flex items-center gap-3 sm:gap-4 text-slate-400 dark:text-zinc-500">
                            <FileText className="w-4 h-4 shrink-0" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em]">legal_policy // effective 2026-01-01</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-none">
                                terms of<br /><GlitchText className="text-slate-300 dark:text-zinc-800">service.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-slate-500 dark:text-zinc-500 text-sm sm:text-base leading-relaxed">
                                the operating agreement between LUCY OS and each provisioned school account. read before initializing your system.
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

            <PageFooter id="TERMS_OF_SERVICE" links={[{ href: "/privacy", label: "privacy" }, { href: "/compliance", label: "compliance" }, { href: "/contact", label: "contact" }]} />
        </div>
    );
}
