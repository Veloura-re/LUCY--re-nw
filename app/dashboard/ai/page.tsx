"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function NeuralPage() {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/user/settings');
                const data: any = await res.json();
                if (data.user) {
                    setUserData(data.user);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 className="w-12 h-12 text-eduGreen-500 animate-spin mb-4" />
                <p className="text-zinc-500 font-medium uppercase tracking-[0.3em] text-[10px]">Synchronizing Neural Correlates</p>
            </div>
        );
    }
    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-300 relative max-w-full overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-eduGreen-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="mb-8 flex justify-between items-end relative z-10">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-eduGreen-950/30 border border-eduGreen-500/20 text-[10px] font-medium text-eduGreen-400 uppercase tracking-[0.3em] mb-4 backdrop-blur-md">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        <span>Institutional Neural Link</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-medium text-white tracking-tighter uppercase italic">
                        Neural <span className="text-eduGreen-500 not-italic">Interface</span>
                    </h1>
                </div>

                <div className="hidden md:flex flex-col items-end gap-1">
                    <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Core Synchronized</div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-950/50 border border-zinc-900 rounded-2xl backdrop-blur-xl">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
                        <span className="text-[10px] font-medium text-white uppercase tracking-tighter">Standby Mode</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-zinc-950/40 backdrop-blur-3xl border border-zinc-900/50 rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative z-10 w-full min-w-0 flex items-center justify-center">
                <div className="relative flex flex-col items-center justify-center text-center p-8 md:p-12">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="mb-8 relative"
                    >
                        <div className="absolute inset-0 bg-eduGreen-500/20 blur-[80px] rounded-full" />
                        <div className="w-24 h-24 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center relative z-10 shadow-2xl backdrop-blur-xl">
                            <Sparkles className="w-10 h-10 text-eduGreen-500 animate-pulse" />
                        </div>
                    </motion.div>
                    
                    <motion.h2 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="text-3xl md:text-5xl font-medium text-white uppercase tracking-[0.1em] mb-4"
                    >
                        Neural Core <span className="text-eduGreen-500 italic">Initializing</span>
                    </motion.h2>
                    
                    <motion.p 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="text-zinc-500 font-medium text-xs md:text-sm uppercase tracking-[0.3em] max-w-lg leading-relaxed"
                    >
                        The next generation of institutional AI is currently undergoing safety alignment and cognitive calibration. 
                    </motion.p>
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, duration: 0.5 }}
                        className="mt-12 flex items-center gap-3 px-6 py-3 rounded-full border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md shadow-2xl"
                    >
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Deployment Incoming</span>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
