"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export type ConnectionQuality = "fast" | "slow" | "offline";

/**
 * Detects network quality using Network Information API + navigator.onLine.
 * Falls back to "fast" in unsupported browsers.
 */
export function useNetworkQuality(): ConnectionQuality {
    const prefersReduced = useReducedMotion();
    const [quality, setQuality] = useState<ConnectionQuality>("fast");

    useEffect(() => {
        const evaluate = () => {
            if (!navigator.onLine) { setQuality("offline"); return; }

            const conn = (navigator as any).connection;
            if (!conn) {
                // No API — stay at fast, but respect user pref
                setQuality(prefersReduced ? "slow" : "fast");
                return;
            }

            const { effectiveType, saveData, downlink } = conn;
            if (saveData || effectiveType === "slow-2g" || effectiveType === "2g" || downlink < 0.5) {
                setQuality("slow");
            } else if (effectiveType === "3g" || downlink < 2) {
                setQuality("slow"); // treat 3g as slow too for animation purposes
            } else {
                setQuality("fast");
            }
        };

        evaluate();

        window.addEventListener("online", evaluate);
        window.addEventListener("offline", evaluate);

        const conn = (navigator as any).connection;
        conn?.addEventListener("change", evaluate);

        return () => {
            window.removeEventListener("online", evaluate);
            window.removeEventListener("offline", evaluate);
            conn?.removeEventListener("change", evaluate);
        };
    }, [prefersReduced]);

    // prefers-reduced-motion always overrides to slow
    if (prefersReduced) return "slow";

    return quality;
}

/** Returns true when animations should be suppressed */
export function useIsLowPower(): boolean {
    const q = useNetworkQuality();
    return q !== "fast";
}
