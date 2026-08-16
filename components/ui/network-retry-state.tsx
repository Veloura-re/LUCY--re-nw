'use client';

import React from 'react';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NetworkRetryStateProps {
    title?: string;
    description?: string;
    isTimeout?: boolean;
    isOffline?: boolean;
    retryAttempt?: number;
    maxRetries?: number;
    onRetry?: () => void;
    className?: string;
}

export function NetworkRetryState({
    title,
    description,
    isTimeout = true,
    isOffline = false,
    retryAttempt = 0,
    maxRetries = 3,
    onRetry,
    className
}: NetworkRetryStateProps) {
    const resolvedTitle = title || (
        isOffline 
            ? "Campus Ledger Offline" 
            : retryAttempt > 0 
                ? `Reconnecting to Campus Ledger (Attempt ${retryAttempt}/${maxRetries})...` 
                : "Connection Taking Longer Than Expected"
    );

    const resolvedDescription = description || (
        isOffline
            ? "Your device appears to be offline. Any actions you take will be safely queued and synced once your connection is restored."
            : isTimeout
                ? "A slow or high-latency network was detected. Your data is secure on the server and is currently being retrieved."
                : "We are currently communicating with the institutional database. Please hold on a moment."
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "w-full max-w-lg mx-auto p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xl dark:shadow-2xl text-center relative overflow-hidden transition-all my-6",
                className
            )}
        >
            {/* Ambient Backlit Radial Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 shadow-inner">
                    {isOffline ? (
                        <WifiOff className="w-7 h-7" />
                    ) : retryAttempt > 0 ? (
                        <RefreshCw className="w-7 h-7 animate-spin" />
                    ) : (
                        <Wifi className="w-7 h-7 animate-pulse" />
                    )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                    {resolvedTitle}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-md leading-relaxed mb-6">
                    {resolvedDescription}
                </p>

                {onRetry && (
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Button
                            onClick={onRetry}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 font-semibold px-5 py-2 rounded-xl shadow-md transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry Connection Now</span>
                        </Button>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800/60 w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>LUCY OS // ZERO DATA LOSS PROTOCOL</span>
                </div>
            </div>
        </motion.div>
    );
}

export default NetworkRetryState;
