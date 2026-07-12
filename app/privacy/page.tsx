"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, GlitchText } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const clauses = [
    { num: "01", title: "Responsible Party vs Operator Definition", body: "Under POPIA (Protection of Personal Information Act) and GDPR, the educational institution is the 'Responsible Party' (or Data Controller) directing data operations. LUCY OS acts strictly as the 'Operator' (or Data Processor), processing institutional data solely on documented instructions under a mandatory Data Processing Addendum (DPA) to limit platform liabilities." },
    { num: "02", title: "Data Scope & Juristic Persons Protection", body: "We collect institutional data (legal names, contact info), identity data (names, emails, active roles), and operational logs (grades, attendance, security hashes). Unlike standard frameworks, we explicitly extend POPIA's protections to 'juristic persons' (corporate schools/bodies), treating business data with the identical safeguards applied to personal student records." },
    { num: "03", title: "Cryptographic Isolation & Row-Level Security", body: "All data ingested is housed in a PostgreSQL cluster. We employ strict PostgreSQL Row-Level Security (RLS) policies at the database layer to ensure complete cryptographic and operational tenant isolation, making cross-tenant data leakage mathematically and architecturally impossible." },
    { num: "04", title: "Data Minimization & Minimizing AI Subprocessor Risks", body: "OpenAI is engaged as an AI subprocessor. Prompt payloads are stripped of extraneous PII at the platform boundary. Crucially, we enforce a strict Zero Data Retention (ZDR) policy with OpenAI, excluding prompts and responses from abuse monitoring logs entirely. No AI outputs are used for generative foundational model training." },
    { num: "05", title: "Subprocessor Risk Management", body: "We leverage Vercel (for ephemeral frontend delivery and perimeter DDoS shield) and Supabase (for database storage, encryptions at rest via AES-256, and TLS 1.3 transit tunnels). All subprocessors are legally bound to support local and global data compliance mandates, and data residency settings restrict primary storage regions to specified jurisdictions." },
    { num: "06", title: "Data Portability & Deletion Rights", body: "Responsible parties retain absolute ownership over all raw data and may execute a full structured export at any time via the Admin Ledger or direct APIs. Individual users (faculty, parents, students) can request deletion, correction, or access to their records through their school's administrators." },
    { num: "07", title: "Data Retention & Purging Lifecycle", body: "Active institution files are kept for the duration of the subscription. Upon contractual termination, all personal and operational data is permanently purged and overwritten within 30 days. System audit logs are retained for 7 years to satisfy regulatory compliance." },
    { num: "08", title: "Emergency Breach Notification & Incident Response", body: "In the event of a security compromise or unauthorized data disclosure, LUCY OS will notify the institutional Responsible Party within 72 hours of verification. As an Operator, we provide complete forensic details (impact scope, mitigation measures) to enable the institution to fulfill its reporting duties to the Information Regulator." },
    { num: "09", title: "Governing Law & Regulatory Inquiries", body: "This privacy protocol is governed by the laws of Ethiopia, aligned with the Ethiopian Data Protection Proclamation and harmonized with GDPR. For inquiries, DPA contracts, or compliance questions, contact our security officer at lucyosck21@gmail.com." },
];

export default function Privacy() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono lowercase tracking-tight">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-md px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-white">LUCY OS</span>
                    </Link>
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-3xl mx-auto space-y-20">

                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <Lock className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">data_protocol // effective 2026-01-01</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-none">
                                privacy<br /><GlitchText className="text-zinc-800">policy.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-zinc-500 text-base leading-relaxed">
                                this policy describes how LUCY OS collects, processes, and protects data across all institutional nodes.
                            </p>
                        </Reveal>
                    </section>

                    {/* Clauses */}
                    <div className="space-y-0 border border-white/5 overflow-hidden">
                        {clauses.map((clause, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.06 }}
                                whileHover={{ backgroundColor: "rgba(255,255,255,0.015)" }}
                                className="p-8 border-b border-white/5 last:border-b-0 space-y-3 group cursor-default transition-colors"
                            >
                                <div className="flex gap-6 items-baseline">
                                    <motion.div animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.3 }} className="text-[9px] text-zinc-700 shrink-0 font-bold">[{clause.num}]</motion.div>
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

            <PageFooter id="PRIVACY_POLICY" links={[{ href: "/terms", label: "terms" }, { href: "/compliance", label: "compliance" }, { href: "/security", label: "vault" }]} />
        </div>
    );
}
