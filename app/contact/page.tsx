"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowLeft, Terminal, Send, Mail, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter } from "@/components/public/animations";

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
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono lowercase tracking-tight overflow-x-hidden relative">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-md px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
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
                <div className="max-w-4xl mx-auto space-y-16">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 bg-zinc-950/60 text-[10px] text-zinc-500 uppercase tracking-widest">
                            <Terminal className="w-3.5 h-3.5" /> secure_comms // uplink
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter text-white leading-none">
                            establish <span className="text-zinc-800">uplink.</span>
                        </h1>
                        <p className="text-lg text-zinc-500 max-w-xl mx-auto lowercase leading-relaxed">
                            initiate contact with a vanguard representative to authorize matrix deployment or escalate support queries.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-12"
                    >
                        <div className="space-y-8">
                            <div className="p-8 border border-white/5 bg-zinc-900/5 space-y-6">
                                <h3 className="font-bold text-white uppercase tracking-tight text-lg">transmissions</h3>
                                <p className="text-xs text-zinc-500">standard routing timeframe is t-minus 24 hours.</p>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 text-zinc-400">
                                        <Mail className="w-4 h-4 text-zinc-500" />
                                        <span className="font-mono text-xs">goodluck97248@gmail.com</span>
                                    </div>
                                    <Link href="/security" className="flex items-center gap-4 text-zinc-400 hover:text-white transition-colors">
                                        <ShieldCheck className="w-4 h-4 text-zinc-500" />
                                        <span className="font-mono text-xs underline decoration-zinc-800">secure_vulnerability_portal</span>
                                    </Link>
                                </div>
                            </div>

                            <div className="p-8 border border-white/5 bg-black overflow-hidden relative group">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px]" />
                                <h3 className="relative font-bold text-zinc-300 uppercase tracking-tight text-lg">hq_node_location</h3>
                                <p className="relative text-[10px] text-zinc-600 font-mono uppercase tracking-wider leading-relaxed">
                                    sector 47 // geo-coordinates classified<br />
                                    physical access restricted to level 5 personnel
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <form onSubmit={handleSubmit} className={cn(
                                "p-8 border border-white/10 bg-zinc-950/60 backdrop-blur-sm space-y-6 relative h-fit transition-all rounded-none",
                                status === 'SUCCESS' && "opacity-20 pointer-events-none grayscale"
                            )}>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">callsign // identifier</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.callsign}
                                        onChange={(e) => setFormData({ ...formData, callsign: e.target.value })}
                                        className="w-full bg-zinc-950 border border-white/5 focus:border-white outline-none px-4 py-3 text-xs text-white transition-colors rounded-none placeholder:text-zinc-700"
                                        placeholder="enter_callsign_"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">direct_comm_link // email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-zinc-950 border border-white/5 focus:border-white outline-none px-4 py-3 text-xs text-white transition-colors rounded-none placeholder:text-zinc-700"
                                        placeholder="user@domain.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">payload_content // message</label>
                                    <textarea
                                        rows={4}
                                        required
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full bg-zinc-950 border border-white/5 focus:border-white outline-none px-4 py-3 text-xs text-white transition-colors resize-none rounded-none placeholder:text-zinc-700"
                                        placeholder="initiate handshake sequence_"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={status === 'LOADING' || status === 'SUCCESS'}
                                    className="w-full font-bold tracking-widest text-[10px] uppercase bg-white text-black hover:bg-zinc-200 h-12 rounded-none gap-2"
                                >
                                    {status === 'LOADING' ? (
                                        <>connecting_node... <Loader2 className="w-3.5 h-3.5 animate-spin" /></>
                                    ) : (
                                        <>transmit_payload <Send className="w-3.5 h-3.5" /></>
                                    )}
                                </Button>

                                {status === 'ERROR' && (
                                    <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest text-center">transmission failed. check uplink node.</p>
                                )}
                            </form>

                            <AnimatePresence>
                                {status === 'SUCCESS' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/90 backdrop-blur-sm border border-white/10"
                                    >
                                        <CheckCircle2 className="w-12 h-12 text-white mb-4 animate-pulse" />
                                        <h4 className="text-xl font-bold uppercase text-white mb-2">uplink_established</h4>
                                        <p className="text-zinc-500 text-xs">transmission packet successfully routed through the node matrix.</p>
                                        <Button
                                            variant="outline"
                                            onClick={() => { setStatus('IDLE'); setFormData({ callsign: '', email: '', message: '' }); }}
                                            className="mt-8 border-white/20 text-zinc-400 hover:text-white font-bold uppercase text-[9px] tracking-widest rounded-none"
                                        >
                                            new_transmission
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                    </motion.div>
                </div>
            </main>

            <PageFooter id="UPLINK_PROTOCOL" links={[{ href: "/docs", label: "docs" }, { href: "/support", label: "support" }, { href: "/security", label: "vault" }]} />
        </div>
    );
}
