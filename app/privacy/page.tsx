"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, GlitchText } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const clauses = [
    { num: "01", title: "Data We Collect", body: "We collect institutional data (school name, contact information), identity data (name, email, role), and operational data (attendance records, grades, session logs). We do not collect biometric data." },
    { num: "02", title: "How We Use Your Data", body: "Data is used exclusively to operate and improve the LUCY system. We do not sell data to third parties, use data for advertising, or process is for non-educational purposes." },
    { num: "03", title: "Data Isolation", body: "Each institution's data is stored in a cryptographically isolated schema within a shared PostgreSQL cluster. Row-Level Security enforces that no query can cross institutional boundaries." },
    { num: "04", title: "Data Retention", body: "Active institution data is retained for the duration of the subscription. Upon termination, data is purged within 30 days unless a data export has been requested. Audit logs are retained for 7 years." },
    { num: "05", title: "Third-party Services", body: "We use OpenAI for AI features (data is not stored by OpenAI beyond the session), Supabase for auth, Vercel for hosting, and Gmail SMTP for email dispatch. All third-parties are contractually bound to our privacy standards." },
    { num: "06", title: "Your Rights", body: "Institutions have the right to export their data at any time via the Director dashboard or API. Individual users may request deletion of their personal record by contacting institutional administrators." },
    { num: "07", title: "Security Practices", body: "We enforce AES-256 encryption at rest, TLS 1.3 in transit, mandatory MFA for admin accounts, append-only audit logs, and regular penetration testing." },
    { num: "08", title: "Contact", body: "For privacy inquiries, data export requests, or incident reports, contact: privacy@5-cn.net — or open a support case through your institutional dashboard." },
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
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_os</span>
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
                                this policy describes how lucy_os collects, processes, and protects data across all institutional nodes.
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
