"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Dashboard Error Boundary]", error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/20 border border-amber-900/30 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-medium text-white tracking-tight mb-2">
                Connection Interrupted
            </h2>
            <p className="text-zinc-500 max-w-md mb-8 font-medium uppercase tracking-widest text-[10px]">
                The institutional uplink experienced a momentary disruption during cold-start. Re-establishing the secure connection typically resolves this.
            </p>
            <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-medium text-xs uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-900/20 transition-all active:scale-95"
            >
                <RefreshCw className="w-4 h-4" />
                Reconnect
            </button>
        </div>
    );
}
