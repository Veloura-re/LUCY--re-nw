"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle, Mail, BookOpen, MessageCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText } from "@/components/public/animations";
import { useState } from "react";

const faqs = [
    { q: "How do I register a new school?", a: "Navigate to /register and complete the Director Provisioning form. You'll receive an admin activation code by email within 24 hours. Once verified, your institutional node is live." },
    { q: "Can students and parents access LUCY?", a: "Yes. Principals can invite teachers, who can then enroll students. Parents are linked via unique invitation tokens sent through the parent pairing module." },
    { q: "How is student data protected?", a: "Every school's data is stored in a cryptographically isolated schema. No cross-institutional data access is architecturally possible. All data is encrypted at rest (AES-256) and in transit (TLS 1.3)." },
    { q: "What happens if a teacher is absent?", a: "Staff attendance is tracked separately. The Director dashboard shows which classes are unstaffed in real-time, and substitution can be arranged through the timetable module." },
    { q: "Is LUCY available on mobile?", a: "The system is fully responsive and optimized for mobile browsers. A dedicated PWA app is on the Q2 2026 roadmap." },
    { q: "Can I export grades and attendance?", a: "Yes. Export functions are available in PDF and CSV format from the Director analytics screen. API access for programmatic exports is available on Enterprise and Vanguard tiers." },
];

const channels = [
    { icon: Mail, name: "Email Support", desc: "General queries and provisioning requests", link: "mailto:support@lucyos.io", label: "compose_uplink" },
    { icon: MessageCircle, name: "Emergency Uplink", desc: "Critical system failures — Tier 2+ only", link: "/contact", label: "open_ticket" },
    { icon: BookOpen, name: "Documentation", desc: "Full technical reference and protocol guides", link: "/docs", label: "read_docs" },
];

export default function Support() {
    const [open, setOpen] = useState<number | null>(null);

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
                <div className="max-w-4xl mx-auto space-y-24">

                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <HelpCircle className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">support_protocol // knowledge_base</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                support<br /><GlitchText className="text-zinc-800">node.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-xl">
                            <p className="text-zinc-500 text-lg leading-relaxed">
                                answers to the most common queries. for urgent incidents, use the emergency uplink channel below.
                            </p>
                        </Reveal>
                    </section>

                    {/* Support Channels */}
                    <section className="space-y-6">
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <div className="h-px w-12 bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">uplink_channels</span>
                        </Reveal>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {channels.map((ch, i) => (
                                <TiltCard key={i}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="h-full p-8 border border-white/5 bg-zinc-900/5 space-y-6 group cursor-default relative overflow-hidden"
                                    >
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05) 0%, transparent 70%)" }} />
                                        <motion.div whileHover={{ rotate: 10, scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
                                            <ch.icon className="w-6 h-6 text-zinc-600 group-hover:text-white transition-colors" />
                                        </motion.div>
                                        <div className="space-y-2">
                                            <h3 className="font-bold uppercase tracking-tight">{ch.name}</h3>
                                            <p className="text-zinc-500 text-xs leading-relaxed">{ch.desc}</p>
                                        </div>
                                        <Link href={ch.link}>
                                            <motion.div whileHover={{ x: 4 }} className="text-[9px] uppercase tracking-widest text-zinc-600 hover:text-white transition-colors flex items-center gap-2 cursor-pointer">
                                                {ch.label} →
                                            </motion.div>
                                        </Link>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>
                    </section>

                    {/* FAQ Accordion */}
                    <section className="space-y-6">
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <div className="h-px w-12 bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">knowledge_base // faq</span>
                        </Reveal>
                        <div className="space-y-px border border-white/5 overflow-hidden">
                            {faqs.map((faq, i) => (
                                <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                                    <motion.button
                                        onClick={() => setOpen(open === i ? null : i)}
                                        whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                                        className="w-full p-6 flex justify-between items-start gap-4 text-left bg-black border-b border-white/5 last:border-b-0 transition-colors"
                                    >
                                        <span className="text-sm text-zinc-300 font-bold uppercase tracking-tight pr-4">{faq.q}</span>
                                        <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.1 }} className="shrink-0 mt-1">
                                            <ChevronDown className="w-4 h-4 text-zinc-600" />
                                        </motion.div>
                                    </motion.button>
                                    <AnimatePresence>
                                        {open === i && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                                className="overflow-hidden bg-zinc-900/10 border-b border-white/5"
                                            >
                                                <p className="p-6 text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            <PageFooter id="SUPPORT_NODE" links={[{ href: "/docs", label: "docs" }, { href: "/status", label: "status" }, { href: "/contact", label: "uplink" }]} />
        </div>
    );
}
