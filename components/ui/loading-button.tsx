"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    loadingText?: string;
    variant?: "default" | "ghost" | "destructive" | "outline";
    size?: "sm" | "md" | "lg" | "icon";
    children: React.ReactNode;
}

export function LoadingButton({
    loading = false,
    loadingText,
    variant = "default",
    size = "md",
    className,
    children,
    disabled,
    ...props
}: LoadingButtonProps) {
    const base =
        "inline-flex items-center justify-center gap-2 font-semibold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none";

    const variants = {
        default: "bg-eduGreen-600 hover:bg-eduGreen-500 text-white shadow-[0_6px_20px_-4px_rgba(20,122,82,0.35)]",
        ghost: "bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-white",
        destructive: "bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-900/30",
        outline: "bg-transparent border border-zinc-300 dark:border-zinc-800 hover:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-white",
    };

    const sizes = {
        sm: "h-9 px-4 rounded-xl text-xs tracking-wide",
        md: "h-12 px-6 rounded-2xl text-xs tracking-widest uppercase",
        lg: "h-14 px-8 rounded-2xl text-sm tracking-widest uppercase",
        icon: "h-10 w-10 rounded-xl",
    };

    return (
        <button
            disabled={disabled || loading}
            className={cn(base, variants[variant], sizes[size], className)}
            {...props}
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingText || "Loading..."}</span>
                </>
            ) : (
                children
            )}
        </button>
    );
}
