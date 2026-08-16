"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export type ConnectionQuality = "fast" | "slow" | "offline";

export interface NetworkDetails {
    quality: ConnectionQuality;
    isOffline: boolean;
    isSlow: boolean;
    effectiveType?: string;
    rtt?: number;
    downlink?: number;
    saveData?: boolean;
}

/**
 * Detects network quality using Network Information API + navigator.onLine.
 * Falls back to "fast" in unsupported browsers.
 */
export function useNetworkQuality(): ConnectionQuality {
    const prefersReduced = useReducedMotion();
    const [quality, setQuality] = useState<ConnectionQuality>("fast");

    useEffect(() => {
        const evaluate = () => {
            if (typeof navigator === "undefined") return;
            if (!navigator.onLine) { setQuality("offline"); return; }

            const conn = (navigator as any).connection;
            if (!conn) {
                setQuality(prefersReduced ? "slow" : "fast");
                return;
            }

            const { effectiveType, saveData, downlink, rtt } = conn;
            if (saveData || effectiveType === "slow-2g" || effectiveType === "2g" || (downlink && downlink < 0.5) || (rtt && rtt > 1500)) {
                setQuality("slow");
            } else if (effectiveType === "3g" || (downlink && downlink < 2) || (rtt && rtt > 600)) {
                setQuality("slow");
            } else {
                setQuality("fast");
            }
        };

        evaluate();

        window.addEventListener("online", evaluate);
        window.addEventListener("offline", evaluate);

        const conn = typeof navigator !== "undefined" ? (navigator as any).connection : null;
        conn?.addEventListener("change", evaluate);

        return () => {
            window.removeEventListener("online", evaluate);
            window.removeEventListener("offline", evaluate);
            conn?.removeEventListener("change", evaluate);
        };
    }, [prefersReduced]);

    if (prefersReduced) return "slow";

    return quality;
}

/** Detailed Network Diagnostics Hook */
export function useNetworkDetails(): NetworkDetails {
    const quality = useNetworkQuality();
    const [details, setDetails] = useState<NetworkDetails>({
        quality,
        isOffline: quality === "offline",
        isSlow: quality === "slow"
    });

    useEffect(() => {
        const conn = typeof navigator !== "undefined" ? (navigator as any).connection : null;
        const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
        
        setDetails({
            quality,
            isOffline,
            isSlow: quality === "slow",
            effectiveType: conn?.effectiveType,
            rtt: conn?.rtt,
            downlink: conn?.downlink,
            saveData: conn?.saveData
        });
    }, [quality]);

    return details;
}

/** Calculates adaptive network timeout & backoff parameters */
export function getAdaptiveNetworkConfig(quality: ConnectionQuality = "fast") {
    if (quality === "offline") {
        return {
            timeoutMs: 6000,
            retries: 0,
            retryDelayMs: 0
        };
    }
    if (quality === "slow") {
        return {
            timeoutMs: 28000, // Generous 28s timeout for 2G/3G/rural connectivity
            retries: 3,
            retryDelayMs: 2500
        };
    }
    return {
        timeoutMs: 14000,
        retries: 2,
        retryDelayMs: 1200
    };
}

/** Returns true when animations should be suppressed */
export function useIsLowPower(): boolean {
    const q = useNetworkQuality();
    return q !== "fast";
}
