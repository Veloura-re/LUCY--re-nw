import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
    size?: "sm" | "md" | "lg" | "icon";
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={isLoading || disabled}
                className={cn(
                    "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none rounded-button active:scale-[0.98]",
                    {
                        "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm": variant === "primary",
                        "bg-slate-100 dark:bg-zinc-900 text-emerald-600 dark:text-eduGreen-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700": variant === "secondary",
                        "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-950/40 hover:border-red-300 dark:hover:border-red-500/50": variant === "danger",
                        "hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white": variant === "ghost",
                        "border border-slate-200 dark:border-zinc-800 bg-transparent hover:bg-slate-100/80 dark:hover:bg-zinc-900/50 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white": variant === "outline",
                        "h-8 px-3 text-sm": size === "sm",
                        "h-10 px-4 py-2": size === "md",
                        "h-12 px-6 text-lg": size === "lg",
                        "h-10 w-10 p-0 text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white": size === "icon",
                    },
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button };
