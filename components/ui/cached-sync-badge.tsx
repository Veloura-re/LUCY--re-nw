'use client';

import React from 'react';
import { RefreshCw, WifiOff, CheckCircle2, AlertCircle, Radio, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CachedSyncBadgeProps {
    isRevalidating?: boolean;
    isOffline?: boolean;
    isFromCache?: boolean;
    isTimeout?: boolean;
    retryAttempt?: number;
    maxRetries?: number;
    error?: Error | null;
    onSync?: () => void;
    className?: string;
    showWhenFresh?: boolean;
}

export function CachedSyncBadge({
    isRevalidating,
    isOffline,
    isFromCache,
    isTimeout,
    retryAttempt = 0,
    maxRetries = 3,
    error,
    onSync,
    className,
    showWhenFresh = false
}: CachedSyncBadgeProps) {
    if (!isRevalidating && !isOffline && !isFromCache && !error && !showWhenFresh && !isTimeout) {
        return null;
    }

    if (isOffline) {
        return (
            <div
                className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm backdrop-blur-sm',
                    className
                )}
            >
                <WifiOff className="w-3 h-3" />
                <span>Offline (Local Cache)</span>
            </div>
        );
    }

    if (retryAttempt > 0 && isRevalidating) {
        return (
            <div
                className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 animate-pulse backdrop-blur-sm',
                    className
                )}
                title={`Retrying connection (Attempt ${retryAttempt}/${maxRetries})`}
            >
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
                <span>Connecting to campus ledger ({retryAttempt}/{maxRetries})...</span>
            </div>
        );
    }

    if (error || isTimeout) {
        return (
            <button
                type="button"
                onClick={onSync}
                className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-sm backdrop-blur-sm',
                    className
                )}
                title={error?.message || "Connection slow. Click to retry sync."}
            >
                {isTimeout ? <Clock className="w-3 h-3 text-amber-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
                <span>{isFromCache ? 'Cached snapshot • Tap to retry sync' : 'Slow connection • Tap to retry'}</span>
            </button>
        );
    }

    if (isRevalidating) {
        return (
            <div
                className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-in fade-in backdrop-blur-sm',
                    className
                )}
            >
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-500" />
                <span>Syncing live data...</span>
            </div>
        );
    }

    if (isFromCache) {
        return (
            <button
                type="button"
                onClick={onSync}
                className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 transition-all backdrop-blur-sm cursor-pointer',
                    className
                )}
                title="Showing verified offline cache. Click to check for updates."
            >
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                <span>Cached • Sync</span>
            </button>
        );
    }

    return null;
}
export default CachedSyncBadge;
