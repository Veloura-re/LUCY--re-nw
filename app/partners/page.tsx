"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers, Globe, Shield, Cpu } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText, NeuralWeb, MagneticButton, Counter, HexGrid, GlitchOverlay } from "@/components/public/animations";

const partners = [
    { name: "Dept. of Education", region: "Western Cape, ZA", tier: "Government", id: "GOV_01", desc: "Piloting LUCY across 12 government schools in the Western Cape's underserved districts." },
    { name: "Sahara Academy", region: "Dubai, UAE", tier: "Private", id: "PRIV_01", desc: "Integrated LUCY to coordinate a 3,000-student campus with real-time parent involvement." },
    { name: "Nova International", region: "London, UK", tier: "International", id: "INTL_01", desc: "Multi-campus deployment spanning 4 schools with unified director analytics." },
    { name: "TechGrow Foundation", region: "Lagos, NG", tier: "NGO", id: "NGO_01", desc: "Non-profit deploying LUCY in low-bandwidth environments to improve educator tooling." },
    { name: "Atlantic Learning", region: "Miami, USA", tier: "Charter", id: "CHRT_01", desc: "Charter school network using LUCY to manage 8 schools under one institutional umbrella." },
    { name: "Montessori Future", region: "Berlin, DE", tier: "Private", id: "PRIV_02", desc: "Bilingual Montessori environment using AI personas for multilingual instruction support." },
];

const tiers = [
    { name: "Community Node", desc: "Non-profits and government schools operating in underserved areas.", perks: ["80% subsidized tier pricing", "Dedicated implementation support", "Priority onboarding"] },
    { name: "Network Alliance", desc: "Multi-school networks seeking unified institutional intelligence.", perks: ["Cross-school analytics", "Unified director dashboard", "Consolidated billing"] },
    { name: "Innovation Partner", desc: "EdTech companies and research institutions building on LUCY.", perks: ["API access", "Co-development opportunities", "Early feature access"] },
];

export default function Partners() {
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
                <div className="max-w-6xl mx-auto space-y-32">

                    {/* Hero */}
                    <section className="relative overflow-hidden space-y-10 min-h-[55vh] flex flex-col justify-center">
                        <div className="absolute inset-0 opacity-10 dark:opacity-30"><NeuralWeb nodeCount={20} /></div>
                        <HexGrid />

                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <Globe className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">network_alliance // trusted_nodes</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                partner<br /><GlitchText className="text-slate-300 dark:text-zinc-800">network.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-xl">
                            <p className="text-slate-500 dark:text-zinc-500 text-xl leading-relaxed">
                                institutions and organizations trusted with lucy_os. from government pilots to international academies — the network grows.
                            </p>
                        </Reveal>

                        <Reveal delay={0.3} className="flex flex-wrap gap-12 py-6 border-t border-slate-200 dark:border-white/5">
                            {[{ label: "partner_institutions", val: 6 }, { label: "countries_active", val: 5 }, { label: "students_managed", val: 18000 }, { label: "avg_satisfaction", val: 97, suffix: "%" }].map((s, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} transition={{ delay: i * 0.1 }} className="space-y-1">
                                    <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest">{s.label}</div>
                                    <div className="text-3xl font-bold"><Counter to={s.val} suffix={s.suffix ?? ""} /></div>
                                </motion.div>
                            ))}
                        </Reveal>
                    </section>

                    {/* Partner grid */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">active_nodes // partner_registry</span>
                        </Reveal>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-slate-200 dark:bg-white/10 border border-slate-200 dark:border-white/10 overflow-hidden rounded-xl dark:rounded-none">
                            {partners.map((p, i) => (
                                <TiltCard key={i}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 25 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: false }}
                                        transition={{ delay: i * 0.08 }}
                                        className="bg-white dark:bg-black p-10 space-y-6 group cursor-default h-full relative overflow-hidden"
                                    >
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.02) 0%, transparent 70%)" }} />
                                        
                                        <div className="flex items-start justify-between relative z-10">
                                            <div className="px-2 py-1 border border-slate-200 dark:border-white/5 rounded-md dark:rounded-none text-[8px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest">{p.tier}</div>
                                            <motion.span animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.3 }} className="text-[8px] text-slate-400 dark:text-zinc-800">{p.id}</motion.span>
                                        </div>
                                        <div className="space-y-2 relative z-10">
                                            <h3 className="text-xl font-bold uppercase tracking-tight group-hover:text-emerald-600 dark:group-hover:text-white transition-colors text-slate-900 dark:text-white">{p.name}</h3>
                                            <div className="text-[9px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest">{p.region}</div>
                                            <p className="text-slate-600 dark:text-zinc-500 text-xs leading-relaxed">{p.desc}</p>
                                        </div>
                                        <div className="h-px bg-slate-200 dark:bg-zinc-900 overflow-hidden relative z-10">
                                            <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: false }} transition={{ duration: 1.3, delay: i * 0.1 }} className="h-full bg-slate-400 dark:bg-white/10" />
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>
                    </section>

                    {/* Partnership tiers */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">partnership_tiers // how_to_join</span>
                        </Reveal>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {tiers.map((t, i) => (
                                <TiltCard key={i}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: false }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-10 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black space-y-6 h-full cursor-default relative overflow-hidden group rounded-xl dark:rounded-none"
                                    >
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%)" }} />
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 50% 0%, rgba(0,0,0,0.03) 0%, transparent 70%)" }} />
                                        
                                        <h3 className="text-xl font-bold uppercase tracking-tight relative z-10 text-slate-900 dark:text-white">{t.name}</h3>
                                        <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed relative z-10">{t.desc}</p>
                                        <div className="space-y-2 relative z-10">
                                            {t.perks.map((perk, j) => (
                                                <motion.div key={j} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }} transition={{ delay: j * 0.08 }} className="flex gap-3 text-xs text-slate-600 dark:text-zinc-400">
                                                    <span className="text-slate-900 dark:text-white shrink-0">+</span>{perk}
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>
                    </section>

                    {/* CTA */}
                    <Reveal className="p-12 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-transparent rounded-xl dark:rounded-none flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-bold uppercase tracking-tighter text-slate-900 dark:text-white">join the network</h3>
                            <p className="text-slate-500 dark:text-zinc-500 text-sm max-w-sm">interested in a partnership? contact our vanguard team to discuss your institution's needs.</p>
                        </div>
                        <MagneticButton>
                            <Link href="/contact">
                                <Button className="h-14 px-10 bg-slate-900 text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-zinc-200 rounded-xl dark:rounded-none text-[11px] uppercase tracking-widest font-bold">
                                    establish_uplink
                                </Button>
                            </Link>
                        </MagneticButton>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="PARTNER_NETWORK" links={[{ href: "/about", label: "about" }, { href: "/pricing", label: "tiers" }, { href: "/contact", label: "uplink" }]} />
        </div>
    );
}
