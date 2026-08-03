"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, SystemRain, Typewriter } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const terminalLines = [
    "> pricing_engine: operational",
    "> tier_config: ACTIVE",
    "> rate_cards: COMPILED_AND_VERIFIED",
    "> sla_system: DEPLOYED",
    "> billing_currency: USD",
    "> status: SECURE_CONNECTION_READY",
];

export default function Pricing() {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

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

            <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-24">
                <div className="max-w-5xl w-full space-y-16 text-center">

                    {/* Animated terminal */}
                    <div className="relative overflow-hidden border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950/80 p-8 text-left max-w-2xl mx-auto rounded-xl dark:rounded-none">
                        <div className="absolute inset-0 opacity-10 dark:opacity-20"><SystemRain cols={10} /></div>
                        <div className="relative z-10 font-mono">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-2 h-2 bg-slate-300 dark:bg-white/30 rounded-full" />
                                <div className="w-2 h-2 bg-slate-200 dark:bg-white/15 rounded-full" />
                                <div className="w-2 h-2 bg-slate-100 dark:bg-white/5 rounded-full" />
                                <span className="text-[8px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-2">pricing_engine_v3.0 // operational</span>
                            </div>
                            <Typewriter lines={terminalLines} className="space-y-1.5 text-slate-600 dark:text-white" />
                        </div>
                    </div>

                    {/* Headline */}
                    <div className="space-y-6">
                        <Reveal>
                            <div className="flex items-center justify-center gap-3 text-slate-400 dark:text-zinc-400">
                                <Clock className="w-4 h-4 text-slate-300 dark:text-white/40" />
                                <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                                <span className="text-[10px] uppercase tracking-[0.4em] text-slate-500 dark:text-white">active_tariffs // pricing_system</span>
                                <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                                <Clock className="w-4 h-4 text-slate-300 dark:text-white/40" />
                            </div>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-6xl md:text-7xl font-bold uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
                                pricing<br /><span className="text-slate-400 dark:text-zinc-600">plans.</span>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed max-w-lg mx-auto">
                                select a plan that fits your school. all plans include a 120-day trial evaluation period.
                            </p>
                        </Reveal>
                    </div>

                    {/* Pricing Tiers Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        {[
                            {
                                tier: "Pilot Plan",
                                price: "Free",
                                period: "up to 3 months",
                                desc: "Full access for a single institution during evaluation period. No credit card required.",
                                features: ["1 institution", "up to 500 students", "all core features", "email support"],
                                highlight: false,
                                href: "/register/admin?plan=pilot",
                                buttonText: "Start Free Trial"
                            },
                            {
                                tier: "Core Plan",
                                price: "$149",
                                originalPrice: "$250",
                                period: "/ month",
                                desc: "Production-grade deployment for full-scale institutional management and AI assistance.",
                                features: ["unlimited students", "all roles + AI helper", "parent portal", "priority support", "99.9% uptime SLA"],
                                highlight: true,
                                href: "/register/admin?plan=core",
                                buttonText: "Start 120-Day Trial"
                            },
                            {
                                tier: "Enterprise",
                                price: "Custom",
                                period: "per institution",
                                desc: "Multi-school networks, custom integrations, on-premise deployment, and dedicated manager.",
                                features: ["unlimited schools", "custom integrations", "on-premise option", "dedicated support manager", "99.99% SLA"],
                                highlight: false,
                                href: "/contact",
                                buttonText: "Contact Sales"
                            }
                        ].map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: false }}
                                transition={{ delay: i * 0.1 }}
                                className={`relative border p-8 space-y-6 overflow-hidden transition-all duration-300 rounded-xl dark:rounded-none ${t.highlight ? "border-slate-300 dark:border-white/30 bg-slate-50 dark:bg-zinc-950/80 shadow-lg shadow-slate-200 dark:shadow-white/[0.02]" : "border-slate-200 dark:border-white/10 bg-white/30 dark:bg-zinc-950/30 hover:border-slate-300 dark:hover:border-white/20"}`}
                            >
                                {t.highlight && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-400 dark:via-white/30 to-transparent" />}
                                
                                {/* Glowing radial pulse behind Core Plan card */}
                                {t.tier === "Core Plan" && (
                                    <>
                                        <motion.div 
                                            animate={{ opacity: [0.1, 0.3, 0.1] }} 
                                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} 
                                            className="absolute inset-0 pointer-events-none hidden dark:block" 
                                            style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)" }} 
                                        />
                                        <motion.div 
                                            animate={{ opacity: [0.1, 0.2, 0.1] }} 
                                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} 
                                            className="absolute inset-0 pointer-events-none dark:hidden" 
                                            style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.03) 0%, transparent 60%)" }} 
                                        />
                                    </>
                                )}

                                {/* Pulsing discount burst badge */}
                                {t.tier === "Core Plan" && (
                                    <motion.div 
                                        animate={{ 
                                            scale: [1, 1.08, 1],
                                            boxShadow: ["0 0 0px rgba(0,0,0,0)", "0 0 12px rgba(0,0,0,0.1)", "0 0 0px rgba(0,0,0,0)"]
                                        }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                        className="absolute top-4 right-4 bg-slate-900 text-white dark:bg-white dark:text-black px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest z-10 rounded-md dark:rounded-none"
                                    >
                                        40%_discount
                                    </motion.div>
                                )}
                                
                                <div className="space-y-1 relative z-10">
                                    <span className="text-[8px] uppercase tracking-widest text-slate-500 dark:text-zinc-500">{t.highlight ? "recommended" : `tier_0${i + 1}`}</span>
                                    <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-white font-orbitron">{t.tier}</h3>
                                </div>

                                <div className="flex items-baseline gap-2 relative z-10">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white font-orbitron">{t.price}</span>
                                    {t.originalPrice && (
                                        <span className="text-sm line-through text-slate-400 dark:text-zinc-500 font-medium">{t.originalPrice}</span>
                                    )}
                                    <span className="text-slate-500 dark:text-zinc-500 text-xs">{t.period}</span>
                                </div>

                                <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed h-12 relative z-10">{t.desc}</p>

                                <div className="w-full h-px bg-slate-200 dark:bg-white/10 relative z-10" />

                                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-zinc-300 relative z-10">
                                    {t.features.map((feat, j) => (
                                        <li key={j} className="flex gap-2.5 items-start">
                                            <span className="text-slate-900 dark:text-zinc-400 font-bold shrink-0">+</span>
                                            <span>{feat}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="pt-4 relative z-10">
                                    <Link href={t.href} className="w-full">
                                        <div className={`w-full h-11 border flex items-center justify-center text-[10px] uppercase tracking-[0.2em] font-semibold transition-all duration-300 rounded-lg shadow-sm ${t.highlight ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 dark:bg-white dark:text-black dark:border-white dark:hover:bg-zinc-200" : "border-slate-300 text-slate-900 bg-white hover:bg-slate-900 hover:text-white dark:border-zinc-700 dark:text-white dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:border-zinc-500"}`}>
                                            {t.buttonText}
                                        </div>
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <PageFooter id="PRICING_ACTIVE" links={[{ href: "/features", label: "features" }, { href: "/demo", label: "demo" }, { href: "/contact", label: "contact" }]} />
        </div>
    );
}
