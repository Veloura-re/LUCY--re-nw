"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Map, CheckCircle, Clock, Loader } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText } from "@/components/public/animations";

const quarters = [
    {
        label: "Q4 2025 — done", done: true,
        items: [
            { title: "Core auth system + MFA", done: true },
            { title: "Attendance module with parent alerts", done: true },
            { title: "Grading + exam locking engine", done: true },
            { title: "Timetable generator v1", done: true },
            { title: "AI neural assistant (core persona)", done: true },
        ]
    },
    {
        label: "Q1 2026 — current", done: false,
        items: [
            { title: "Public website expansion + animations", done: true },
            { title: "Geography, Math, Science AI personas", done: true },
            { title: "Parent portal mobile optimization", done: false },
            { title: "Offline attendance sync for low-bandwidth", done: false },
            { title: "AI-generated progress reports", done: false },
        ]
    },
    {
        label: "Q2 2026 — planned", done: false,
        items: [
            { title: "Custom exam templates per subject", done: false },
            { title: "Real-time collaborative markbook", done: false },
            { title: "Director analytics v2 with trend AI", done: false },
            { title: "FERPA & GDPR compliance certification", done: false },
        ]
    },
    {
        label: "Q3 2026 — vision", done: false,
        items: [
            { title: "On-premise deployment toolkit", done: false },
            { title: "Multi-language neural interface", done: false },
            { title: "Predictive dropout risk scoring", done: false },
            { title: "Open API for third-party integrations", done: false },
        ]
    }
];

export default function Roadmap() {
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
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_academia</span>
                    </Link>
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-5xl mx-auto space-y-24">

                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <Map className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">evolution_vector // quarterly_directive</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                road<br /><GlitchText className="text-zinc-800">map.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-xl">
                            <p className="text-zinc-500 text-lg leading-relaxed">
                                the planned trajectory of the lucy neural matrix. publicly transparent, quarterly-gated development vectors.
                            </p>
                        </Reveal>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quarters.map((q, i) => (
                            <TiltCard key={i}>
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.3 }}
                                    className={`h-full p-10 border space-y-8 cursor-default relative overflow-hidden ${q.label.includes("current") ? "border-white/20 bg-zinc-900/10" : "border-white/5 bg-black"}`}
                                >
                                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] text-zinc-700 uppercase tracking-widest">{q.label}</span>
                                            {q.label.includes("current") && (
                                                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.3 }} className="w-1.5 h-1.5 bg-white rounded-full" />
                                            )}
                                        </div>
                                        <div className="h-px bg-zinc-900 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: q.done ? "100%" : q.label.includes("current") ? "40%" : "0%" }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
                                                className="h-full bg-white/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {q.items.map((item, j) => (
                                            <motion.div key={j} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: j * 0.07 }} className="flex items-start gap-4 text-xs">
                                                {item.done ? (
                                                    <CheckCircle className="w-3 h-3 text-white shrink-0 mt-0.5" />
                                                ) : q.label.includes("current") ? (
                                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.8 }}>
                                                        <Loader className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />
                                                    </motion.div>
                                                ) : (
                                                    <Clock className="w-3 h-3 text-zinc-800 shrink-0 mt-0.5" />
                                                )}
                                                <span className={item.done ? "text-zinc-400" : "text-zinc-600"}>{item.title}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            </TiltCard>
                        ))}
                    </div>
                </div>
            </main>

            <PageFooter id="ROADMAP" links={[{ href: "/changelog", label: "changelog" }, { href: "/status", label: "status" }, { href: "/docs", label: "docs" }]} />
        </div>
    );
}
