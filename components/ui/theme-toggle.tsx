"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className={cn("w-10 h-10 rounded-2xl bg-slate-200/50 dark:bg-zinc-900/50 border border-slate-300/50 dark:border-zinc-800/80 animate-pulse", className)} />
        );
    }

    const currentTheme = theme || "system";

    const options = [
        { id: "light", label: "White Mode", icon: Sun, color: "text-amber-500" },
        { id: "dark", label: "Dark Mode", icon: Moon, color: "text-emerald-400" },
        { id: "system", label: "System Auto", icon: Laptop, color: "text-cyan-400" },
    ];

    return (
        <div className="relative inline-block text-left">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                aria-label="Toggle Theme"
                className={cn(
                    "relative w-10 h-10 rounded-2xl bg-white/80 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/80 shadow-sm dark:shadow-none hover:border-emerald-500/50 transition-all duration-300 flex items-center justify-center group overflow-hidden",
                    className
                )}
            >
                {/* Backlit Glow Halo */}
                <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl blur-xs" />

                <AnimatePresence mode="wait" initial={false}>
                    {currentTheme === "light" && (
                        <motion.div
                            key="light"
                            initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="relative z-10 text-amber-500"
                        >
                            <Sun className="w-5 h-5" />
                        </motion.div>
                    )}

                    {currentTheme === "dark" && (
                        <motion.div
                            key="dark"
                            initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="relative z-10 text-emerald-400"
                        >
                            <Moon className="w-5 h-5" />
                        </motion.div>
                    )}

                    {currentTheme === "system" && (
                        <motion.div
                            key="system"
                            initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="relative z-10 text-cyan-400"
                        >
                            <Laptop className="w-5 h-5" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="absolute right-0 mt-2 w-44 p-1.5 rounded-2xl bg-white/95 dark:bg-zinc-950/95 border border-slate-200/90 dark:border-zinc-800/90 shadow-xl backdrop-blur-2xl z-50 overflow-hidden"
                    >
                        <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-900 mb-1">
                            Theme Protocol
                        </div>

                        {options.map((opt) => {
                            const Icon = opt.icon;
                            const isSelected = currentTheme === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        setTheme(opt.id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between group",
                                        isSelected
                                            ? "bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-white"
                                            : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/50 hover:text-slate-900 dark:hover:text-white"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon className={cn("w-4 h-4", opt.color)} />
                                        <span>{opt.label}</span>
                                    </div>
                                    {isSelected && (
                                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
