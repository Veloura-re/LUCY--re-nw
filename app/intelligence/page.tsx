"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, Zap, Target, Sparkles, Network } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, ParticleField, Reveal, PageFooter, GlitchText, SmartWeb, SystemRain, MagneticButton, Typewriter, OrbitRing, HexGrid, GlitchOverlay, Counter } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const behaviors = [
    { title: "Cognitive Routing", desc: "Dynamically allocates processing power based on task urgency and institutional impact. Every query reaches the right engine within milliseconds.", icon: Zap, id: "BEH_01", metric: "14ms", metricLabel: "avg_response" },
    { title: "AI Synthesizing", desc: "Aggregates fragmented data points — attendance, grades, behavior — into actionable insights for faculty and administration.", icon: Brain, id: "BEH_02", metric: "99.9%", metricLabel: "data_accuracy" },
    { title: "Tactical Response", desc: "Real-time adjustments to scheduling and resource allocation. The system detects friction points and reroutes before they compound.", icon: Target, id: "BEH_03", metric: "3s", metricLabel: "alert_latency" },
];

const personas = [
    { name: "Core Intelligence", role: "Primary logic gate and system oversight. Handles inter-module coordination.", id: "LUCY_CORE", color: "rgba(255,255,255,0.15)" },
    { name: "Teacher Collective", role: "Specialized academic instruction — grading, lesson notes, and student feedback.", id: "TEACHER_COLL", color: "rgba(255,255,255,0.08)" },
    { name: "Administrative Hub", role: "Logistics, attendance, timetabling, and fiscal management.", id: "ADMIN_HUB", color: "rgba(255,255,255,0.08)" },
    { name: "Geography Expert", role: "Geographic and spatial intelligence specialist — maps, biomes, geopolitics.", id: "GEO_PROTO", color: "rgba(255,255,255,0.08)" },

    { name: "Math Architect", role: "Advanced mathematical reasoning — calculus, algebra, and proof-based problem solving.", id: "MATH_ARCH", color: "rgba(255,255,255,0.08)" },
];

const thoughtStream = [
    "> initializing system...",
    "> loading persona_registry: 5 schools",
    "> cognitive_routing: ACTIVE",
    "> behavioral_pattern: NOMINAL",
    "> threat_detection: CLEAR",
    "> enrolled_students: MONITORED",
    "> uptime: 99.98% // 30_day_avg",
];

export default function Intelligence() {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />
            <GlitchOverlay />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-4 transition-colors">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">lucy_os</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle className="scale-90" />
                        <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />back_to_home</Button></Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-24 sm:pt-32 pb-20 sm:pb-40 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto space-y-16 sm:space-y-32">

                    {/* Hero with SmartWeb */}
                    <section className="relative min-h-[50vh] sm:min-h-[60vh] flex flex-col justify-center space-y-6 sm:space-y-10 overflow-hidden">
                        <div className="absolute inset-0 opacity-10 dark:opacity-40"><SmartWeb nodeCount={28} /></div>
                        <HexGrid />

                        <Reveal className="flex items-center gap-3 sm:gap-4 text-slate-400 dark:text-zinc-400">
                            <Sparkles className="w-4 h-4 shrink-0" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-600" />
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] font-bold">cognitive_layer // intelligence_engine_active</span>
                            <motion.div animate={{ opacity: [1, 0, 1], scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1.3 }} className="w-1.5 h-1.5 bg-slate-900 dark:bg-white rounded-full" />
                        </Reveal>

                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-6xl md:text-[7.5rem] font-bold uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
                                smart<br /><GlitchText className="text-slate-400 dark:text-zinc-800">logic.</GlitchText>
                            </h1>
                        </Reveal>

                        <Reveal delay={0.2} className="max-w-2xl">
                            <p className="text-slate-500 dark:text-zinc-500 text-base sm:text-xl leading-relaxed">
                                the intelligence engine is the central processing core of lucy_os. it orchestrates the behavioral patterns of all specialized personas and manages the cognitive routing of institutional data.
                            </p>
                        </Reveal>

                        {/* Animated live stats */}
                        <Reveal delay={0.3} className="flex flex-wrap gap-10 py-8 border-t border-slate-200 dark:border-white/5">
                            {[
                                { label: "active_personas", val: 6, suffix: "" },
                                { label: "neurons_simulated", val: 12400, suffix: "" },
                                { label: "context_window", val: 32, suffix: "k_tokens" },
                                { label: "response_time", val: 340, suffix: "ms" },
                            ].map((s, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} transition={{ delay: i * 0.1 }} className="space-y-1">
                                    <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest">{s.label}</div>
                                    <div className="text-3xl font-bold text-slate-900 dark:text-white"><Counter to={s.val} suffix={s.suffix} /></div>
                                </motion.div>
                            ))}
                        </Reveal>
                    </section>

                    {/* Thought stream + orbit visualization */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TiltCard>
                            <div className="p-10 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950/50 space-y-6 h-full relative overflow-hidden rounded-xl dark:rounded-none">
                                <div className="absolute inset-0 opacity-10 dark:opacity-30"><SystemRain cols={6} /></div>
                                <div className="relative z-10 space-y-4">
                                    <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest">cognitive_stream // live</div>
                                    <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2.8, repeat: Infinity }} className="w-2 h-2 bg-slate-900 dark:bg-white rounded-full" />
                                    <Typewriter lines={thoughtStream} className="space-y-1.5 text-slate-600 dark:text-white" />
                                </div>
                            </div>
                        </TiltCard>

                        <TiltCard>
                            <div className="p-10 border border-slate-200 dark:border-white/5 bg-white dark:bg-black h-full flex flex-col items-center justify-center space-y-6 relative overflow-hidden rounded-xl dark:rounded-none">
                                <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />
                                <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.03) 0%, transparent 70%)" }} />
                                <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest">cognitive_topology</div>
                                <div className="relative">
                                    <OrbitRing nodeCount={7} radius={72} duration={10} />
                                </div>
                                <div className="text-[9px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest text-center">6_personas // 1_core_mesh</div>
                            </div>
                        </TiltCard>
                    </section>

                    {/* Behavior System */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">behavioral_patterns // core_directives</span>
                        </Reveal>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/10 overflow-hidden rounded-xl dark:rounded-none">
                            {behaviors.map((b, i) => (
                                <TiltCard key={i}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: false }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-white dark:bg-black p-10 space-y-8 group cursor-default h-full relative overflow-hidden"
                                    >
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05) 0%, transparent 70%)" }} />
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.03) 0%, transparent 70%)" }} />
                                        
                                        <div className="flex justify-between items-start relative z-10">
                                            <motion.div whileHover={{ rotate: 12, scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
                                                <b.icon className="w-7 h-7 text-slate-400 dark:text-zinc-600 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                                            </motion.div>
                                            <motion.span animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.4 }} className="text-[8px] text-slate-400 dark:text-zinc-800 font-bold">{b.id}</motion.span>
                                        </div>
                                        <div className="space-y-3 relative z-10">
                                            <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">{b.title}</h3>
                                            <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed">{b.desc}</p>
                                        </div>
                                        <div className="flex items-end justify-between pt-2 relative z-10">
                                            <div>
                                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{b.metric}</div>
                                                <div className="text-[8px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest">{b.metricLabel}</div>
                                            </div>
                                            <div className="h-px flex-1 mx-4 bg-slate-200 dark:bg-zinc-900 overflow-hidden">
                                                <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: false }} transition={{ duration: 1.3, delay: i * 0.1 }} className="h-full bg-slate-400 dark:bg-white/20" />
                                            </div>
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>
                    </section>

                    {/* Persona Registry */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">persona_registry // {personas.length}_active_schools</span>
                        </Reveal>
                        <div className="space-y-px overflow-hidden border border-slate-200 dark:border-white/5 rounded-xl dark:rounded-none">
                            {personas.map((p, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: false }}
                                    transition={{ delay: i * 0.07 }}
                                    whileHover={{ paddingLeft: "2.5rem" }}
                                    className="group p-6 border-b last:border-b-0 border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-default transition-all bg-white dark:bg-black hover:bg-slate-50 dark:hover:bg-zinc-900/15"
                                >
                                    <div className="flex items-center gap-5">
                                        <motion.div animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.5 }} className="w-1.5 h-1.5 bg-slate-900 dark:bg-white rounded-full shrink-0" />
                                        <div>
                                            <h4 className="font-bold uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-white transition-colors">{p.name}</h4>
                                            <p className="text-slate-500 dark:text-zinc-600 text-xs mt-0.5">{p.role}</p>
                                        </div>
                                    </div>
                                    <motion.div whileHover={{ scale: 1.05 }} className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-white/5 text-[9px] text-slate-500 dark:text-zinc-600 group-hover:text-slate-900 dark:group-hover:text-white group-hover:border-slate-300 dark:group-hover:border-white/20 transition-all shrink-0 rounded-md dark:rounded-none">
                                        {p.id}
                                    </motion.div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            <PageFooter id="INTELLIGENCE_NODE" links={[{ href: "/network", label: "network" }, { href: "/docs", label: "docs" }, { href: "/demo", label: "demo" }]} />
        </div>
    );
}
