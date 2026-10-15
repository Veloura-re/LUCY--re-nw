'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, School, CreditCard, ShieldCheck, 
    Inbox, ScrollText, ShieldAlert, Menu, X, Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function AdminNav() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close menu when route changes
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Prevent body scrolling when mobile navigation drawer is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileOpen]);

    const links = [
        { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
        { href: '/admin/sanctuary', label: 'Sanctuary Safety', icon: ShieldAlert },
        { href: '/admin/schools', label: 'Schools Ledger', icon: School },
        { href: '/admin/billing', label: 'Billing & Licenses', icon: CreditCard },
        { href: '/admin/security', label: 'Security Disclosures', icon: ShieldCheck },
        { href: '/admin/requests', label: 'Access Requests', icon: Inbox },
        { href: '/admin/logs', label: 'Activity Logs', icon: ScrollText },
    ];

    return (
        <>
            {/* Desktop Navigation Links (>= xl) */}
            <div className="hidden xl:flex items-center gap-2">
                <nav className="flex items-center gap-1">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0",
                                    isActive
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                        : "bg-transparent text-slate-500 dark:text-zinc-500 border-transparent hover:text-slate-900 dark:hover:text-zinc-200"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <ThemeToggle />
            </div>

            {/* Mobile & Tablet Hamburger Toggle (< xl) */}
            <div className="flex xl:hidden items-center gap-2">
                <ThemeToggle />
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle Navigation Menu"
                    className="flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-95 shadow-sm"
                >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile & Tablet Drawer Sheet */}
            <AnimatePresence>
                {mobileOpen && (
                    <div className="fixed inset-0 z-[100] xl:hidden">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        {/* Slide-over Drawer */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute top-0 right-0 bottom-0 w-full max-w-xs sm:max-w-sm bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col p-6 z-10"
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <div className="font-orbitron font-black text-xs tracking-wider text-zinc-900 dark:text-white leading-tight">
                                            LUCY <span className="text-emerald-500">OS</span>
                                        </div>
                                        <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono">
                                            SuperAdmin Control
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Navigation List */}
                            <nav className="flex-1 overflow-y-auto py-6 space-y-1.5 scrollbar-thin">
                                {links.map((link) => {
                                    const Icon = link.icon;
                                    const isActive = pathname === link.href;
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setMobileOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                                                isActive
                                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-sm"
                                                    : "bg-transparent text-zinc-600 dark:text-zinc-400 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
                                            )}
                                        >
                                            <Icon className={cn("w-4 h-4", isActive ? "text-emerald-500" : "text-zinc-500")} />
                                            <span>{link.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* Drawer Footer */}
                            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-2">
                                    <span>Theme Protocol</span>
                                    <ThemeToggle />
                                </div>
                                <div className="p-3 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-500 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span>Status:</span>
                                        <span className="text-emerald-500 font-bold uppercase">RLS Protected</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Engine:</span>
                                        <span className="text-zinc-400 uppercase">Operational</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
