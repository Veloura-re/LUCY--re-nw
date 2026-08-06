"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Activity, ArrowUpRight, ShieldCheck, Zap } from "lucide-react";

interface BacklitContainerProps {
  children: React.ReactNode;
  accent?: "emerald" | "purple" | "cyan" | "amber" | "rose";
  className?: string;
  glowOpacity?: string;
}

export function BacklitContainer({
  children,
  accent = "emerald",
  className,
  glowOpacity = "group-hover:opacity-100"
}: BacklitContainerProps) {
  const glowMap = {
    emerald: "from-emerald-500/20 via-emerald-500/5 to-transparent shadow-emerald-500/20",
    purple: "from-purple-500/20 via-purple-500/5 to-transparent shadow-purple-500/20",
    cyan: "from-cyan-500/20 via-cyan-500/5 to-transparent shadow-cyan-500/20",
    amber: "from-amber-500/20 via-amber-500/5 to-transparent shadow-amber-500/20",
    rose: "from-rose-500/20 via-rose-500/5 to-transparent shadow-rose-500/20",
  };

  return (
    <div className={cn("relative group transition-all duration-500", className)}>
      {/* Background Ambient Radial Glow */}
      <div
        className={cn(
          "absolute -inset-1 bg-gradient-to-r rounded-[2rem] blur-xl opacity-60 transition-opacity duration-700 pointer-events-none",
          glowMap[accent],
          glowOpacity
        )}
      />

      {/* Glassmorphic Dark Container Body */}
      <div className="relative bg-slate-900/90 dark:bg-zinc-950/90 backdrop-blur-3xl border border-slate-200/80 dark:border-zinc-800/80 p-6 sm:p-8 rounded-[1.8rem] shadow-2xl transition-all duration-300 group-hover:border-zinc-700/80">
        {children}
      </div>
    </div>
  );
}

export interface TelemetryMetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  status?: string;
  accent?: "emerald" | "purple" | "cyan" | "amber";
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

export function TelemetryMetricCard({
  label,
  value,
  change,
  status = "OPTIMAL",
  accent = "emerald",
  icon,
  trend = "up"
}: TelemetryMetricCardProps) {
  const statusColors = {
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400",
    cyan: "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="relative overflow-hidden bg-slate-900/90 dark:bg-zinc-950/90 border border-slate-200/80 dark:border-zinc-800/80 p-5 sm:p-6 rounded-2xl group hover:border-zinc-700/80 transition-all shadow-xl">
      {/* Ambient Corner Glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500 pointer-events-none" />

      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400 uppercase flex items-center gap-2">
          {icon || <Activity className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 animate-pulse" />}
          {label}
        </span>
        <span className={cn("text-[9px] font-mono px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider", statusColors[accent])}>
          {status}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">{value}</h3>
        {change && (
          <span className={cn(
            "text-xs font-semibold flex items-center gap-0.5 font-mono",
            trend === "up" ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
          )}>
            {change}
            <ArrowUpRight className={cn("w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5", trend === "down" && "rotate-90")} />
          </span>
        )}
      </div>
    </div>
  );
}

export function BacklitMatrixBadge({ text, active = true }: { text: string; active?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/90 dark:bg-zinc-950/90 border border-slate-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 shadow-inner">
      <span className={cn("w-2 h-2 rounded-full", active ? "bg-emerald-500 shadow-[0_0_8px_#10B981]" : "bg-zinc-600")} />
      {text}
    </div>
  );
}
