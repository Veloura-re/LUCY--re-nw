import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, icon, ...props }, ref) => {
        return (
            <div className="w-full space-y-1">
                {label && (
                    <label className="text-xs font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-wider ml-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-600">
                            {icon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "flex h-12 w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                            {
                                "pl-10": icon,
                                "border-red-500/50 focus:ring-red-500/50": error,
                            },
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {error && <p className="text-[10px] text-red-500 ml-1 font-medium">{error}</p>}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
