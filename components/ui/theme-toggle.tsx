"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className={cn("w-10 h-10 rounded-2xl bg-slate-200/50 dark:bg-zinc-900/50 border border-slate-300/50 dark:border-zinc-800/80 animate-pulse", className)} />
        );
    }

    const isDark = resolvedTheme === "dark" || theme === "dark";

    const handleToggle = async (e: React.MouseEvent) => {
        const newTheme = isDark ? "light" : "dark";
        
        // Fallback for browsers that don't support View Transitions
        if (!document.startViewTransition) {
            setTheme(newTheme);
            return;
        }

        const x = e.clientX;
        const y = e.clientY;
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        const transition = document.startViewTransition(() => {
            flushSync(() => {
                setTheme(newTheme);
            });
        });

        transition.ready.then(() => {
            // Snatched Cloth Keyframes with realistic curl waves and fabric whip physics
            const clothSnatchKeyframes = [
                {
                    clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                    transform: 'translate3d(0, 0, 0) rotate(0deg) skew(0deg, 0deg) scale(1)',
                    filter: 'url(#cloth-ripple) brightness(1) drop-shadow(0 0 0 rgba(0,0,0,0))',
                    opacity: '1'
                },
                {
                    clipPath: 'polygon(0% 0%, 100% 0%, 100% 95%, 85% 100%, 65% 90%, 45% 98%, 25% 85%, 10% 95%, 0% 80%)',
                    transform: 'translate3d(3%, -4%, 0) rotate(3deg) skew(-3deg, 1.5deg) scale(0.99)',
                    filter: 'url(#cloth-ripple) brightness(1.08) drop-shadow(-15px 20px 30px rgba(0,0,0,0.35))',
                    opacity: '1'
                },
                {
                    clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 80% 85%, 60% 65%, 40% 78%, 20% 50%, 8% 65%, 0% 40%)',
                    transform: 'translate3d(14%, -18%, 0) rotate(9deg) skew(-9deg, 5deg) scale(0.94)',
                    filter: 'url(#cloth-ripple) brightness(1.18) drop-shadow(-30px 40px 50px rgba(0,0,0,0.45))',
                    opacity: '0.98'
                },
                {
                    clipPath: 'polygon(15% 0%, 100% 0%, 100% 35%, 85% 50%, 65% 30%, 45% 45%, 30% 20%, 15% 30%, 5% 10%)',
                    transform: 'translate3d(36%, -46%, 0) rotate(18deg) skew(-16deg, 9deg) scale(0.86)',
                    filter: 'url(#cloth-ripple) brightness(1.3) drop-shadow(-45px 60px 65px rgba(0,0,0,0.35))',
                    opacity: '0.9'
                },
                {
                    clipPath: 'polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%, 100% 0%, 100% 0%)',
                    transform: 'translate3d(75%, -95%, 0) rotate(28deg) skew(-24deg, 14deg) scale(0.72)',
                    filter: 'url(#cloth-ripple) brightness(1.45) drop-shadow(0 0 0 rgba(0,0,0,0))',
                    opacity: '0'
                }
            ];

            const newThemeRevealKeyframes = [
                {
                    transform: 'scale(0.97)',
                    filter: 'brightness(0.92)',
                    opacity: '0.92'
                },
                {
                    transform: 'scale(1)',
                    filter: 'brightness(1)',
                    opacity: '1'
                }
            ];

            // Animate snatched old cloth layer
            document.documentElement.animate(clothSnatchKeyframes, {
                duration: 750,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                pseudoElement: "::view-transition-old(root)",
            });

            // Animate reveal of new theme underneath
            document.documentElement.animate(newThemeRevealKeyframes, {
                duration: 750,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                pseudoElement: "::view-transition-new(root)",
            });
        });
    };

    return (
        <>
            <svg className="hidden" aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <filter id="cloth-ripple" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.035 0.045" numOctaves="4" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="32" xChannelSelector="R" yChannelSelector="G" result="displaced" />
                    </filter>
                </defs>
            </svg>
            <button
            onClick={handleToggle}
            type="button"
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={cn(
                "relative w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-300 flex items-center justify-center group overflow-hidden cursor-pointer active:scale-95",
                className
            )}
        >
            {/* Backlit Glow Halo */}
            <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl blur-xs" />

            <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                    <motion.div
                        key="sun"
                        initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                        animate={{ rotate: 0, scale: 1, opacity: 1 }}
                        exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 450, damping: 22 }}
                        className="relative z-10 text-amber-600 dark:text-amber-500"
                    >
                        <Sun className="w-5 h-5 fill-amber-500/20" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="moon"
                        initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                        animate={{ rotate: 0, scale: 1, opacity: 1 }}
                        exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 450, damping: 22 }}
                        className="relative z-10 text-emerald-500"
                    >
                        <Moon className="w-5 h-5 fill-emerald-500/20" />
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
        </>
    );
}
