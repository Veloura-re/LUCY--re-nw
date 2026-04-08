"use client";

import { useEdgeHealth } from "@/hooks/use-edge-health";
import { cn } from "@/lib/utils";
import { Activity, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Global Network Health Indicator.
 * Shows the real-time status of the Edge Worker connectivity and latency.
 */
export function EdgeHealthIndicator() {
    const { status, latency } = useEdgeHealth();

    const config = {
        stable: {
            color: "text-eduGreen-500",
            bg: "bg-eduGreen-500/10",
            border: "border-eduGreen-500/20",
            icon: ShieldCheck,
            label: "Secure Link Stable",
        },
        optimizing: {
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            icon: Activity,
            label: "Link Optimizing",
        },
        degraded: {
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            icon: ShieldAlert,
            label: "Link Latency Detected",
        },
        offline: {
            color: "text-red-500",
            bg: "bg-red-500/10",
            border: "border-red-500/20",
            icon: ShieldX,
            label: "Neural Uplink Interrupted",
        }
    };

    const current = config[status];
    const Icon = current.icon;

    return (
        <div className="flex items-center gap-3">
            <div className={cn(
                "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md border transition-all duration-500",
                current.bg,
                current.border
            )}>
                <Icon className={cn("w-3.5 h-3.5", current.color, status === 'offline' && "animate-pulse")} />
                <div className="flex flex-col">
                    <span className={cn("text-[8px] font-bold uppercase tracking-[0.2em] leading-none", current.color)}>
                        {current.label}
                    </span>
                    {latency !== null && (
                        <span className="text-[7px] text-zinc-600 font-mono mt-1">
                            RTT: {latency}MS
                        </span>
                    )}
                </div>
            </div>

            {/* Mobile / Minimal Indicator */}
            <div className={cn(
                "md:hidden w-2 h-2 rounded-full",
                status === 'stable' ? "bg-eduGreen-500" :
                status === 'optimizing' ? "bg-blue-500" :
                status === 'degraded' ? "bg-amber-500" : "bg-red-500 animate-pulse"
            )} />
        </div>
    );
}
