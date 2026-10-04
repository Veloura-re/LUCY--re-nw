"use client";

import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScannerTriggerButtonProps {
    variant?: "header" | "button" | "icon";
    label?: string;
    className?: string;
}

export function ScannerTriggerButton({
    variant = "header",
    label = "Scan Student ID",
    className = ""
}: ScannerTriggerButtonProps) {
    const handleTrigger = () => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("lucy:open-scanner"));
        }
    };

    if (variant === "icon") {
        return (
            <button
                type="button"
                onClick={handleTrigger}
                title="Scan Student ID"
                className={`w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-eduGreen-500 transition-colors ${className}`}
                aria-label="Scan Student ID"
            >
                <QrCode className="w-4 h-4" />
            </button>
        );
    }

    if (variant === "button") {
        return (
            <Button
                type="button"
                onClick={handleTrigger}
                className={`bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 px-4 shadow-sm transition-all flex items-center gap-2 ${className}`}
            >
                <QrCode className="w-3.5 h-3.5" />
                <span>{label}</span>
            </Button>
        );
    }

    // Default: "header" style
    return (
        <button
            type="button"
            onClick={handleTrigger}
            className={`group relative flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm ${className}`}
            title="Scan Student Badge"
        >
            <div className="w-6 h-6 rounded-lg bg-eduGreen-500/10 dark:bg-eduGreen-500/20 text-eduGreen-600 dark:text-eduGreen-400 flex items-center justify-center transition-colors group-hover:bg-eduGreen-500 group-hover:text-white">
                <QrCode className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Scan ID
            </span>
        </button>
    );
}
