"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Newspaper, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText, HexGrid } from "@/components/public/animations";

const mentions = [
    { outlet: "EdTech Africa", date: "2026-02-28", title: "LUCY OS is quietly becoming the backbone for African schools scrambling to digitize.", category: "Feature" },
    { outlet: "TechCrunch Africa", date: "2026-02-15", title: "The school OS nobody saw coming — LUCY is rewriting institutional management for the continent.", category: "Profile" },
    { outlet: "SchoolLeader Digest", date: "2026-01-30", title: "How a zero-trust AI layer is keeping parent data private while boosting engagement 3x.", category: "Analysis" },
    { outlet: "AI Horizons Podcast", date: "2026-01-20", title: "Episode 142: Neural routing for academic institutions — live demo with LUCY OS.", category: "Podcast" },
    { outlet: "Cape Business News", date: "2026-01-05", title: "Western Cape schools pilot LUCY OS as the province's smart-school initiative expands.", category: "News" },
];

const pressKit = [
    { label: "Company Name", val: "LUCY_SYS / LUCY OS" },
    { label: "Founded", val: "2025" },
    { label: "Headquarters", val: "Addis Ababa, Ethiopia" },
    { label: "Category", val: "EdTech / Academic OS" },
    { label: "Current Version", val: "v1.0.4" },
    { label: "Press Contact", val: "press@5-cn.net" },
];

const categoryColor = (cat: string) => {
    if (cat === "Feature") return "border-white/20 text-white";
    if (cat === "Profile") return "border-zinc-500 text-zinc-400";
    if (cat === "Podcast") return "border-zinc-700 text-zinc-500";
    return "border-zinc-800 text-zinc-600";
};

export default function Press() {
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
                        <span className="font-bold text-lg tracking-tighter text-white">LUCY OS</span>
                    </Link>
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-4xl mx-auto space-y-32">

                    <section className="space-y-10 relative overflow-hidden">
                        <HexGrid />
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <Newspaper className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">press_room // media_coverage</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                press<br /><GlitchText className="text-zinc-800">room.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-zinc-500 text-xl leading-relaxed max-w-xl">
                                media coverage, podcast appearances, and press resources. for all inquiries, contact press@5-cn.net.
                            </p>
                        </Reveal>
                    </section>

                    {/* Press Kit */}
                    <Reveal>
                        <div className="p-10 border border-white/10 bg-zinc-900/5 space-y-8">
                            <div className="flex items-center gap-4 text-zinc-500">
                                <div className="h-px w-12 bg-zinc-800" />
                                <span className="text-[10px] uppercase tracking-[0.4em]">press_kit // company_facts</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {pressKit.map((item, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} transition={{ delay: i * 0.07 }} whileHover={{ y: -3 }} className="space-y-1 cursor-default">
                                        <div className="text-[9px] text-zinc-700 uppercase tracking-widest">{item.label}</div>
                                        <div className="text-sm text-white font-bold">{item.val}</div>
                                        <div className="h-px bg-zinc-900 overflow-hidden">
                                            <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: false }} transition={{ duration: 0.8, delay: i * 0.07 }} className="h-full bg-white/10" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </Reveal>

                    {/* Mentions */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <div className="h-px w-12 bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">media_mentions // coverage_log</span>
                        </Reveal>
                        <div className="space-y-px border border-white/5 overflow-hidden">
                            {mentions.map((m, i) => (
                                <TiltCard key={i}>
                                    <motion.div
                                        initial={{ opacity: 0, x: -15 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: false }}
                                        transition={{ delay: i * 0.08 }}
                                        whileHover={{ paddingLeft: "2.5rem" }}
                                        className="bg-black border-b last:border-b-0 border-white/5 p-8 space-y-3 group cursor-default transition-all relative overflow-hidden"
                                    >
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 10% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
                                        <div className="relative flex items-center justify-between gap-4 flex-wrap">
                                            <div className="flex items-center gap-3">
                                                <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.4 }} className="w-1.5 h-1.5 bg-white rounded-full shrink-0" />
                                                <span className="font-bold text-sm uppercase tracking-tight">{m.outlet}</span>
                                                <div className={`px-2 py-0.5 border text-[8px] uppercase tracking-widest ${categoryColor(m.category)}`}>{m.category}</div>
                                            </div>
                                            <div className="flex items-center gap-3 text-[9px] text-zinc-700 uppercase tracking-widest">
                                                {m.date}
                                                <motion.div whileHover={{ x: 3 }}><ExternalLink className="w-3 h-3" /></motion.div>
                                            </div>
                                        </div>
                                        <p className="relative text-zinc-400 text-sm leading-relaxed pl-5">{m.title}</p>
                                        <div className="relative h-px bg-zinc-900 overflow-hidden">
                                            <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: false }} transition={{ duration: 1.3, delay: i * 0.1 }} className="h-full bg-white/8" />
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>
                    </section>

                    {/* Contact */}
                    <Reveal>
                        <div className="p-10 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="space-y-2">
                                <div className="text-[9px] text-zinc-700 uppercase tracking-widest">media_inquiries</div>
                                <h3 className="text-2xl font-bold uppercase tracking-tight">Press Contact</h3>
                                <p className="text-zinc-500 text-xs">for interview requests, logo assets, or fact-checking — contact: press@5-cn.net</p>
                            </div>
                            <Link href="/contact">
                                <Button variant="outline" className="h-12 px-8 rounded-none border-white/20 text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all font-bold">
                                    send_inquiry
                                </Button>
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="PRESS_ROOM" links={[{ href: "/about", label: "about" }, { href: "/careers", label: "careers" }, { href: "/contact", label: "uplink" }]} />
        </div>
    );
}
