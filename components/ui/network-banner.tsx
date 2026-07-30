"use client";

import { useEffect, useState } from "react";
import { useNetworkQuality } from "@/hooks/use-network-quality";

/**
 * Network status banner — shows a toast at the bottom when connection is slow or offline.
 * Appears briefly, auto-dismisses when connection recovers.
 */
export function NetworkBanner() {
    const quality = useNetworkQuality();
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (quality !== "fast") {
            setVisible(true);
            setDismissed(false);
        } else {
            // small delay before hiding so the "back online" message shows
            const t = setTimeout(() => setVisible(false), 2500);
            return () => clearTimeout(t);
        }
    }, [quality]);

    if (!visible || dismissed) return null;

    return (
        <div
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-bold border shadow-2xl transition-all flex items-center gap-3 ${quality === "offline"
                    ? "bg-red-950/90 border-red-800/50 text-red-300"
                    : quality === "slow"
                        ? "bg-amber-950/90 border-amber-800/50 text-amber-300"
                        : "bg-zinc-100/90 dark:bg-zinc-900/90 border-eduGreen-800/50 text-eduGreen-400"
                }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${quality === "offline" ? "bg-red-400" : quality === "slow" ? "bg-amber-400" : "bg-eduGreen-400"
                }`} />
            {quality === "offline"
                ? "No connection — operating offline"
                : quality === "slow"
                    ? "Slow connection — animations reduced"
                    : "Connection restored"}
            <button onClick={() => setDismissed(true)} className="ml-2 opacity-50 hover:opacity-100 text-xs">×</button>
        </div>
    );
}
