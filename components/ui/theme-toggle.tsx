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
            const clipPath = [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
            ];
            document.documentElement.animate(
                {
                    clipPath: isDark ? clipPath.reverse() : clipPath,
                },
                {
                    duration: 400,
                    easing: "ease-in-out",
                    pseudoElement: isDark
                        ? "::view-transition-old(root)"
                        : "::view-transition-new(root)",
                }
            );
        });
    };

    return (
        <button
            onClick={handleToggle}
            type="button"
            aria-label={isDark ? "Switch to White Mode" : "Switch to Dark Mode"}
            title={isDark ? "Switch to White Mode" : "Switch to Dark Mode"}
            className={cn(
                "relative w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-300 flex items-center justify-center group overflow-hidden cursor-pointer",
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
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative z-10 text-emerald-400"
                    >
                        <Moon className="w-5 h-5 fill-emerald-400/20" />
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    );
}
