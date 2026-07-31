"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PromoPopup() {
    const [isVisible, setIsVisible] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        
        // Check if the user has already dismissed the popup
        const hasDismissed = localStorage.getItem("lucy_promo_dismissed");
        
        if (!hasDismissed) {
            // Delay by 4 seconds (4000ms) before showing
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 4000);
            
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("lucy_promo_dismissed", "true");
    };

    if (!isMounted) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed bottom-6 right-6 z-[100] w-full max-w-sm"
                >
                    <div className="relative overflow-hidden bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl">
                        {/* Background Glow */}
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-eduGreen-500/20 blur-3xl rounded-full" />
                        
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-eduGreen-500/10 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-eduGreen-600 dark:text-eduGreen-400" />
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                                        Limited Offer
                                    </span>
                                </div>
                                <button 
                                    onClick={handleDismiss}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 leading-tight tracking-tight">
                                4 Months Free Trial
                            </h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
                                Initialize your node today and experience the full power of LUCY OS, completely free for your first 4 months.
                            </p>

                            <Link href="/register">
                                <Button 
                                    onClick={handleDismiss} // Also dismiss it so it doesn't show next time they visit
                                    className="w-full group h-12 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                                >
                                    Start Free Trial
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
