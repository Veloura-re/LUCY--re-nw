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
            const res = await fetch('/api/connection', {
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
        { id: 'sales', label: 'deployment_request', icon: Server, desc: 'provision a new school system' },
        { id: 'support', label: 'system_support', icon: LifeBuoy, desc: 'technical assistance & bug reports' },
        { id: 'billing', label: 'financial_inquiry', icon: CreditCard, desc: 'billing, invoices & subscription' },
        { id: 'security', label: 'vulnerability_report', icon: ShieldCheck, desc: 'white-hat & security disclosures' }
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight overflow-x-hidden relative transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-4 transition-colors">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">lucy_os</span>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group">
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            back_to_home
                        </Button>
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 pt-24 sm:pt-32 pb-20 sm:pb-40 px-4 sm:px-6 min-h-[90vh] flex flex-col justify-center">
                <div className="max-w-4xl mx-auto w-full space-y-12 sm:space-y-16">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-4 sm:space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-[9px] sm:text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest rounded-md dark:rounded-none">
                            <Terminal className="w-3.5 h-3.5" /> secure_comms // connection // step_{step}
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                            <GlitchText>establish connection.</GlitchText>
                        </h1>
                        <p className="text-xs sm:text-sm md:text-base text-slate-500 dark:text-zinc-500 max-w-xl mx-auto lowercase leading-relaxed font-sans font-light">
                            initiate contact with a vanguard representative. please configure your message packet below.
                        </p>
                    </motion.div>

                    <div className="max-w-2xl mx-auto relative min-h-[480px] sm:min-h-[450px]">
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
                                    <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-widest border-b border-slate-200 dark:border-white/5 pb-2">
                                        [01] select_message_vector
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {categories.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => { setCategory(c.id as Category); setStep(2); }}
                                                className="p-5 sm:p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/50 hover:bg-slate-100 dark:hover:bg-zinc-900/80 hover:border-slate-300 dark:hover:border-white/30 text-left transition-all duration-300 group relative overflow-hidden rounded-xl dark:rounded-none"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                                <c.icon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 dark:text-zinc-400 mb-3 sm:mb-4 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-xs sm:text-sm">{c.label}</h3>
                                                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-zinc-500 mt-1.5 sm:mt-2 font-sans">{c.desc}</p>
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
                                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                                        <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-widest">
                                            [02] node_identification
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-zinc-600 font-mono">
                                            vector: {category}
                                        </div>
                                    </div>

                                    <div className="p-5 sm:p-8 border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-sm space-y-5 sm:space-y-6 rounded-xl dark:rounded-none shadow-sm dark:shadow-none">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest flex justify-between">
                                                <span>callsign // identifier</span>
                                                <span className="text-slate-400 dark:text-zinc-700">*required</span>
                                            </label>
                                            <input
                                                type="text"
                                                autoFocus
                                                value={formData.callsign}
                                                onChange={(e) => setFormData({ ...formData, callsign: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 focus:border-slate-900 dark:focus:border-white outline-none px-4 py-2.5 sm:py-3 text-sm text-slate-900 dark:text-white transition-colors rounded-lg dark:rounded-none placeholder:text-slate-400 dark:placeholder:text-zinc-700"
                                                placeholder="enter_callsign_ or school_name_"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest flex justify-between">
                                                <span>direct_comm_link // email</span>
                                                <span className="text-slate-400 dark:text-zinc-700">*required</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 focus:border-slate-900 dark:focus:border-white outline-none px-4 py-2.5 sm:py-3 text-sm text-slate-900 dark:text-white transition-colors rounded-lg dark:rounded-none placeholder:text-slate-400 dark:placeholder:text-zinc-700"
                                                placeholder="user@domain.com"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pt-4">
                                            <Button variant="ghost" onClick={() => setStep(1)} className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white rounded-md dark:rounded-none">
                                                <ArrowLeft className="w-3.5 h-3.5 mr-2" /> back
                                            </Button>
                                            <Button 
                                                onClick={() => setStep(3)} 
                                                disabled={!formData.callsign || !formData.email || !formData.email.includes('@')}
                                                className="text-[10px] uppercase tracking-widest bg-slate-900 text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-zinc-200 rounded-md dark:rounded-none h-10 px-6 font-bold"
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
                                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                                        <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-widest">
                                            [03] construct_payload
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-zinc-600 font-mono">
                                            id: {formData.callsign}
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="p-5 sm:p-8 border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-sm space-y-5 sm:space-y-6 rounded-xl dark:rounded-none relative shadow-sm dark:shadow-none">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest flex justify-between">
                                                <span>payload_content // message</span>
                                                <span className="text-slate-400 dark:text-zinc-700">*required</span>
                                            </label>
                                            <textarea
                                                rows={4}
                                                required
                                                autoFocus
                                                value={formData.message}
                                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 focus:border-slate-900 dark:focus:border-white outline-none px-4 py-2.5 sm:py-3 text-sm text-slate-900 dark:text-white transition-colors resize-none rounded-lg dark:rounded-none placeholder:text-slate-400 dark:placeholder:text-zinc-700"
                                                placeholder={
                                                    category === 'sales' ? "details on number of students and deployment timeline..." :
                                                    category === 'security' ? "describe vulnerability vector and proof of concept..." :
                                                    "initiate handshake sequence and provide details_"
                                                }
                                            />
                                        </div>

                                        {status === 'ERROR' && (
                                            <p className="text-[9px] text-red-600 dark:text-red-500 font-bold uppercase tracking-widest bg-red-50 dark:bg-red-950/30 p-2 border border-red-200 dark:border-red-900/50 rounded-md dark:rounded-none">message failed. check connection node.</p>
                                        )}

                                        <div className="flex items-center justify-between pt-4">
                                            <Button type="button" variant="ghost" onClick={() => setStep(2)} className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white rounded-md dark:rounded-none">
                                                <ArrowLeft className="w-3.5 h-3.5 mr-2" /> back
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={status === 'LOADING' || !formData.message}
                                                className="font-bold tracking-widest text-[10px] uppercase bg-slate-900 text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-zinc-200 h-10 px-6 rounded-md dark:rounded-none gap-2"
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
                                    className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white/80 dark:bg-zinc-950/60 backdrop-blur-sm border border-slate-200 dark:border-white/10 h-full rounded-xl dark:rounded-none shadow-sm dark:shadow-none"
                                >
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 bg-emerald-100 dark:bg-white/20 blur-xl rounded-full animate-pulse" />
                                        <CheckCircle2 className="w-16 h-16 text-emerald-500 dark:text-white relative z-10" />
                                    </div>
                                    <h4 className="text-2xl font-bold uppercase text-slate-900 dark:text-white mb-2 tracking-tighter"><GlitchText>connection_established</GlitchText></h4>
                                    <div className="p-4 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black text-left w-full max-w-sm mt-4 mb-6 rounded-lg dark:rounded-none">
                                        <div className="text-[10px] text-slate-500 dark:text-zinc-600 font-mono border-b border-slate-200 dark:border-white/5 pb-2 mb-2">message_receipt</div>
                                        <div className="text-xs text-slate-600 dark:text-zinc-400 font-mono space-y-1">
                                            <p><span className="text-slate-400 dark:text-zinc-600">callsign:</span> {formData.callsign}</p>
                                            <p><span className="text-slate-400 dark:text-zinc-600">vector:</span> {category}</p>
                                            <p><span className="text-slate-400 dark:text-zinc-600">status:</span> routed to hq</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => { setStatus('IDLE'); setFormData({ callsign: '', email: '', message: '' }); setStep(1); }}
                                        className="border-slate-300 dark:border-white/20 text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white font-bold uppercase text-[9px] tracking-widest rounded-md dark:rounded-none h-10 px-8"
                                    >
                                        new_message
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
