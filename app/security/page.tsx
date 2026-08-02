"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Lock, Eye, Server, AlertTriangle, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, ParticleField, Reveal, PageFooter, GlitchText } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";
import { useState, useEffect } from "react";

const securityLayers = [
    { id: "SEC_01", name: "AES-256 Encryption", desc: "All data-at-rest is locked under AES-256. Keys are rotated every 90 days and stored in a hardware-isolated vault.", icon: Lock },
    { id: "SEC_02", name: "TLS 1.3 Transit", desc: "Every byte in transit is protected under TLS 1.3. Older cipher suites are blocked at the gateway layer.", icon: Eye },
    { id: "SEC_03", name: "RBAC Enforcement", desc: "Role-Based Access Control is enforced at every API endpoint. A teacher cannot touch a principal's records — period.", icon: Shield },
    { id: "SEC_04", name: "Isolated Vaults", desc: "Each institution's data lives in an isolated schema. Cross-institution queries are architecturally impossible.", icon: Server },
    { id: "SEC_05", name: "MFA Authorization", desc: "Multi-Factor Authentication is mandatory for all administrative and faculty accounts.", icon: Lock },
    { id: "SEC_06", name: "Audit Ledger", desc: "Every data mutation is recorded with timestamp, actor ID, and IP. Logs are append-only and cryptographically signed.", icon: Eye },
];

export default function Security() {
    const [email, setEmail] = useState("");
    const [vulnerabilityType, setVulnerabilityType] = useState("RCE");
    const [severity, setSeverity] = useState("LOW");
    const [description, setDescription] = useState("");
    
    const [status, setStatus] = useState<'IDLE' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [txLogs, setTxLogs] = useState<string[]>([]);
    const [resultHash, setResultHash] = useState("");
    const [resultTime, setResultTime] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('SUBMITTING');
        setTxLogs([]);

        // Terminal animation steps
        const logs = [
            "initializing secure connection...",
            "establishing peer-to-peer encryption tunnel (TLS 1.3)...",
            "sealing disclosure payload with ephemeral AES-256 keys...",
            "transmitting chunk package to vault host...",
            "verifying message package integrity check...",
            "establishing secure database write..."
        ];

        for (let i = 0; i < logs.length; i++) {
            await new Promise(r => setTimeout(r, 600));
            setTxLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logs[i]}`]);
        }

        try {
            const res = await fetch('/api/public/security-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, vulnerabilityType, severity, description })
            });

            const data = (await res.json()) as any;
            if (res.ok) {
                setTxLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] message verified. reference: ${data.hash.substring(0, 16)}...`]);
                await new Promise(r => setTimeout(r, 800));
                setResultHash(data.hash);
                setResultTime(new Date(data.timestamp).toLocaleString());
                setStatus('SUCCESS');
            } else {
                setErrorMsg(data.error || "Connection validation rejected the request.");
                setStatus('ERROR');
            }
        } catch (err) {
            setErrorMsg("Network timeout. Secure socket connection terminated.");
            setStatus('ERROR');
        }
    };

    const resetForm = () => {
        setEmail("");
        setVulnerabilityType("RCE");
        setSeverity("LOW");
        setDescription("");
        setStatus('IDLE');
        setTxLogs([]);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-orange-500 selection:text-zinc-900 dark:text-white font-mono lowercase tracking-tight transition-colors duration-300">
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

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-5xl mx-auto space-y-24">

                    {/* Hero */}
                    <section className="space-y-8 relative overflow-hidden">
                        <ParticleField count={30} />
                        <Reveal className="flex items-center gap-4 text-orange-500">
                            <AlertTriangle className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "80px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-orange-500/40" />
                            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">security_standards // zero_trust_architecture</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
                                security<br />
                                <GlitchText className="text-slate-400 dark:text-zinc-800">vault.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-2xl">
                            <p className="text-slate-500 dark:text-zinc-500 text-xl leading-relaxed">
                                the lucy vault operates on a zero-trust model. every request is authenticated, authorized, and logged — regardless of origin.
                            </p>
                        </Reveal>

                        {/* Threat level bar */}
                        <Reveal delay={0.3} className="p-6 border border-orange-200 dark:border-orange-500/10 bg-orange-50 dark:bg-orange-950/5 flex items-center gap-6 rounded-xl dark:rounded-none">
                            <motion.div animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} className="w-2 h-2 bg-orange-500 rounded-full shrink-0" />
                            <div className="space-y-1 flex-1">
                                <div className="text-[9px] text-orange-600 dark:text-orange-500/60 uppercase tracking-widest">threat_monitor // active</div>
                                <div className="h-px bg-orange-200 dark:bg-zinc-900 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: "3%" }} transition={{ duration: 1.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} className="h-full bg-orange-500" />
                                </div>
                            </div>
                            <span className="text-[9px] text-orange-600 dark:text-orange-500/40 uppercase tracking-widest shrink-0">threat_level: minimal</span>
                        </Reveal>
                    </section>

                    {/* Security Layers */}
                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">security_layers // defense_systems</span>
                        </Reveal>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-slate-200 dark:bg-white/10 border border-slate-200 dark:border-white/10 overflow-hidden rounded-xl dark:rounded-none">
                            {securityLayers.map((layer, i) => (
                                <TiltCard key={i}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.07 }}
                                        className="bg-white dark:bg-black p-10 space-y-5 group cursor-default h-full relative overflow-hidden"
                                    >
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 20% 20%, rgba(249,115,22,0.05) 0%, transparent 70%)" }} />
                                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 20% 20%, rgba(249,115,22,0.03) 0%, transparent 70%)" }} />
                                        
                                        <div className="flex items-start justify-between relative z-10">
                                            <motion.div whileHover={{ rotate: 10, scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
                                                <layer.icon className="w-6 h-6 text-slate-400 dark:text-zinc-600 group-hover:text-orange-500 dark:group-hover:text-orange-400/70 transition-colors" />
                                            </motion.div>
                                            <motion.div animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.4 }} className="text-[8px] text-slate-300 dark:text-zinc-800 font-bold">{layer.id}</motion.div>
                                        </div>
                                        <div className="space-y-2 relative z-10">
                                            <h3 className="text-lg font-bold uppercase tracking-tight group-hover:text-orange-600 dark:group-hover:text-white transition-colors text-slate-900 dark:text-white">{layer.name}</h3>
                                            <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed">{layer.desc}</p>
                                        </div>
                                        <div className="h-px bg-slate-200 dark:bg-zinc-900 overflow-hidden relative z-10">
                                            <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }} transition={{ duration: 1.3, delay: i * 0.1 }} className="h-full bg-slate-400 dark:bg-white/10" />
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>
                    </section>

                    {/* Vulnerability Disclosure Contact Form */}
                    <section className="space-y-6">
                        <Reveal className="flex items-center gap-4 text-slate-400 dark:text-zinc-500">
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-800" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">vulnerability_disclosure // pgp_contact</span>
                        </Reveal>

                        <AnimatePresence mode="wait">
                            {status === 'SUCCESS' ? (
                                <motion.div
                                    key="success-card"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-8 border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/5 space-y-6 rounded-xl dark:rounded-none relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 text-emerald-500/10">
                                        <Shield className="w-24 h-24 stroke-[1]" />
                                    </div>
                                    <div className="space-y-2 relative z-10">
                                        <div className="text-[10px] text-emerald-600 dark:text-emerald-500 uppercase tracking-widest font-bold">message_secured // response_active</div>
                                        <h3 className="font-bold text-emerald-900 dark:text-white uppercase tracking-tight text-xl">Vulnerability Disclosure Logged</h3>
                                        <p className="text-emerald-700 dark:text-zinc-400 text-xs leading-relaxed max-w-2xl">
                                            your message has been sealed and cataloged. our security operations center (soc) response team will evaluate the payload within 24 hours. thank you for protecting the lucy network.
                                        </p>
                                    </div>
                                    <div className="p-6 bg-white/80 dark:bg-zinc-950/80 border border-emerald-100 dark:border-zinc-900 font-mono text-xs space-y-3 rounded-xl max-w-2xl relative z-10">
                                        <div className="flex justify-between border-b border-emerald-100 dark:border-zinc-900 pb-2 text-emerald-600 dark:text-zinc-500 text-[10px]">
                                            <span>METADATA</span>
                                            <span>VALUES</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-emerald-600 dark:text-zinc-500">message_hash:</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold select-all break-all ml-4 text-right">{resultHash}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-emerald-600 dark:text-zinc-500">timestamp:</span>
                                            <span className="text-emerald-800 dark:text-zinc-300 ml-4 text-right">{resultTime}</span>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={resetForm}
                                        className="bg-emerald-900 hover:bg-emerald-800 text-zinc-900 dark:text-white dark:bg-zinc-900 dark:hover:bg-zinc-800 font-black uppercase text-[10px] tracking-widest border border-emerald-800 dark:border-zinc-800 rounded-xl px-6 h-11 relative z-10"
                                    >
                                        Transmit New Report
                                    </Button>
                                </motion.div>
                            ) : status === 'SUBMITTING' ? (
                                <motion.div
                                    key="submitting-card"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="p-8 border border-orange-200 dark:border-orange-500/20 bg-orange-50/50 dark:bg-zinc-950/40 backdrop-blur-sm space-y-6 rounded-xl dark:rounded-none"
                                >
                                    <div className="flex items-center justify-between text-orange-500">
                                        <div className="flex items-center gap-3">
                                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full" />
                                            <span className="text-[10px] uppercase tracking-widest font-bold">transmitting_payload...</span>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-white dark:bg-black border border-orange-100 dark:border-zinc-900 rounded-xl font-mono text-[10px] text-slate-600 dark:text-zinc-400 space-y-2 h-[180px] overflow-y-auto scrollbar-hide shadow-inner">
                                        {txLogs.map((log, index) => (
                                            <motion.div 
                                                key={index}
                                                initial={{ opacity: 0, x: -5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex gap-2"
                                            >
                                                <span className="text-orange-500">&gt;</span>
                                                <span>{log}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : (
                                <Reveal delay={0.1} key="idle-card">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Left advisory card */}
                                        <div className="p-8 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-900/5 space-y-4 lg:col-span-1 rounded-xl dark:rounded-none">
                                            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-lg">responsible_disclosure</h3>
                                            <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed">
                                                if you believe you have discovered a vulnerability or data leakage event within the lucy ecosystem, please transmit a detailed report immediately.
                                            </p>
                                            <p className="text-slate-600 dark:text-zinc-600 text-[10px] leading-relaxed uppercase tracking-wider font-semibold">
                                                do not disclose vulnerabilities publicly before synchronization. all reports are reviewed and referenced.
                                            </p>
                                        </div>

                                        {/* Form Card */}
                                        <form onSubmit={handleFormSubmit} className="p-8 border border-slate-200 dark:border-white/10 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/60 backdrop-blur-sm space-y-6 lg:col-span-2 rounded-xl dark:rounded-none relative shadow-sm dark:shadow-none">
                                            {status === 'ERROR' && (
                                                <div className="p-4 border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-500 text-xs font-bold rounded-xl flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                                    <span>{errorMsg}</span>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-500 font-bold">researcher_email</label>
                                                    <input 
                                                        type="email"
                                                        required
                                                        value={email}
                                                        onChange={e => setEmail(e.target.value)}
                                                        placeholder="your_email@domain.com"
                                                        className="w-full h-11 px-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs font-mono rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-500 font-bold">severity_classification</label>
                                                    <select 
                                                        value={severity}
                                                        onChange={e => setSeverity(e.target.value)}
                                                        className="w-full h-11 px-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs font-mono rounded-xl focus:border-orange-500 focus:outline-none transition-colors cursor-pointer"
                                                    >
                                                        <option value="LOW">LOW</option>
                                                        <option value="MEDIUM">MEDIUM</option>
                                                        <option value="HIGH">HIGH</option>
                                                        <option value="CRITICAL">CRITICAL</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2 md:col-span-2">
                                                    <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-500 font-bold">vulnerability_category</label>
                                                    <select 
                                                        value={vulnerabilityType}
                                                        onChange={e => setVulnerabilityType(e.target.value)}
                                                        className="w-full h-11 px-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs font-mono rounded-xl focus:border-orange-500 focus:outline-none transition-colors cursor-pointer"
                                                    >
                                                        <option value="RCE">RCE (Remote Code Execution)</option>
                                                        <option value="AUTH_BYPASS">Authentication Bypass</option>
                                                        <option value="SQL_INJECTION">SQL Injection</option>
                                                        <option value="DATA_LEAK">Sensitive Data Leakage</option>
                                                        <option value="XSS_CSRF">XSS / CSRF</option>
                                                        <option value="OTHER">Other Vulnerability</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-500 font-bold">technical_description_and_poc</label>
                                                <textarea 
                                                    required
                                                    rows={5}
                                                    value={description}
                                                    onChange={e => setDescription(e.target.value)}
                                                    placeholder="provide clear replication steps, impact details, and proof of concept code..."
                                                    className="w-full p-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs font-mono rounded-xl focus:border-orange-500 focus:outline-none transition-colors resize-none"
                                                />
                                            </div>

                                            <Button 
                                                type="submit"
                                                className="bg-orange-500 hover:bg-orange-600 text-zinc-900 dark:text-white font-black uppercase text-[10px] tracking-widest rounded-xl px-8 h-12 w-full sm:w-auto"
                                            >
                                                Transmit Disclosure Payload
                                            </Button>
                                        </form>
                                    </div>
                                </Reveal>
                            )}
                        </AnimatePresence>
                    </section>

                    {/* Warning panel */}
                    <Reveal className="p-8 border border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-950/5 space-y-4 rounded-xl dark:rounded-none">
                        <div className="flex items-center gap-3 text-orange-600 dark:text-orange-500">
                            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.3 }}>
                                <AlertTriangle className="w-4 h-4" />
                            </motion.div>
                            <span className="text-[9px] uppercase tracking-widest font-bold">system_warning // unauthorized_access_advisory</span>
                        </div>
                        <p className="text-orange-900 dark:text-zinc-600 text-xs leading-relaxed uppercase tracking-wide font-medium">
                            unauthorized attempts to bypass security controls or decrypt institutional assets will result in permanent account termination and legal escalation.
                        </p>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="VAULT_PROTOCOL" links={[{ href: "/compliance", label: "compliance" }, { href: "/privacy", label: "privacy" }, { href: "/contact", label: "contact" }]} />
        </div>
    );
}
