"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, GlitchText } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const clauses = [
    { num: "01", title: "Definitions & Roles", body: "Under global privacy frameworks (GDPR, POPIA, FERPA), the subscribing Educational Institution acts as the 'Data Controller' (or Responsible Party). LUCY OS acts strictly as the 'Data Processor' (or Operator). We process personal and institutional data solely on your documented instructions." },
    { num: "02", title: "Scope of Processing", body: "LUCY OS processes student, parent, and staff data for the exclusive purpose of delivering our academic management, grading, and communication services. Processing duration strictly mirrors the active subscription term." },
    { num: "03", title: "Security Measures", body: "We separate each institution's data by school identifier and enforce that separation through authorization checks on every request, supported by row-level security policies in our PostgreSQL database for direct database access. All data is encrypted at rest using AES-256 and in transit via TLS 1.3. We maintain strict access controls, regular vulnerability scanning, and automated threat monitoring." },
    { num: "04", title: "Sub-Processors", body: "LUCY OS engages specific sub-processors: Supabase (database, authentication, file storage), Vercel and Cloudflare (hosting and bot protection), Google (AI features), PostHog (analytics and error monitoring), Resend (email), Stripe and Chapa (payments) and Upstash (rate limiting and caching). The current list is in the Privacy Policy. We remain fully liable for the acts and omissions of our sub-processors and bind them to obligations no less protective than those contained in this DPA." },
    { num: "05", title: "Data Subject Requests", body: "As the Processor, we do not respond directly to data subject requests (e.g., right to be forgotten, access requests). We will immediately forward any such requests to the Institution and provide the technical tools necessary via the Admin dashboard for the Institution to fulfill its legal obligations." },
    { num: "06", title: "Personal Data Breach", body: "In the event of a confirmed security incident leading to accidental or unlawful destruction, loss, alteration, or unauthorized disclosure of personal data, we will notify the Institution without undue delay (and in no event later than 48 hours after becoming aware). We will provide all necessary cooperation for the Institution's regulatory reporting." },
    { num: "07", title: "Return & Deletion of Data", body: "Upon termination or expiration of the Master Service Agreement, LUCY OS will, at the Institution's election, either delete or return all personal data. Once deleted, data is permanently cryptographically overwritten and unrecoverable from our active databases within 30 days." },
];

export default function DPA() {
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
                            <Shield className="w-4 h-4 shrink-0" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em]">compliance_policy // effective 2026-01-01</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-none">
                                data processing<br /><GlitchText className="text-slate-300 dark:text-zinc-800">agreement.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-slate-500 dark:text-zinc-500 text-sm sm:text-base leading-relaxed">
                                legally binding addendum governing the handling of institutional and personal data by LUCY OS as a processor.
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

            <PageFooter id="DPA_AGREEMENT" links={[{ href: "/privacy", label: "privacy" }, { href: "/terms", label: "terms" }, { href: "/msa", label: "msa" }]} />
        </div>
    );
}
