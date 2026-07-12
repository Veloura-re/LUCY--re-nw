"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ArrowLeft, Terminal, Send, Mail, ShieldCheck, Loader2, CheckCircle2, ChevronRight, Server, CreditCard, LifeBuoy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { ScanLines, CustomCursor, AnimatedGrid, PageFooter, GlitchText } from "@/components/public/animations";

type Category = 'support' | 'sales' | 'billing' | 'security' | null;

export default function ContactPage() {
    const [step, setStep] = useState<number>(1);
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [category, setCategory] = useState<Category>(null);
    const [formData, setFormData] = useState({ callsign: '', email: '', message: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('LOADING');
        try {
            const res = await fetch('/api/uplink', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, category })
            });
            if (res.ok) {
                setStatus('SUCCESS');
                setStep(4); // Success step
            } else {
                setStatus('ERROR');
            }
        } catch (err) {
            setStatus('ERROR');
        }
    };

    const categories = [
        { id: 'sales', label: 'deployment_request', icon: Server, desc: 'provision a new school matrix' },
        { id: 'support', label: 'system_support', icon: LifeBuoy, desc: 'technical assistance & bug reports' },
        { id: 'billing', label: 'financial_inquiry', icon: CreditCard, desc: 'billing, invoices & subscription' },
        { id: 'security', label: 'vulnerability_report', icon: ShieldCheck, desc: 'white-hat & security disclosures' }
    ];

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

            <main className="relative z-10 pt-32 pb-40 px-6 min-h-[90vh] flex flex-col justify-center">
                <div className="max-w-4xl mx-auto w-full space-y-16">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 bg-zinc-950/60 text-[10px] text-zinc-500 uppercase tracking-widest">
                            <Terminal className="w-3.5 h-3.5" /> secure_comms // uplink // step_{step}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-white leading-none">
                            <GlitchText>establish uplink.</GlitchText>
                        </h1>
                        <p className="text-sm md:text-base text-zinc-500 max-w-xl mx-auto lowercase leading-relaxed font-sans font-light">
                            initiate contact with a vanguard representative. please configure your transmission packet below.
                        </p>
                    </motion.div>

                    <div className="max-w-2xl mx-auto relative h-[450px]">
                        <AnimatePresence mode="wait">
                            {/* STEP 1: CATEGORY SELECTION */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute inset-0 space-y-6"
                                >
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest border-b border-white/5 pb-2">
                                        [01] select_transmission_vector
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {categories.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => { setCategory(c.id as Category); setStep(2); }}
                                                className="p-6 border border-white/10 bg-zinc-950/50 hover:bg-zinc-900/80 hover:border-white/30 text-left transition-all duration-300 group relative overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                                <c.icon className="w-6 h-6 text-zinc-400 mb-4 group-hover:text-white transition-colors" />
                                                <h3 className="font-bold text-white uppercase tracking-tight text-sm">{c.label}</h3>
                                                <p className="text-[10px] text-zinc-500 mt-2 font-sans">{c.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2: IDENTIFICATION */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute inset-0 space-y-6"
                                >
                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                            [02] node_identification
                                        </div>
                                        <div className="text-[10px] text-zinc-600 font-mono">
                                            vector: {category}
                                        </div>
                                    </div>

                                    <div className="p-8 border border-white/10 bg-zinc-950/60 backdrop-blur-sm space-y-6 rounded-none">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                                                <span>callsign // identifier</span>
                                                <span className="text-zinc-700">*required</span>
                                            </label>
                                            <input
                                                type="text"
                                                autoFocus
                                                value={formData.callsign}
                                                onChange={(e) => setFormData({ ...formData, callsign: e.target.value })}
                                                className="w-full bg-black border border-white/10 focus:border-white outline-none px-4 py-3 text-sm text-white transition-colors rounded-none placeholder:text-zinc-700"
                                                placeholder="enter_callsign_ or school_name_"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                                                <span>direct_comm_link // email</span>
                                                <span className="text-zinc-700">*required</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-black border border-white/10 focus:border-white outline-none px-4 py-3 text-sm text-white transition-colors rounded-none placeholder:text-zinc-700"
                                                placeholder="user@domain.com"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pt-4">
                                            <Button variant="ghost" onClick={() => setStep(1)} className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white rounded-none">
                                                <ArrowLeft className="w-3.5 h-3.5 mr-2" /> back
                                            </Button>
                                            <Button 
                                                onClick={() => setStep(3)} 
                                                disabled={!formData.callsign || !formData.email || !formData.email.includes('@')}
                                                className="text-[10px] uppercase tracking-widest bg-white text-black hover:bg-zinc-200 rounded-none h-10 px-6 font-bold"
                                            >
                                                proceed_to_payload <ChevronRight className="w-3.5 h-3.5 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: PAYLOAD/MESSAGE */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute inset-0 space-y-6"
                                >
                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                            [03] construct_payload
                                        </div>
                                        <div className="text-[10px] text-zinc-600 font-mono">
                                            id: {formData.callsign}
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="p-8 border border-white/10 bg-zinc-950/60 backdrop-blur-sm space-y-6 rounded-none relative">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                                                <span>payload_content // message</span>
                                                <span className="text-zinc-700">*required</span>
                                            </label>
                                            <textarea
                                                rows={5}
                                                required
                                                autoFocus
                                                value={formData.message}
                                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                                className="w-full bg-black border border-white/10 focus:border-white outline-none px-4 py-3 text-sm text-white transition-colors resize-none rounded-none placeholder:text-zinc-700"
                                                placeholder={
                                                    category === 'sales' ? "details on number of students and deployment timeline..." :
                                                    category === 'security' ? "describe vulnerability vector and proof of concept..." :
                                                    "initiate handshake sequence and provide details_"
                                                }
                                            />
                                        </div>

                                        {status === 'ERROR' && (
                                            <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest bg-red-950/30 p-2 border border-red-900/50">transmission failed. check uplink node.</p>
                                        )}

                                        <div className="flex items-center justify-between pt-4">
                                            <Button type="button" variant="ghost" onClick={() => setStep(2)} className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white rounded-none">
                                                <ArrowLeft className="w-3.5 h-3.5 mr-2" /> back
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={status === 'LOADING' || !formData.message}
                                                className="font-bold tracking-widest text-[10px] uppercase bg-white text-black hover:bg-zinc-200 h-10 px-6 rounded-none gap-2"
                                            >
                                                {status === 'LOADING' ? (
                                                    <>connecting_node... <Loader2 className="w-3.5 h-3.5 animate-spin" /></>
                                                ) : (
                                                    <>transmit_payload <Send className="w-3.5 h-3.5" /></>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {/* STEP 4: SUCCESS */}
                            {step === 4 && (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/60 backdrop-blur-sm border border-white/10 h-full"
                                >
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 bg-white/20 blur-xl rounded-full animate-pulse" />
                                        <CheckCircle2 className="w-16 h-16 text-white relative z-10" />
                                    </div>
                                    <h4 className="text-2xl font-bold uppercase text-white mb-2 tracking-tighter"><GlitchText>uplink_established</GlitchText></h4>
                                    <div className="p-4 border border-white/5 bg-black text-left w-full max-w-sm mt-4 mb-6">
                                        <div className="text-[10px] text-zinc-600 font-mono border-b border-white/5 pb-2 mb-2">transmission_receipt</div>
                                        <div className="text-xs text-zinc-400 font-mono space-y-1">
                                            <p><span className="text-zinc-600">callsign:</span> {formData.callsign}</p>
                                            <p><span className="text-zinc-600">vector:</span> {category}</p>
                                            <p><span className="text-zinc-600">status:</span> routed to hq</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => { setStatus('IDLE'); setFormData({ callsign: '', email: '', message: '' }); setStep(1); }}
                                        className="border-white/20 text-zinc-400 hover:text-white font-bold uppercase text-[9px] tracking-widest rounded-none h-10 px-8"
                                    >
                                        new_transmission
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </main>

            <PageFooter id="UPLINK_PROTOCOL" links={[{ href: "/docs", label: "docs" }, { href: "/support", label: "support" }, { href: "/security", label: "vault" }]} />
        </div>
    );
}
