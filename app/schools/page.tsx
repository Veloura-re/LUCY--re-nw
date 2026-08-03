"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, School, CheckCircle, Users, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText, SmartWeb, MagneticButton, Counter, HexGrid } from "@/components/public/animations";

const schoolTypes = [
    { type: "Primary School", icon: BookOpen, id: "PRIM", desc: "Foundation management — class registers, homework tracking, parent alerts, and grade-level analytics.", features: ["attendance tracking", "parent portal", "grade book", "timetable"] },
    { type: "High School", icon: School, id: "HIGH", desc: "Subject-based scheduling, department analytics, exam management, and individual teacher dashboards.", features: ["subject allocation", "exam locking", "attendance + analytics", "ai academic assistant"] },
    { type: "University / College", icon: Users, id: "UNIV", desc: "Multi-faculty architecture, lecture scheduling, student enrollment management, and cross-department reporting.", features: ["department schools", "enrollment tracking", "cross-faculty analytics", "permission layers"] },
];

const useCases = [
    { stat: "94%", label: "avg_attendance_improvement", desc: "Schools report significantly higher daily attendance rates after 3 months on LUCY." },
    { stat: "60%", label: "admin_time_saved", desc: "Admin staff spend 60% less time on manual data entry, scheduling, and reporting." },
    { stat: "3x", label: "parent_engagement", desc: "Parent involvement tripled due to real-time notifications and transparent progress tracking." },
    { stat: "99%", label: "teacher_adoption_rate", desc: "Faculty adoption rate within first 4 weeks — attributed to intuitive UI and AI support." },
];

export default function Schools() {
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
                <div className="max-w-6xl mx-auto space-y-16 sm:space-y-32">

                    {/* Hero */}
                    <section className="relative overflow-hidden space-y-6 sm:space-y-10 min-h-[45vh] sm:min-h-[55vh] flex flex-col justify-center">
                        <div className="absolute inset-0 opacity-25 dark:opacity-25 opacity-[0.05]"><SmartWeb nodeCount={22} /></div>
                        <HexGrid />

                        <Reveal className="flex items-center gap-3 sm:gap-4 text-slate-400 dark:text-zinc-500">
                            <School className="w-4 h-4 shrink-0" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] font-bold">institutional_deployment // for_schools</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                for<br /><GlitchText className="text-slate-300 dark:text-zinc-800">schools.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-xl">
                            <p className="text-slate-500 dark:text-zinc-500 text-base sm:text-xl leading-relaxed">
                                lucy_os is purpose-built for every level of academic institution — from a 200-student primary school to a 20,000-student university network.
                            </p>
                        </Reveal>

                        <Reveal delay={0.3} className="flex flex-wrap gap-12 py-6 border-t border-slate-200 dark:border-white/5">
                            {[
                                { label: "schools_live", val: 12 },
                                { label: "students_managed", val: 18000 },
                                { label: "avg_onboarding_days", val: 3 },
                                { label: "supported_roles", val: 5 },
                            ].map((s, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} transition={{ delay: i * 0.1 }} className="space-y-1">
                                    <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest">{s.label}</div>
                                    <div className="text-3xl font-bold"><Counter to={s.val} /></div>
                                </motion.div>
                            ))}
                        </Reveal>
                    </section>

                    {/* School type grid */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">deployment_types // institutional_schools</span>
                        </Reveal>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {schoolTypes.map((s, i) => (
                                <TiltCard key={i}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: false }}
                                        transition={{ delay: i * 0.1 }}
                                        className="h-full p-10 border border-slate-200 dark:border-white/5 bg-white dark:bg-black space-y-8 group cursor-default relative overflow-hidden rounded-xl dark:rounded-none"
                                    >
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.05) 0%, transparent 70%)" }} />
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 30% 20%, rgba(0,0,0,0.02) 0%, transparent 70%)" }} />
                                        
                                        <div className="flex justify-between items-start relative z-10">
                                            <motion.div whileHover={{ rotate: 10, scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
                                                <s.icon className="w-6 h-6 text-slate-400 dark:text-zinc-600 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                                            </motion.div>
                                            <span className="text-[8px] text-slate-400 dark:text-zinc-800">{s.id}</span>
                                        </div>
                                        <div className="space-y-3 relative z-10">
                                            <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">{s.type}</h3>
                                            <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed">{s.desc}</p>
                                        </div>
                                        <div className="space-y-2 relative z-10">
                                            {s.features.map((f, j) => (
                                                <motion.div key={j} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }} transition={{ delay: j * 0.06 }} className="flex gap-3 text-xs text-slate-500 dark:text-zinc-500">
                                                    <CheckCircle className="w-3 h-3 text-slate-900 dark:text-white shrink-0 mt-0.5" />{f}
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>
                    </section>

                    {/* Impact stats */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">impact_metrics // real_results</span>
                        </Reveal>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {useCases.map((u, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} transition={{ delay: i * 0.08 }} whileHover={{ backgroundColor: "var(--hover-bg)" }} style={{ "--hover-bg": "var(--fallback, rgba(0,0,0,0.02))" } as any} className="p-8 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-transparent space-y-3 group cursor-default transition-colors rounded-xl dark:rounded-none">
                                    <div className="text-5xl font-bold text-slate-900 dark:text-white">{u.stat}</div>
                                    <div className="text-[9px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest">{u.label}</div>
                                    <p className="text-slate-600 dark:text-zinc-500 text-xs leading-relaxed">{u.desc}</p>
                                    <div className="h-px bg-slate-200 dark:bg-zinc-900 overflow-hidden">
                                        <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: false }} transition={{ duration: 1.3, delay: i * 0.1 }} className="h-full bg-slate-400 dark:bg-white/10" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* CTA */}
                    <Reveal className="text-center space-y-8 py-12">
                        <h2 className="text-4xl font-bold uppercase tracking-tighter text-slate-900 dark:text-white">ready to provision?</h2>
                        <p className="text-slate-500 dark:text-zinc-500 text-sm max-w-md mx-auto">schedule a demo or start your free institutional pilot. onboarding takes 3 days.</p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <MagneticButton>
                                <Link href="/demo"><Button className="h-14 px-10 bg-slate-900 text-zinc-900 dark:text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-zinc-200 rounded-xl dark:rounded-none text-[11px] uppercase tracking-widest font-bold">view_demo</Button></Link>
                            </MagneticButton>
                            <MagneticButton>
                                <Link href="/register"><Button variant="outline" className="h-14 px-10 rounded-xl dark:rounded-none border-slate-300 dark:border-white/20 text-[11px] uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">get_started</Button></Link>
                            </MagneticButton>
                        </div>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="SCHOOLS_MATRIX" links={[{ href: "/features", label: "specs" }, { href: "/pricing", label: "tiers" }, { href: "/demo", label: "demo" }]} />
        </div>
    );
}
