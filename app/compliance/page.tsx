"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, FileCheck } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText } from "@/components/public/animations";

const frameworks = [
    { id: "FERPA", name: "FERPA", full: "Family Educational Rights & Privacy Act", status: "compliant", coverage: 95, region: "United States", desc: "Student records are accessible only to authorized institutional actors. Parents of minor students retain access rights." },
    { id: "GDPR", name: "GDPR", full: "General Data Protection Regulation", status: "compliant", coverage: 92, region: "European Union", desc: "Right to erasure, data portability, and processing transparency are all honored. DPA contracts in place with all sub-processors." },
    { id: "POPIA", name: "POPIA", full: "Protection of Personal Information Act", status: "compliant", coverage: 98, region: "South Africa", desc: "Primary jurisdiction. All processing activities are aligned with POPIA conditions, including lawful basis and consent frameworks." },
    { id: "HIPAA", name: "HIPAA", full: "Health Insurance Portability & Accountability Act", status: "partial", coverage: 60, region: "United States", desc: "Applicable only where health/disability data is recorded. Relevant encrypted fields and access controls are in place." },
    { id: "SOC2", name: "SOC2", full: "System & Organization Controls 2", status: "in_progress", coverage: 75, region: "Global", desc: "SOC2 Type II audit is scheduled for Q3 2026. Current practices meet Type I requirements across all five trust pillars." },
];

const statusStyle = (status: string) => {
    if (status === "compliant") return "border-emerald-500/20 text-emerald-400";
    if (status === "partial") return "border-yellow-500/20 text-yellow-500";
    return "border-zinc-700 text-zinc-500";
};

const statusBar = (status: string) => {
    if (status === "compliant") return "bg-emerald-400/40";
    if (status === "partial") return "bg-yellow-500/40";
    return "bg-zinc-700/40";
};

export default function Compliance() {
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
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_academia</span>
                    </Link>
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-5xl mx-auto space-y-24">

                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <FileCheck className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">compliance_matrix // regulatory_status</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-none">
                                compliance<br /><GlitchText className="text-zinc-800">matrix.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-xl">
                            <p className="text-zinc-500 text-lg leading-relaxed">
                                our adherence to global regulatory frameworks. fully auditable — we list partial compliance honestly.
                            </p>
                        </Reveal>
                    </section>

                    {/* Summary tally */}
                    <Reveal>
                        <div className="grid grid-cols-3 gap-px bg-white/10 border border-white/10 overflow-hidden">
                            {[
                                { label: "fully_compliant", val: frameworks.filter(f => f.status === "compliant").length.toString() },
                                { label: "partial_compliance", val: frameworks.filter(f => f.status === "partial").length.toString() },
                                { label: "in_progress", val: frameworks.filter(f => f.status === "in_progress").length.toString() },
                            ].map((s, i) => (
                                <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-black p-8 space-y-2">
                                    <div className="text-[9px] text-zinc-700 uppercase tracking-widest">{s.label}</div>
                                    <div className="text-4xl font-bold">{s.val}</div>
                                </motion.div>
                            ))}
                        </div>
                    </Reveal>

                    {/* Framework Cards */}
                    <section className="space-y-4">
                        {frameworks.map((f, i) => (
                            <TiltCard key={i}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08 }}
                                    className="p-8 border border-white/5 bg-black space-y-6 group cursor-default relative overflow-hidden"
                                >
                                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />

                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-4">
                                                <h2 className="text-2xl font-bold uppercase tracking-tight">{f.name}</h2>
                                                <div className={`px-2 py-1 border text-[8px] uppercase tracking-widest ${statusStyle(f.status)}`}>{f.status.replace("_", " ")}</div>
                                            </div>
                                            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{f.full} // {f.region}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl font-bold">{f.coverage}%</span>
                                            <CheckCircle className={`w-5 h-5 ${f.status === "compliant" ? "text-emerald-400" : "text-zinc-700"}`} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="h-1 bg-zinc-900 w-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${f.coverage}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
                                                className={`h-full ${statusBar(f.status)}`}
                                            />
                                        </div>
                                        <p className="text-zinc-500 text-xs leading-relaxed">{f.desc}</p>
                                    </div>
                                </motion.div>
                            </TiltCard>
                        ))}
                    </section>

                    <Reveal>
                        <div className="p-8 border border-white/5 bg-zinc-900/5 space-y-3">
                            <div className="text-[9px] text-zinc-700 uppercase tracking-widest">audit_transparency_note</div>
                            <p className="text-zinc-500 text-xs leading-relaxed">
                                we deliberately list partial and in-progress compliance statuses. we believe institutional transparency builds more trust than overclaiming full compliance across frameworks where our coverage is still maturing.
                            </p>
                        </div>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="COMPLIANCE_MATRIX" links={[{ href: "/privacy", label: "privacy" }, { href: "/terms", label: "terms" }, { href: "/security", label: "vault" }]} />
        </div>
    );
}
