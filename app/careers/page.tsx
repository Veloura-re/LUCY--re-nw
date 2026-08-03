"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Globe, Zap, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText } from "@/components/public/animations";

const jobs = [
    { id: "J_01", title: "Full-Stack Engineer", dept: "Core Systems", type: "Remote", level: "Senior", tags: ["Next.js", "PostgreSQL", "Prisma"] },
    { id: "J_02", title: "AI/ML Engineer", dept: "Smart Engine", type: "Remote", level: "Senior", tags: ["Python", "OpenAI", "LangChain"] },
    { id: "J_03", title: "Security Engineer", dept: "Vault Protocol", type: "Remote", level: "Mid-Senior", tags: ["Pen Testing", "Auth", "RBAC"] },
    { id: "J_04", title: "Product Designer", dept: "Interface Layer", type: "Remote", level: "Mid", tags: ["Figma", "Motion", "Systems Design"] },
    { id: "J_05", title: "School Success Manager", dept: "Institutional Relations", type: "Hybrid", level: "Mid", tags: ["Education", "Onboarding", "SaaS"] },
];

const values = [
    { icon: Globe, name: "Radical Transparency", desc: "Everything we build is explainable. No black boxes in our infrastructure or our team." },
    { icon: Zap, name: "Low Latency Culture", desc: "We move fast, ship often, and fix bugs before they compound. Zero bureaucratic lag." },
    { icon: Heart, name: "Scholar-First", desc: "Every technical decision traces back to how it impacts a student's education. That's the metric that matters." },
    { icon: Briefcase, name: "Remote-Native", desc: "The team is distributed globally. Great work doesn't require a specific timezone or zip code." },
];

export default function Careers() {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight transition-colors duration-300">
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
                <div className="max-w-5xl mx-auto space-y-16 sm:space-y-24">

                    <section className="space-y-6 sm:space-y-8">
                        <Reveal className="flex items-center gap-3 sm:gap-4 text-slate-400 dark:text-zinc-500">
                            <Briefcase className="w-4 h-4 shrink-0" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] font-bold">talent_acquisition // open_roles</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                join the<br /><GlitchText className="text-slate-300 dark:text-zinc-800">system.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-xl">
                            <p className="text-slate-500 dark:text-zinc-500 text-base sm:text-lg leading-relaxed">
                                we're building the cognitive infrastructure for every school on the planet. if that sounds interesting to you, there's a node for you here.
                            </p>
                        </Reveal>
                    </section>

                    {/* Values */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">operating_values</span>
                        </Reveal>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {values.map((v, i) => (
                                <TiltCard key={i}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.09 }}
                                        className="h-full p-8 border border-slate-200 dark:border-white/5 space-y-5 group cursor-default relative overflow-hidden bg-white dark:bg-black rounded-xl dark:rounded-none"
                                    >
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.02) 0%, transparent 70%)" }} />
                                        <motion.div whileHover={{ rotate: 12, scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }} className="relative z-10">
                                            <v.icon className="w-5 h-5 text-slate-400 dark:text-zinc-600 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                                        </motion.div>
                                        <div className="relative z-10">
                                            <h3 className="font-bold uppercase tracking-tight mb-2 text-slate-900 dark:text-white">{v.name}</h3>
                                            <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed">{v.desc}</p>
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>
                    </section>

                    {/* Job Listings */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">open_roles // {jobs.length}_positions</span>
                        </Reveal>
                        <div className="space-y-px border border-slate-200 dark:border-white/5 overflow-hidden rounded-xl dark:rounded-none">
                            {jobs.map((job, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08 }}
                                    whileHover={{ backgroundColor: "var(--hover-bg)", paddingLeft: "3rem" }}
                                    style={{ "--hover-bg": "var(--fallback, rgba(0,0,0,0.02))" } as any}
                                    className="bg-white dark:bg-black border-b border-slate-200 dark:border-white/5 last:border-b-0 p-6 flex flex-wrap items-center justify-between gap-4 group cursor-pointer transition-all relative"
                                >
                                    <div className="space-y-1 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.3 }} className="w-1.5 h-1.5 bg-slate-900 dark:bg-white rounded-full" />
                                            <h3 className="font-bold text-sm uppercase tracking-tight text-slate-900 dark:text-white">{job.title}</h3>
                                        </div>
                                        <div className="flex gap-3 pl-4 text-[9px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest">
                                            <span>{job.dept}</span>
                                            <span>//</span>
                                            <span>{job.level}</span>
                                            <span>//</span>
                                            <span>{job.type}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 relative z-10">
                                        {job.tags.map((tag, j) => (
                                            <span key={j} className="px-2 py-1 border border-slate-200 dark:border-white/5 rounded-md dark:rounded-none text-[8px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest group-hover:border-slate-400 dark:group-hover:border-white/15 transition-colors">{tag}</span>
                                        ))}
                                        <motion.div whileHover={{ x: 4 }} className="text-[9px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest ml-2 group-hover:text-slate-900 dark:group-hover:text-white transition-colors font-bold">apply →</motion.div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* CTA */}
                    <Reveal>
                        <div className="p-10 border border-slate-200 dark:border-white/10 rounded-xl dark:rounded-none flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-50 dark:bg-transparent">
                            <div className="space-y-2">
                                <div className="text-[9px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest">don&apos;t see your role?</div>
                                <h3 className="text-xl font-bold uppercase tracking-tighter text-slate-900 dark:text-white">Open Application</h3>
                                <p className="text-slate-500 dark:text-zinc-500 text-xs max-w-sm leading-relaxed">send your profile and we'll create a node for the right talent at the right time.</p>
                            </div>
                            <Link href="/contact">
                                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                                    <Button variant="outline" className="rounded-xl dark:rounded-none border-slate-300 dark:border-white/20 h-12 px-8 text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all font-bold text-slate-900 dark:text-white">
                                        open_application
                                    </Button>
                                </motion.div>
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="CAREERS" links={[{ href: "/about", label: "about" }, { href: "/contact", label: "contact" }]} />
        </div>
    );
}
