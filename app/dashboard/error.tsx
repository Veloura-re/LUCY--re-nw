"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertTriangle, Wifi } from "lucide-react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [retrying, setRetrying] = useState(false);
    const [countdown, setCountdown] = useState(5);

    const isChunkError = Boolean(
        error?.message?.includes("chunk") ||
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Loading chunk") ||
        error?.name === "ChunkLoadError"
    );

    const handleReconnect = useCallback(() => {
        setRetrying(true);
        if (isChunkError) {
            // Hard reload clears stale service worker or chunk cache on connection resumption
            window.location.reload();
            return;
        }
        reset();
        setTimeout(() => setRetrying(false), 2500);
    }, [isChunkError, reset]);

    useEffect(() => {
        console.error("[Dashboard Error Boundary]", error);

        // Auto-reconnect immediately when device comes back online
        const handleOnline = () => {
            handleReconnect();
        };
        window.addEventListener("online", handleOnline);

        // Automatic retry countdown for transient cold-start disruptions
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleReconnect();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            window.removeEventListener("online", handleOnline);
            clearInterval(interval);
        };
    }, [error, handleReconnect]);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-900/30 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
            </div>
            <h2 className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight mb-2">
                Connection Interrupted
            </h2>
            <p className="text-zinc-600 dark:text-zinc-500 max-w-md mb-4 font-medium uppercase tracking-widest text-[10px]">
                The institutional connection experienced a momentary disruption during cold-start. Re-establishing the secure connection typically resolves this.
            </p>
            {countdown > 0 && (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono tracking-widest uppercase mb-6 flex items-center gap-2">
                    <Wifi className="w-3 h-3 text-eduGreen-500 animate-pulse" />
                    Auto-reconnecting in {countdown}s...
                </p>
            )}
            <button
                onClick={handleReconnect}
                disabled={retrying}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-medium text-xs uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-900/20 transition-all active:scale-95 disabled:opacity-50"
            >
                <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
                {retrying ? "Reconnecting..." : "Reconnect Now"}
            </button>
        </div>
    );
}

