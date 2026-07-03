"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, GlitchText } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const clauses = [
    { num: "01", title: "Agreement & Permitted Educational Use", body: "By provisioning a node (creating an account) on LUCY_ACADEMIA, you acknowledge and agree to these terms. Platform usage is licensed exclusively for institutional management and academic administration. Commercial data harvesting, scraping, or utilization for non-educational monetization is strictly prohibited." },
    { num: "02", title: "Credential Integrity & Account Liability", body: "Institutions are responsible for maintaining the absolute security of administrative keys, invite tokens, and passwords. The institution assumes full liability for all actions, data entries, and system configurations made under their institutional node." },
    { num: "03", title: "Institutional Data Ownership", body: "All academic data (student lists, grades, marks, schedules) remains the exclusive property of the institutional Responsible Party. LUCY_ACADEMIA claims zero intellectual property or ownership rights over any institutional data." },
    { num: "04", title: "AI Disclaimer & Hallucination Defense", body: "LUCY_ACADEMIA incorporates artificial intelligence to assist with grading calculations and feedback. All AI-generated outputs are provided 'as-is'. The institution agrees that AI outputs must not be used for safety-critical, disciplinary, or final academic decisions without independent human review. LUCY_ACADEMIA disclaims all liability for AI hallucinations, grading errors, or model bias." },
    { num: "05", title: "Acceptable Use & Zero Tolerance Security", body: "Any attempt to inject malicious code, execute DDoS attacks, bypass authentication layers, scrape data, or breach tenant isolation (Row-Level Security) is met with immediate, permanent account termination. We employ automated heuristics and logs auditing to track violations, and reserve the right to ban IP ranges and provide forensic tracking logs to cybercrime authorities for prosecution." },
    { num: "06", title: "Service Level Agreement (SLA) & Outage Exclusions", body: "We guarantee a 99.9% uptime monthly target for Core Matrix nodes and 99.99% for Enterprise nodes. Downtime calculations exclude scheduled maintenance windows (announced 7 days in advance), force majeure events, and upstream third-party hosting outages (Vercel, Supabase, or AWS) beyond our direct control." },
    { num: "07", title: "SLA Remedy Credit Matrix", body: "If monthly availability falls below the target, the sole and exclusive remedy is the issuance of Service Credits applied to the next billing cycle: 10% credit for drop below target, and 25% credit for drop below 99.0%. Service Credits in any single month are strictly capped at 30% of the monthly subscription fee." },
    { num: "08", title: "Warranty Disclaimer", body: "The platform is provided on an 'as-is' and 'as-available' basis. LUCY_ACADEMIA disclaims all warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to any implied warranties of merchantability, fitness for a particular purpose, or error-free system operation." },
    { num: "09", title: "Limitation of Liability & Consequential Damage Cap", body: "LUCY_ACADEMIA shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including lost tuition revenue, reputational harm, or data loss. Our aggregate direct liability for any claim is strictly capped at the total amount of subscription fees paid by the institution in the 12 months immediately preceding the event." },
    { num: "10", title: "Mutual Indemnification", body: "The institution agrees to defend, indemnify, and hold harmless LUCY_ACADEMIA against any third-party claims, liabilities, or expenses arising from the institution's violation of privacy laws, upload of copyrighted curriculum without license, or misuse of user information." },
    { num: "11", title: "Governing Law & Disputes Jurisdiction", body: "These terms are governed exclusively by the laws of South Africa. The parties submit to the sole jurisdiction of the Western Cape High Court in Cape Town for any disputes arising from this agreement." },
];

export default function Terms() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono lowercase tracking-tight">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-md px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_academia</span>
                    </Link>
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-3xl mx-auto space-y-20">

                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <FileText className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">legal_protocol // effective 2026-01-01</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-none">
                                terms of<br /><GlitchText className="text-zinc-800">service.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-zinc-500 text-base leading-relaxed">
                                the operating agreement between lucy_academia and each provisioned institutional node. read before initializing your system.
                            </p>
                        </Reveal>
                    </section>

                    <div className="space-y-0 border border-white/5 overflow-hidden">
                        {clauses.map((clause, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ backgroundColor: "rgba(255,255,255,0.015)" }}
                                className="p-8 border-b border-white/5 last:border-b-0 space-y-3 group cursor-default transition-colors"
                            >
                                <div className="flex gap-6 items-baseline">
                                    <motion.div animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.4 }} className="text-[9px] text-zinc-700 shrink-0 font-bold">[{clause.num}]</motion.div>
                                    <h2 className="text-base font-bold uppercase tracking-tight group-hover:text-white transition-colors">{clause.title}</h2>
                                </div>
                                <p className="text-zinc-500 text-xs leading-relaxed pl-10">{clause.body}</p>
                                <div className="pl-10 h-px bg-zinc-900 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }} transition={{ duration: 1.3, delay: i * 0.08 }} className="h-full bg-white/8" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <PageFooter id="TERMS_OF_SERVICE" links={[{ href: "/privacy", label: "privacy" }, { href: "/compliance", label: "compliance" }, { href: "/contact", label: "uplink" }]} />
        </div>
    );
}
