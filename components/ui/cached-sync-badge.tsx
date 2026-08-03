'use client';

import React from 'react';
import { RefreshCw, WifiOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CachedSyncBadgeProps {
    isRevalidating?: boolean;
    isOffline?: boolean;
    isFromCache?: boolean;
    error?: Error | null;
    onSync?: () => void;
    className?: string;
    showWhenFresh?: boolean;
}

export function CachedSyncBadge({
    isRevalidating,
    isOffline,
    isFromCache,
    error,
    onSync,
    className,
    showWhenFresh = false
}: CachedSyncBadgeProps) {
    if (!isRevalidating && !isOffline && !isFromCache && !error && !showWhenFresh) {
        return null;
    }

    if (isOffline) {
        return (
            <div
                className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                    className
                )}
            >
                <WifiOff className="w-3 h-3" />
                <span>Offline (Local Cache)</span>
            </div>
        );
    }

    if (error && isFromCache) {
        return (
            <button
                onClick={onSync}
                className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all cursor-pointer',
                    className
                )}
                title="Tap to retry syncing with server"
            >
                <AlertCircle className="w-3 h-3" />
                <span>Cached • Tap to retry</span>
            </button>
        );
    }

    if (isRevalidating) {
        return (
            <div
                className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-eduGreen-500/10 text-eduGreen-600 dark:text-eduGreen-400 border border-eduGreen-500/20 animate-in fade-in',
                    className
                )}
            >
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Syncing live...</span>
            </div>
        );
    }

    if (isFromCache) {
        return (
            <button
                onClick={onSync}
                className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 transition-all',
                    className
                )}
                title="Showing cached data. Click to refresh."
            >
                <CheckCircle2 className="w-2.5 h-2.5 text-eduGreen-500" />
                <span>Cached • Sync</span>
            </button>
        );
    }

    return null;
}
