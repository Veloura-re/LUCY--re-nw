"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { X, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Text Reveal Component
const TextReveal = ({ text }: { text: string }) => {
    const words = text.split(" ");
    
    const container = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.12, delayChildren: 0.04 * i },
        }),
    };
    
    const child = {
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring" as const, damping: 12, stiffness: 100 },
        },
        hidden: {
            opacity: 0,
            y: 20,
            transition: { type: "spring" as const, damping: 12, stiffness: 100 },
        },
    };

    return (
        <motion.h3 
            className="text-base sm:text-lg md:text-xl font-bold text-zinc-900 dark:text-white mb-1.5 sm:mb-2 leading-tight tracking-tight flex flex-wrap gap-x-1"
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {words.map((word, index) => (
                <motion.span variants={child} key={index}>
                    {word}
                </motion.span>
            ))}
        </motion.h3>
    );
};

export function PromoPopup() {
    const [isVisible, setIsVisible] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        
        const hasDismissed = localStorage.getItem("lucy_promo_dismissed");
        
        if (!hasDismissed) {
            // Delay by 3 seconds before showing
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 3000);
            
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
                    initial={{ opacity: 0, scale: 0.8, y: 50, rotateX: -15 }}
                    animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20, rotateX: 10 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-[100] sm:max-w-sm max-w-none"
                    style={{ perspective: "1000px" }}
                >
                    <motion.div
                        whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative rounded-2xl sm:rounded-[24px] p-[1px] overflow-hidden group shadow-2xl"
                    >
                        {/* Spinning Neon Border */}
                        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,#10b981_0%,#3b82f6_25%,#8b5cf6_50%,#f43f5e_75%,#10b981_100%)] animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* Static Subtle Border for resting state */}
                        <div className="absolute inset-0 bg-gradient-to-br from-eduGreen-500/50 via-zinc-200/20 to-eduGreen-500/50 dark:from-eduGreen-500/30 dark:via-zinc-800/50 dark:to-eduGreen-500/30 group-hover:opacity-0 transition-opacity duration-500" />

                        <div className="relative h-full w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl rounded-[15px] sm:rounded-[23px] p-3.5 sm:p-5 shadow-2xl">
                            {/* Inner Glow */}
                            <motion.div 
                                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-12 -right-12 w-32 h-32 bg-eduGreen-500/30 blur-[40px] rounded-full pointer-events-none" 
                            />
                            
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-2.5 sm:mb-4">
                                    <motion.div 
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="flex items-center gap-2"
                                    >
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-eduGreen-500/10 flex items-center justify-center relative">
                                            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-eduGreen-600 dark:text-eduGreen-400 absolute" />
                                            {/* Pulsing ring */}
                                            <motion.div
                                                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="absolute inset-0 border border-eduGreen-500 rounded-full"
                                            />
                                        </div>
                                        <span className="text-[8px] sm:text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                                            Exclusive Invite
                                        </span>
                                    </motion.div>
                                    <button 
                                        onClick={handleDismiss}
                                        className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                    >
                                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                </div>

                                <TextReveal text="4 Months Free Trial" />
                                
                                <motion.p 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 mb-3 sm:mb-5 font-medium leading-snug sm:leading-relaxed"
                                >
                                    Create your school account today and experience the full power of LUCY OS, completely free for your first 4 months.
                                </motion.p>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                >
                                    <Link href="/register">
                                        <Button 
                                            onClick={handleDismiss}
                                            className="w-full group h-9 sm:h-11 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all relative overflow-hidden"
                                        >
                                            <span className="relative z-10 flex items-center justify-center">
                                                Start Free Trial
                                                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                            {/* Button shine effect */}
                                            <motion.div 
                                                className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"
                                            />
                                        </Button>
                                    </Link>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
