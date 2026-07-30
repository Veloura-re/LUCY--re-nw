"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Clock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText, HexGrid, GlitchOverlay } from "@/components/public/animations";

const posts = [
    {
        id: "01", category: "architecture", date: "2026-03-01", readTime: "7 min",
        title: "Why We Chose Single-Tenant Architecture for School Data",
        excerpt: "Shared DBs are faster to build but dangerous in education. Here's the technical case for isolated schemas — and the performance tradeoffs we accepted.",
        featured: true,
    },
    {
        id: "02", category: "ai & personas", date: "2026-02-20", readTime: "5 min",
        title: "Building AI Personas That Actually Understand School Context",
        excerpt: "How we trained subject-specific AI nodes — and why a generic LLM wrapper isn't enough for academic instruction.",
        featured: false,
    },
    {
        id: "03", category: "security", date: "2026-02-10", readTime: "6 min",
        title: "Zero-Trust in a School: What BOLA Attacks Taught Us",
        excerpt: "We found 12 BOLA vulnerabilities in our own API. Here's how we remediated them and what every edtech founder should check.",
        featured: false,
    },
    {
        id: "04", category: "product", date: "2026-01-28", readTime: "4 min",
        title: "Real-Time Parent Alerts — Engineering the 800ms SLA",
        excerpt: "From attendance mark to parent inbox in under a second. The SMTP queueing and retry architecture behind our notification engine.",
        featured: false,
    },
    {
        id: "05", category: "operations", date: "2026-01-15", readTime: "8 min",
        title: "Timetable Generation: Why We Avoided ML and Used Constraint Solving",
        excerpt: "Neural networks looked sexy. But for school timetables, constraint solvers are faster, cheaper, and more explainable. The tradeoffs explained.",
        featured: false,
    },
];

const catColor = (cat: string) => {
    if (cat === "architecture") return "text-slate-600 border-slate-300 dark:text-zinc-300 dark:border-zinc-600";
    if (cat === "ai & personas") return "text-slate-500 border-slate-300 dark:text-zinc-400 dark:border-zinc-700";
    if (cat === "security") return "text-slate-500 border-slate-300 dark:text-zinc-400 dark:border-zinc-700";
    return "text-slate-400 border-slate-200 dark:text-zinc-600 dark:border-zinc-800";
};

export default function Blog() {
    const [featured, ...rest] = posts;

    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />
            <GlitchOverlay />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-4 transition-colors">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <motion.div whileHover={{ scale: 1.12, rotate: 5 }} className="w-6 h-6 bg-slate-900 dark:bg-white flex items-center justify-center">
                            <span className="text-white dark:text-black font-black text-xs">L</span>
                        </motion.div>
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">lucy_os</span>
                    </Link>
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-5xl mx-auto space-y-24">

                    <section className="space-y-8 relative overflow-hidden">
                        <HexGrid />
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <BookOpen className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">signal_log // technical_dispatch</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                signal<br /><GlitchText className="text-slate-300 dark:text-zinc-800">log.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-slate-500 dark:text-zinc-500 text-xl leading-relaxed max-w-xl">
                                technical writing from inside the lucy_os build. architecture decisions, security postmortems, and product retrospectives.
                            </p>
                        </Reveal>
                    </section>

                    {/* Featured post */}
                    <TiltCard>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: false }}
                            className="p-12 border border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-zinc-900/10 space-y-6 group cursor-pointer relative overflow-hidden rounded-xl dark:rounded-none"
                            whileHover={{ backgroundColor: "var(--hover-bg)" }}
                            style={{ "--hover-bg": "var(--fallback, rgba(0,0,0,0.02))" } as any}
                        >
                            <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.05) 0%, transparent 70%)" }} />
                            <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 30% 30%, rgba(0,0,0,0.03) 0%, transparent 70%)" }} />
                            <div className="relative flex items-center gap-4 flex-wrap z-10">
                                <div className={`px-2 py-0.5 border rounded-md dark:rounded-none text-[8px] uppercase tracking-widest ${catColor(featured.category)}`}>{featured.category}</div>
                                <div className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest">
                                    <Clock className="w-3 h-3" />{featured.readTime} read
                                </div>
                                <span className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest ml-auto">{featured.date}</span>
                            </div>
                            <h2 className="relative z-10 text-3xl md:text-4xl font-bold uppercase tracking-tighter leading-tight group-hover:text-emerald-600 dark:group-hover:text-white transition-colors">{featured.title}</h2>
                            <p className="relative z-10 text-slate-600 dark:text-zinc-500 leading-relaxed max-w-2xl">{featured.excerpt}</p>
                            <motion.div whileHover={{ x: 5 }} className="relative z-10 flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-600 group-hover:text-emerald-600 dark:group-hover:text-white transition-colors cursor-pointer font-bold">
                                read_post <ChevronRight className="w-4 h-4" />
                            </motion.div>
                        </motion.div>
                    </TiltCard>

                    {/* Posts grid */}
                    <div className="space-y-px border border-slate-200 dark:border-white/5 overflow-hidden rounded-xl dark:rounded-none">
                        {rest.map((post, i) => (
                            <TiltCard key={i}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: false }}
                                    transition={{ delay: i * 0.07 }}
                                    whileHover={{ paddingLeft: "2.5rem", backgroundColor: "var(--hover-bg-small)" }}
                                    style={{ "--hover-bg-small": "var(--fallback, rgba(0,0,0,0.015))" } as any}
                                    className="bg-white dark:bg-black border-b last:border-b-0 border-slate-200 dark:border-white/5 p-8 flex flex-col md:flex-row justify-between gap-6 group cursor-pointer transition-all relative overflow-hidden"
                                >
                                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 10% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
                                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 10% 50%, rgba(0,0,0,0.02) 0%, transparent 70%)" }} />
                                    
                                    <div className="relative space-y-2 flex-1 z-10">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.4 }} className="w-1.5 h-1.5 bg-slate-900 dark:bg-white rounded-full shrink-0" />
                                            <div className={`px-2 py-0.5 border rounded-md dark:rounded-none text-[8px] uppercase tracking-widest ${catColor(post.category)}`}>{post.category}</div>
                                        </div>
                                        <h3 className="text-xl font-bold uppercase tracking-tight group-hover:text-emerald-600 dark:group-hover:text-white transition-colors text-slate-900 dark:text-white">{post.title}</h3>
                                        <p className="text-slate-600 dark:text-zinc-600 text-xs leading-relaxed max-w-lg">{post.excerpt}</p>
                                    </div>
                                    <div className="relative flex flex-col items-end justify-between gap-4 shrink-0 z-10">
                                        <span className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest">{post.date}</span>
                                        <div className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-zinc-700">
                                            <Clock className="w-3 h-3" />{post.readTime}
                                        </div>
                                        <motion.div whileHover={{ x: 3 }} className="text-[9px] text-slate-400 dark:text-zinc-600 group-hover:text-emerald-600 dark:group-hover:text-white transition-colors uppercase tracking-widest font-bold">read →</motion.div>
                                    </div>
                                </motion.div>
                            </TiltCard>
                        ))}
                    </div>
                </div>
            </main>

            <PageFooter id="SIGNAL_LOG" links={[{ href: "/changelog", label: "changelog" }, { href: "/docs", label: "docs" }, { href: "/roadmap", label: "roadmap" }]} />
        </div>
    );
}
