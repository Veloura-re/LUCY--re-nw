"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HardHat, Hammer, Wrench } from "lucide-react";

/** Placeholder for a feature that is not available yet: a small builder animation that respects reduced motion. */
export function BeingBuilt({ title, message }: { title: string; message: string }) {
    const still = useReducedMotion();
    const loop = (duration: number, ease: "easeInOut" | "linear" = "easeInOut") =>
        still ? undefined : { repeat: Infinity, duration, ease };

    return (
        <div role="status" className="p-8 flex flex-col items-center text-center gap-5">
            <div className="relative h-24 w-28 flex items-center justify-center" aria-hidden="true">
                <motion.div className="absolute -top-1 text-amber-500" animate={still ? undefined : { y: [0, -7, 0] }} transition={loop(1.6)}>
                    <HardHat className="w-9 h-9" />
                </motion.div>
                <motion.div
                    className="text-eduGreen-500"
                    style={{ transformOrigin: "85% 85%" }}
                    animate={still ? undefined : { rotate: [-40, 10, -40] }}
                    transition={loop(0.9)}
                >
                    <Hammer className="w-10 h-10" />
                </motion.div>
                <motion.div className="absolute right-0 bottom-1 text-zinc-500" animate={still ? undefined : { rotate: 360 }} transition={loop(6, "linear")}>
                    <Wrench className="w-6 h-6" />
                </motion.div>
            </div>

            <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-tight">{title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed max-w-sm">{message}</p>
            </div>

            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true">
                <motion.div
                    className="h-full w-1/3 rounded-full bg-eduGreen-500"
                    animate={still ? undefined : { x: ["-100%", "300%"] }}
                    transition={loop(1.8)}
                />
            </div>
        </div>
    );
}
