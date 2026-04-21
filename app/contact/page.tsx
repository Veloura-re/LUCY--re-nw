"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Cpu, ArrowLeft, Terminal, Send, Mail, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ContactPage() {
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [formData, setFormData] = useState({ callsign: '', email: '', message: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('LOADING');
        try {
            const res = await fetch('/api/uplink', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) setStatus('SUCCESS');
            else setStatus('ERROR');
        } catch (err) {
            setStatus('ERROR');
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-emerald-50 selection:bg-emerald-500/30 selection:text-emerald-300 font-space-grotesk overflow-x-hidden relative">
            <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#00ff9d08_1px,transparent_1px),linear-gradient(to_bottom,#00ff9d08_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            <nav className="relative z-50 py-6 border-b border-emerald-900/30 bg-zinc-950/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="relative w-8 h-8 bg-zinc-900 border border-emerald-500/50 rounded-lg flex items-center justify-center">
                            <Cpu className="text-emerald-400 w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold tracking-[0.2em] font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-emerald-500">
                            LUCY
                        </span>
                    </Link>

                    <Link href="/">
                        <Button variant="ghost" className="font-orbitron tracking-widest text-xs uppercase text-zinc-400 hover:text-emerald-300 gap-2">
                            <ArrowLeft className="w-4 h-4" /> Return to Core
                        </Button>
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 pt-24 pb-32 px-6">
                <div className="max-w-4xl mx-auto space-y-16">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-cyan-500/30 bg-cyan-500/5 text-xs font-bold text-cyan-400 uppercase tracking-[0.3em] font-orbitron">
                            <Terminal className="w-4 h-4" /> Secure Comms
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white font-orbitron uppercase">
                            Establish <span className="text-cyan-400">Uplink</span>
                        </h1>
                        <p className="text-xl text-zinc-400 leading-relaxed max-w-2xl mx-auto">
                            Initiate contact with a Vanguard rep to authorize matrix deployment or escalate support queries.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-12"
                    >
                        <div className="space-y-8">
                            <div className="p-8 border border-emerald-900/30 bg-zinc-900/40">
                                <h3 className="font-orbitron font-bold text-white tracking-wide text-lg mb-2">Transmissions</h3>
                                <p className="text-sm text-zinc-500 mb-6">Standard routing timeframe is T-minus 24 hours.</p>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 text-zinc-400">
                                        <Mail className="w-5 h-5 text-emerald-400" />
                                        <span className="font-mono text-sm">goodluck97248@gmail.com</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-zinc-400">
                                        <ShieldCheck className="w-5 h-5 text-cyan-400" />
                                        <span className="font-mono text-sm">security@lucy-os.net</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border border-zinc-800 bg-black/50 overflow-hidden relative group">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,157,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,157,0.02)_1px,transparent_1px)] bg-[size:10px_10px]" />
                                <h3 className="relative font-orbitron font-bold text-zinc-300 tracking-wide text-lg mb-2">HQ Node Location</h3>
                                <p className="relative text-xs text-zinc-600 font-mono">
                                    SECTOR 47 // GEO-COORDINATES CLASSIFIED<br />
                                    PHYSICAL ACCESS RESTRICTED TO LEVEL 5 PERSONNEL
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <form onSubmit={handleSubmit} className={cn(
                                "p-8 border border-emerald-500/30 bg-zinc-900/80 backdrop-blur-md space-y-6 relative h-fit shadow-[0_0_30px_rgba(0,255,157,0.05)] transition-all",
                                status === 'SUCCESS' && "opacity-20 pointer-events-none grayscale"
                            )}>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest font-orbitron">Callsign / Identifier</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.callsign}
                                        onChange={(e) => setFormData({ ...formData, callsign: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 outline-none px-4 py-3 text-sm text-white transition-colors"
                                        placeholder="Enter ID..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest font-orbitron">Direct Comm Link (Email)</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 outline-none px-4 py-3 text-sm text-white transition-colors"
                                        placeholder="user@node.network"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest font-orbitron">Payload Content (Message)</label>
                                    <textarea
                                        rows={4}
                                        required
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 outline-none px-4 py-3 text-sm text-white transition-colors resize-none"
                                        placeholder="Initiate handshake protocol..."
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={status === 'LOADING' || status === 'SUCCESS'}
                                    className="w-full font-orbitron tracking-widest text-xs uppercase bg-emerald-600 hover:bg-emerald-500 text-zinc-950 h-12 rounded-none gap-2"
                                >
                                    {status === 'LOADING' ? (
                                        <>Connecting... <Loader2 className="w-4 h-4 animate-spin" /></>
                                    ) : (
                                        <>Transmit Packet <Send className="w-4 h-4" /></>
                                    )}
                                </Button>

                                {status === 'ERROR' && (
                                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">Transmission Failed. Check Uplink.</p>
                                )}
                            </form>

                            <AnimatePresence>
                                {status === 'SUCCESS' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-900/40 backdrop-blur-sm border border-emerald-500/50"
                                    >
                                        <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4 animate-pulse" />
                                        <h4 className="text-2xl font-black font-orbitron uppercase text-white mb-2">Uplink Established</h4>
                                        <p className="text-zinc-400 text-sm">Transmission packet successfully received via internal matrix.</p>
                                        <Button
                                            variant="outline"
                                            onClick={() => { setStatus('IDLE'); setFormData({ callsign: '', email: '', message: '' }); }}
                                            className="mt-8 border-emerald-500/30 text-emerald-400 font-orbitron uppercase text-xs tracking-widest"
                                        >
                                            New Transmission
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                    </motion.div>
                </div>
            </main>
        </div>
    );
}
