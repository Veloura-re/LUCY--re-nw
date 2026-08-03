"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Monitor, Zap, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, ParticleField, Reveal, PageFooter, GlitchText, SmartWeb, SystemRain, MagneticButton, Typewriter, Counter } from "@/components/public/animations";

const demoSteps = [
    { id: "01", title: "Director Logs In", desc: "School director authenticates with multi-factor token. Dashboard instantly renders real-time institutional metrics.", terminal: ["> auth.verify(director_id)", "> mfa.challenge(): passed", "> session.spawn(role=DIRECTOR)", "> dashboard.render(): 14ms"] },
    { id: "02", title: "Attendance Ingested", desc: "A teacher marks class attendance. System records every entry with timestamp, dispatches parent alerts for absences.", terminal: ["> attendance.ingest(class_07A)", "> records.write(47 scholars)", "> absent.flag(ids=[4,12,33])", "> email.dispatch(3 parents): sent"] },
    { id: "03", title: "AI Responds", desc: "A struggling student queries the AI assistant. Lucy routes to the appropriate subject persona and responds instantly.", terminal: ["> ai.route(student_29, 'math')", "> persona.load(MATH_EXPERT)", "> context.inject(student_history)", "> response.stream(): 340ms"] },
    { id: "04", title: "Director Reviews Analytics", desc: "Daily summary compiled: attendance rate, grade distribution, teacher performance — all in one command view.", terminal: ["> analytics.compile(today)", "> attendance_rate: 94.3%", "> avg_grade: B+", "> flagged_teachers: 0"] },
];

export default function Demo() {
    const [active, setActive] = useState(0);

    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-zinc-900 dark:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-4 transition-colors">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <motion.div whileHover={{ scale: 1.12, rotate: 5 }} className="w-6 h-6 bg-slate-900 dark:bg-white flex items-center justify-center">
                            <span className="text-zinc-900 dark:text-white dark:text-black font-black text-xs">L</span>
                        </motion.div>
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">lucy_os</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle className="scale-90" />
                        <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />back_to_home</Button></Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-24 sm:pt-32 pb-20 sm:pb-40 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto space-y-16 sm:space-y-24">

                    {/* Hero */}
                    <section className="relative overflow-hidden space-y-6 sm:space-y-10">
                        <ParticleField count={40} />
                        <Reveal className="flex items-center gap-3 sm:gap-4 text-slate-400 dark:text-zinc-500">
                            <Monitor className="w-4 h-4 shrink-0" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] font-bold">live_demo // walkthrough_v1.0</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                see it<br /><GlitchText className="text-slate-300 dark:text-zinc-800">live.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-xl">
                            <p className="text-slate-500 dark:text-zinc-500 text-base sm:text-xl leading-relaxed">
                                step through a full day in an institution running lucy_os. every action traces back through the system in real-time.
                            </p>
                        </Reveal>

                        {/* Live stats bar */}
                        <Reveal delay={0.3} className="flex flex-wrap gap-8 py-6 border-t border-slate-200 dark:border-white/5">
                            {[
                                { label: "avg_session_speed", val: 14, suffix: "ms" },
                                { label: "uptime_today", val: 100, suffix: "%" },
                                { label: "ai_response_avg", val: 340, suffix: "ms" },
                                { label: "data_processed", val: 48, suffix: "k_records" },
                            ].map((s, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} transition={{ delay: i * 0.08 }} className="space-y-1">
                                    <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest">{s.label}</div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white"><Counter to={s.val} suffix={s.suffix} /></div>
                                </motion.div>
                            ))}
                        </Reveal>
                    </section>

                    {/* Step walkthrough */}
                    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-px bg-slate-200 dark:bg-white/10 border border-slate-200 dark:border-white/10 overflow-hidden rounded-xl dark:rounded-none">
                        {/* Step list */}
                        <div className="bg-white dark:bg-black p-6 space-y-1">
                            <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest mb-4">sequence_index</div>
                            {demoSteps.map((step, i) => (
                                <motion.button key={i} onClick={() => setActive(i)} whileHover={{ x: 4 }}
                                    className={`w-full text-left p-4 flex items-center gap-4 text-xs uppercase tracking-wide transition-all ${active === i ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5" : "text-slate-500 dark:text-zinc-600 hover:text-slate-700 dark:hover:text-zinc-400"}`}>
                                    <motion.div animate={active === i ? { opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] } : { opacity: 0.2 }} transition={{ repeat: Infinity, duration: 1.8 }} className="w-1.5 h-1.5 bg-slate-900 dark:bg-white rounded-full shrink-0" />
                                    <span className="text-[8px] text-slate-400 dark:text-zinc-700 shrink-0">{step.id}</span>
                                    <span>{step.title}</span>
                                </motion.button>
                            ))}
                        </div>

                        {/* Content */}
                        <AnimatePresence mode="wait">
                            <motion.div key={active} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.1 }} className="bg-slate-50 dark:bg-[#050505] p-10 space-y-8">
                                <div className="space-y-3">
                                    <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest">step_{demoSteps[active].id}</div>
                                    <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">{demoSteps[active].title}</h2>
                                    <p className="text-slate-500 dark:text-zinc-500 text-sm leading-relaxed max-w-lg">{demoSteps[active].desc}</p>
                                </div>
                                <TiltCard>
                                    <div className="border border-slate-200 dark:border-white/5 bg-slate-900 dark:bg-black p-6 space-y-2 relative overflow-hidden rounded-xl dark:rounded-none">
                                        <div className="absolute inset-0 pointer-events-none"><SystemRain cols={8} /></div>
                                        <div className="relative z-10">
                                            {demoSteps[active].terminal.map((line, j) => (
                                                <motion.div key={j} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: j * 0.12 }}
                                                    className={`text-[10px] font-mono leading-relaxed ${j === demoSteps[active].terminal.length - 1 ? "text-emerald-400 dark:text-white" : "text-emerald-400/50 dark:text-zinc-600"}`}>
                                                    {line}
                                                </motion.div>
                                            ))}
                                            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="inline-block w-1.5 h-3 bg-emerald-400 dark:bg-white ml-1 align-middle" />
                                        </div>
                                    </div>
                                </TiltCard>
                                <div className="flex gap-4">
                                    <MagneticButton>
                                        <Button onClick={() => setActive(i => Math.min(i + 1, demoSteps.length - 1))} disabled={active === demoSteps.length - 1} className="h-12 px-8 bg-slate-900 dark:bg-white text-zinc-900 dark:text-white dark:text-black hover:bg-slate-800 dark:hover:bg-zinc-200 rounded-lg dark:rounded-none text-[10px] uppercase tracking-widest font-bold">
                                            next_step <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </MagneticButton>
                                    {active > 0 && (
                                        <Button onClick={() => setActive(i => i - 1)} variant="outline" className="h-12 px-6 rounded-lg dark:rounded-none border-slate-200 dark:border-white/20 text-[10px] uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white hover:text-slate-900 dark:hover:text-black transition-all">prev</Button>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* CTA */}
                    <Reveal className="text-center space-y-8">
                        <h2 className="text-4xl font-bold uppercase tracking-tighter">ready to get started?</h2>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <MagneticButton>
                                <Link href="/register"><Button className="h-14 px-10 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-zinc-200 rounded-lg dark:rounded-none text-[11px] uppercase tracking-widest font-bold">Get Started</Button></Link>
                            </MagneticButton>
                            <MagneticButton>
                                <Link href="/contact"><Button variant="outline" className="h-14 px-10 rounded-lg dark:rounded-none border-slate-200 dark:border-white/20 text-[11px] uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white hover:text-slate-900 dark:hover:text-black transition-all">Contact Us</Button></Link>
                            </MagneticButton>
                        </div>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="DEMO_MATRIX" links={[{ href: "/features", label: "specs" }, { href: "/register", label: "provision" }, { href: "/contact", label: "contact" }]} />
        </div>
    );
}
