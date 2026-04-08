"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Lock, Eye, Server, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, ParticleField, Reveal, PageFooter, GlitchText } from "@/components/public/animations";

const securityLayers = [
    { id: "SEC_01", name: "AES-256 Encryption", desc: "All data-at-rest is locked under AES-256. Keys are rotated every 90 days and stored in a hardware-isolated vault.", icon: Lock },
    { id: "SEC_02", name: "TLS 1.3 Transit", desc: "Every byte in transit is protected under TLS 1.3. Older cipher suites are blocked at the gateway layer.", icon: Eye },
    { id: "SEC_03", name: "RBAC Enforcement", desc: "Role-Based Access Control is enforced at every API endpoint. A teacher cannot touch a principal's records — period.", icon: Shield },
    { id: "SEC_04", name: "Isolated Vaults", desc: "Each institution's data lives in an isolated schema. Cross-institution queries are architecturally impossible.", icon: Server },
    { id: "SEC_05", name: "MFA Authorization", desc: "Multi-Factor Authentication is mandatory for all administrative and faculty accounts.", icon: Lock },
    { id: "SEC_06", name: "Audit Ledger", desc: "Every data mutation is recorded with timestamp, actor ID, and IP. Logs are append-only and cryptographically signed.", icon: Eye },
];

export default function Security() {
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
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_os</span>
                    </Link>
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-5xl mx-auto space-y-24">

                    {/* Hero */}
                    <section className="space-y-8 relative overflow-hidden">
                        <ParticleField count={30} />
                        <Reveal className="flex items-center gap-4 text-orange-500">
                            <AlertTriangle className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "80px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-orange-500/40" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">vault_protocol // zero_trust_architecture</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                                security<br />
                                <GlitchText className="text-zinc-800">vault.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-2xl">
                            <p className="text-zinc-500 text-xl leading-relaxed">
                                the lucy vault operates on a zero-trust model. every request is authenticated, authorized, and logged — regardless of origin.
                            </p>
                        </Reveal>

                        {/* Threat level bar */}
                        <Reveal delay={0.3} className="p-6 border border-orange-500/10 bg-orange-950/5 flex items-center gap-6">
                            <motion.div animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} className="w-2 h-2 bg-orange-500 rounded-full shrink-0" />
                            <div className="space-y-1 flex-1">
                                <div className="text-[9px] text-orange-500/60 uppercase tracking-widest">threat_monitor // active</div>
                                <div className="h-px bg-zinc-900 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: "3%" }} transition={{ duration: 1.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} className="h-full bg-orange-500/30" />
                                </div>
                            </div>
                            <span className="text-[9px] text-orange-500/40 uppercase tracking-widest shrink-0">threat_level: minimal</span>
                        </Reveal>
                    </section>

                    {/* Security Layers */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <div className="h-px w-12 bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">vault_layers // defense_matrix</span>
                        </Reveal>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-white/10 border border-white/10 overflow-hidden">
                            {securityLayers.map((layer, i) => (
                                <TiltCard key={i}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.07 }}
                                        className="bg-black p-10 space-y-5 group cursor-default h-full relative overflow-hidden"
                                    >
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 20% 20%, rgba(249,115,22,0.05) 0%, transparent 70%)" }} />
                                        <div className="flex items-start justify-between">
                                            <motion.div whileHover={{ rotate: 10, scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
                                                <layer.icon className="w-6 h-6 text-zinc-600 group-hover:text-orange-400/70 transition-colors" />
                                            </motion.div>
                                            <motion.div animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.4 }} className="text-[8px] text-zinc-800 font-bold">{layer.id}</motion.div>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-bold uppercase tracking-tight group-hover:text-white transition-colors">{layer.name}</h3>
                                            <p className="text-zinc-500 text-xs leading-relaxed">{layer.desc}</p>
                                        </div>
                                        <div className="h-px bg-zinc-900 overflow-hidden">
                                            <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }} transition={{ duration: 1.3, delay: i * 0.1 }} className="h-full bg-white/10" />
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>
                    </section>

                    {/* Warning panel */}
                    <Reveal className="p-8 border border-orange-500/20 bg-orange-950/5 space-y-4">
                        <div className="flex items-center gap-3 text-orange-500">
                            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.3 }}>
                                <AlertTriangle className="w-4 h-4" />
                            </motion.div>
                            <span className="text-[9px] uppercase tracking-widest font-bold">system_warning // unauthorized_access_advisory</span>
                        </div>
                        <p className="text-zinc-600 text-xs leading-relaxed uppercase tracking-wide">
                            unauthorized attempts to bypass the vault or decrypt institutional assets will result in permanent node isolation, cryptographic nullification, and legal escalation.
                        </p>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="VAULT_PROTOCOL" links={[{ href: "/compliance", label: "compliance" }, { href: "/privacy", label: "privacy" }, { href: "/contact", label: "uplink" }]} />
        </div>
    );
}
