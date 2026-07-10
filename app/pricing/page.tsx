"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, MatrixRain, Typewriter } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";

const terminalLines = [
    "> pricing_engine: operational",
    "> tier_config: ACTIVE",
    "> rate_cards: COMPILED_AND_VERIFIED",
    "> sla_matrix: DEPLOYED",
    "> billing_currency: USD",
    "> status: SECURE_UPLINK_ESTABLISHED_",
];

export default function Pricing() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono lowercase tracking-tight">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-md px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_academia</span>
                    </Link>
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-24">
                <div className="max-w-5xl w-full space-y-16 text-center">

                    {/* Animated terminal */}
                    <div className="relative overflow-hidden border border-white/5 bg-zinc-950/80 p-8 text-left max-w-2xl mx-auto">
                        <div className="absolute inset-0 opacity-20"><MatrixRain cols={10} /></div>
                        <div className="relative z-10 font-mono">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-2 h-2 bg-white/30 rounded-full" />
                                <div className="w-2 h-2 bg-white/15 rounded-full" />
                                <div className="w-2 h-2 bg-white/5 rounded-full" />
                                <span className="text-[8px] text-zinc-500 uppercase tracking-widest ml-2">pricing_engine_v3.0 // operational</span>
                            </div>
                            <Typewriter lines={terminalLines} className="space-y-1.5" />
                        </div>
                    </div>

                    {/* Headline */}
                    <div className="space-y-6">
                        <Reveal>
                            <div className="flex items-center justify-center gap-3 text-zinc-400">
                                <Clock className="w-4 h-4 text-white/40" />
                                <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                                <span className="text-[10px] uppercase tracking-[0.4em] text-white">active_tariffs // pricing_matrix</span>
                                <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                                <Clock className="w-4 h-4 text-white/40" />
                            </div>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-7xl font-bold uppercase tracking-tighter leading-none">
                                pricing<br /><span className="text-zinc-600">plans.</span>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-zinc-400 text-sm leading-relaxed max-w-lg mx-auto">
                                select a node tier to provision your school instance. all plans begin with a 120-day trial evaluation period.
                            </p>
                        </Reveal>
                    </div>

                    {/* Pricing Tiers Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        {[
                            {
                                tier: "Pilot Node",
                                price: "Free",
                                period: "up to 3 months",
                                desc: "Full access for a single institution during evaluation period. No credit card required.",
                                features: ["1 institution", "up to 500 students", "all core features", "email support"],
                                highlight: false,
                                href: "/register/admin?plan=pilot",
                                buttonText: "price"
                            },
                            {
                                tier: "Core Matrix",
                                price: "$149",
                                originalPrice: "$250",
                                period: "/ month",
                                desc: "Production-grade deployment for full-scale institutional management and AI assistance.",
                                features: ["unlimited students", "all roles + AI helper", "parent portal", "priority support", "99.9% uptime SLA"],
                                highlight: true,
                                href: "/register/admin?plan=core",
                                buttonText: "price"
                            },
                            {
                                tier: "Enterprise",
                                price: "Custom",
                                period: "per institution",
                                desc: "Multi-school networks, custom integrations, on-premise deployment, and dedicated manager.",
                                features: ["unlimited schools", "custom integrations", "on-premise option", "dedicated support manager", "99.99% SLA"],
                                highlight: false,
                                href: "/contact",
                                buttonText: "price"
                            }
                        ].map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: false }}
                                transition={{ delay: i * 0.1 }}
                                className={`relative border p-8 space-y-6 overflow-hidden transition-all duration-300 ${t.highlight ? "border-white/30 bg-zinc-950/80 shadow-lg shadow-white/[0.02]" : "border-white/10 bg-zinc-950/30 hover:border-white/20"}`}
                            >
                                {t.highlight && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />}
                                
                                {/* Glowing radial pulse behind Core Matrix card */}
                                {t.tier === "Core Matrix" && (
                                    <motion.div 
                                        animate={{ opacity: [0.1, 0.3, 0.1] }} 
                                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} 
                                        className="absolute inset-0 pointer-events-none" 
                                        style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)" }} 
                                    />
                                )}

                                {/* Pulsing discount burst badge */}
                                {t.tier === "Core Matrix" && (
                                    <motion.div 
                                        animate={{ 
                                            scale: [1, 1.08, 1],
                                            boxShadow: ["0 0 0px rgba(255,255,255,0)", "0 0 12px rgba(255,255,255,0.25)", "0 0 0px rgba(255,255,255,0)"]
                                        }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                        className="absolute top-4 right-4 bg-white text-black px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest z-10"
                                    >
                                        40%_discount
                                    </motion.div>
                                )}
                                
                                <div className="space-y-1">
                                    <span className="text-[8px] uppercase tracking-widest text-zinc-500">{t.highlight ? "recommended" : `tier_0${i + 1}`}</span>
                                    <h3 className="text-xl font-bold uppercase tracking-tight text-white font-orbitron">{t.tier}</h3>
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-white font-orbitron">{t.price}</span>
                                    {t.originalPrice && (
                                        <span className="text-sm line-through text-zinc-500 font-medium">{t.originalPrice}</span>
                                    )}
                                    <span className="text-zinc-500 text-xs">{t.period}</span>
                                </div>

                                <p className="text-zinc-400 text-xs leading-relaxed h-12">{t.desc}</p>

                                <div className="w-full h-px bg-white/10" />

                                <ul className="space-y-2.5 text-xs text-zinc-300">
                                    {t.features.map((feat, j) => (
                                        <li key={j} className="flex gap-2.5 items-start">
                                            <span className="text-zinc-400 font-bold shrink-0">+</span>
                                            <span>{feat}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="pt-4">
                                    <Link href={t.href} className="w-full">
                                        <div className={`w-full h-11 border flex items-center justify-center text-[9px] uppercase tracking-[0.25em] font-bold transition-all duration-300 ${t.highlight ? "bg-white text-black border-white hover:bg-zinc-200" : "border-white/20 text-zinc-300 bg-white/5 hover:bg-white hover:text-black"}`}>
                                            {t.buttonText}
                                        </div>
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <PageFooter id="PRICING_ACTIVE" links={[{ href: "/features", label: "features" }, { href: "/demo", label: "demo" }, { href: "/contact", label: "uplink" }]} />
        </div>
    );
}
