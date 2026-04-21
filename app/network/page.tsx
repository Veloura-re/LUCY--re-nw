"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Globe, ArrowLeft, Server, Activity, Shield, Wifi, Share2, Zap, Database } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface Stats {
    schools: number;
    students: number;
    teachers: number;
    classes: number;
    totalNodes: number;
}

export default function Network() {
    const [stats, setStats] = useState<Stats | null>(null);
    const statsRef = useRef<HTMLDivElement>(null);
    const archRef = useRef<HTMLElement>(null);
    const statsInView = useInView(statsRef, { once: true, margin: "-80px" });
    const archInView = useInView(archRef, { once: true, margin: "-80px" });

    useEffect(() => {
        fetch("/api/public/stats")
            .then(r => r.json())
            .then((d: Stats) => setStats(d))
            .catch(() => { });
    }, []);

    const deploymentLayers = [
        {
            name: "Application Layer",
            desc: "Next.js server-side rendering with edge-optimized routing. Each page request is handled in under 50ms.",
            icon: Globe,
            id: "L_01"
        },
        {
            name: "API Gateway",
            desc: "Stateless REST API with role-based access control enforced at every endpoint. TLS 1.3 in transit.",
            icon: Shield,
            id: "L_02"
        },
        {
            name: "Database Vault",
            desc: "PostgreSQL on isolated compute. AES-256 at rest. Automated backups every 6 hours.",
            icon: Database,
            id: "L_03"
        },
        {
            name: "Email Dispatch Node",
            desc: "Async notification queue for parent alerts, attendance reports, and exam results via Gmail SMTP.",
            icon: Share2,
            id: "L_04"
        }
    ];

    const loaded = stats !== null;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono lowercase tracking-tight">
            <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <motion.div whileHover={{ scale: 1.1 }} className="w-6 h-6 bg-white flex items-center justify-center">
                            <span className="text-black font-black text-xs">L</span>
                        </motion.div>
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_os</span>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group">
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            return_to_main
                        </Button>
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-5xl mx-auto space-y-24">

                    {/* Hero */}
                    <motion.section
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-4 text-emerald-400">
                            <Globe className="w-4 h-4" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">infrastructure_overview // deployment_map</span>
                            <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        </div>
                        <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none">
                            system <br />
                            <motion.span className="text-zinc-800 inline-block" animate={{ x: [0, -2, 2, 0] }} transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 7 }}>
                                network.
                            </motion.span>
                        </h1>
                        <p className="text-zinc-500 text-xl leading-relaxed max-w-2xl">
                            lucy_os runs as a single-tenant institutional platform. each school gets its own isolated data environment. no shared infrastructure between clients.
                        </p>
                    </motion.section>

                    {/* Real Stats from DB */}
                    <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 overflow-hidden">
                        {[
                            { label: "schools_on_network", val: loaded ? stats!.schools.toString() : "…", icon: Globe },
                            { label: "scholar_records", val: loaded ? stats!.students.toLocaleString() : "…", icon: Activity },
                            { label: "faculty_nodes", val: loaded ? stats!.teachers.toLocaleString() : "…", icon: Wifi },
                            { label: "class_instances", val: loaded ? stats!.classes.toLocaleString() : "…", icon: Zap },
                        ].map((m, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: i * 0.1, duration: 0.2 }}
                                whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                                className="bg-black p-8 space-y-4 group cursor-default transition-colors"
                            >
                                <motion.div whileHover={{ rotate: 8 }} transition={{ type: "spring", stiffness: 400 }}>
                                    <m.icon className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                                </motion.div>
                                <div className="space-y-1">
                                    <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{m.label}</div>
                                    <motion.div
                                        key={m.val}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-3xl font-bold uppercase tracking-tighter"
                                    >
                                        {m.val}
                                        {loaded && <span className="text-zinc-700 text-sm ml-1">live</span>}
                                    </motion.div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Honest note about single-tenant */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="p-6 border border-white/5 bg-zinc-900/10 flex items-start gap-4"
                    >
                        <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" />
                        <p className="text-zinc-500 text-xs leading-relaxed">
                            <span className="text-white font-bold uppercase tracking-widest text-[9px]">note // </span>
                            lucy_os is a single-instance deployment per institution. stats above reflect live counts directly from the active database. there are no exaggerated global node claims — what you see is what is actually running.
                        </p>
                    </motion.div>

                    {/* Deployment Stack */}
                    <section className="space-y-12">
                        <div className="flex items-center gap-4 text-zinc-500">
                            <div className="h-px w-12 bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">deployment_stack // layer_model</span>
                        </div>

                        <div className="space-y-px border border-white/5 overflow-hidden">
                            {deploymentLayers.map((layer, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08, duration: 0.2 }}
                                    whileHover={{ backgroundColor: "rgba(255,255,255,0.02)", paddingLeft: "3rem" }}
                                    className="bg-black p-8 flex items-start gap-8 border-b border-white/5 last:border-b-0 group transition-all cursor-default"
                                >
                                    <div className="flex flex-col items-center gap-2 shrink-0">
                                        <motion.div whileHover={{ rotate: 10 }} transition={{ type: "spring", stiffness: 400 }}>
                                            <layer.icon className="w-6 h-6 text-zinc-600 group-hover:text-white transition-colors" />
                                        </motion.div>
                                        <span className="text-[8px] text-zinc-800 uppercase tracking-widest">{layer.id}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold uppercase tracking-tight">{layer.name}</h3>
                                        <p className="text-zinc-500 text-sm leading-relaxed">{layer.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* Architecture Visual */}
                    <motion.section
                        ref={archRef}
                        initial={{ opacity: 0, y: 30 }}
                        animate={archInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.4 }}
                        className="p-12 border border-white/10 bg-zinc-900/5 backdrop-blur-sm space-y-12 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Server className="w-32 h-32 text-white" />
                        </div>
                        <div className="space-y-6 relative z-10">
                            <h2 className="text-3xl font-bold uppercase tracking-tighter">Isolated Tenant Model</h2>
                            <p className="text-zinc-500 leading-relaxed text-sm max-w-xl">
                                every school is a completely isolated tenant. student records, grades, attendance, and communications are stored in schemas that are cryptographically separated. a teacher at school A cannot — even in theory — access records at school B.
                            </p>
                        </div>

                        {/* Node flow diagram */}
                        <div className="relative h-16 flex items-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full h-px bg-zinc-900" />
                            </div>
                            <div className="relative flex justify-between w-full">
                                {["browser", "api_gateway", "rbac_check", "db_vault", "response"].map((node, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2">
                                        <motion.div
                                            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                                            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.5 }}
                                            className="w-3 h-3 bg-black border border-white/20"
                                        />
                                        <span className="text-[8px] text-zinc-700 uppercase tracking-widest whitespace-nowrap">{node}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.section>

                    {/* On-premise option CTA */}
                    <div className="p-10 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-2">
                            <div className="text-[9px] text-zinc-600 uppercase tracking-widest">deployment_option</div>
                            <h3 className="text-xl font-bold uppercase tracking-tighter">Want on-premise hosting?</h3>
                            <p className="text-zinc-500 text-xs leading-relaxed max-w-sm">
                                we support air-gapped, on-premise deployments for institutions with strict data sovereignty requirements.
                            </p>
                        </div>
                        <Link href="/contact">
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button variant="outline" className="rounded-none border-white/20 hover:bg-white hover:text-black text-[10px] uppercase tracking-widest font-bold h-12 px-8 transition-all">
                                    request_uplink
                                </Button>
                            </motion.div>
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="border-t border-white/5 py-12 px-6 text-[10px] uppercase tracking-[0.2em] text-zinc-700">
                <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <p>© 2026 LUCY_SYS // NETWORK_OVERVIEW // LIVE_DATA</p>
                    <div className="flex items-center gap-8">
                        <Link href="/intelligence" className="hover:text-white transition-colors">intelligence</Link>
                        <Link href="/docs" className="hover:text-white transition-colors">docs</Link>
                        <Link href="/security" className="hover:text-white transition-colors">security</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
