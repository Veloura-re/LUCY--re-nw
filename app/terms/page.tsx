"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, GlitchText } from "@/components/public/animations";

const clauses = [
    { num: "01", title: "Acceptance of Terms", body: "By provisioning a node (creating an account) on LUCY_OS, you acknowledge and agree to these terms. These terms apply to all institutional administrators, faculty, students, and parent observers using the platform." },
    { num: "02", title: "Permitted Use", body: "LUCY_OS is licensed exclusively for educational institution management. Use of the platform for non-educational commercial purposes, data harvesting, or any activity outside institutional administration is prohibited." },
    { num: "03", title: "Account Responsibilities", body: "Each institution is responsible for maintaining the integrity of its administrator credentials. Institutions are liable for any actions taken by users operating under their institutional node." },
    { num: "04", title: "Data Ownership", body: "All academic data entered into the system (students, grades, attendance, etc.) remains the sole property of the institution. LUCY_OS claims no ownership over institutional data." },
    { num: "05", title: "Service Availability", body: "We commit to a 99.9% uptime SLA for Core Matrix tier and 99.99% for Enterprise nodes. Scheduled maintenance is excluded from uptime calculations. Credit is issued for downtime exceeding the SLA." },
    { num: "06", title: "Termination", body: "Either party may terminate the agreement with 30 days written notice. Upon termination, all institutional data will be returned via export and purged from our systems within 30 days." },
    { num: "07", title: "Limitation of Liability", body: "LUCY_OS is not liable for indirect, incidental, or consequential damages arising from system use. Total liability is capped at the sum of fees paid in the preceding 12 months." },
    { num: "08", title: "Governing Law", body: "These terms are governed by South African law. Jurisdiction for disputes is the Western Cape High Court, unless both parties mutually agree to alternative dispute resolution." },
];

export default function Terms() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono lowercase tracking-tight">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-md px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <motion.div whileHover={{ scale: 1.12, rotate: 5 }} className="w-6 h-6 bg-white flex items-center justify-center">
                            <span className="text-black font-black text-xs">L</span>
                        </motion.div>
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_os</span>
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
                                the operating agreement between lucy_os and each provisioned institutional node. read before initializing your system.
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
