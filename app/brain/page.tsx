"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Brain, Home, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SoftwareNeuralGraph } from "@/components/brain/software-neural-graph";
import { ScanLines, CustomCursor, AnimatedGrid } from "@/components/public/animations";

export default function BrainVisualizerPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-white font-sans tracking-tight">
      <ScanLines />
      <CustomCursor />
      <AnimatedGrid />

      {/* ── TOP NAVIGATION ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-6 py-4">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo className="w-8 h-8" />
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                LUCY <span className="text-emerald-400 font-black">BRAIN MATRIX</span>
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1.5">
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-9 px-3 text-xs text-zinc-400 hover:text-white flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
              </Button>
            </Link>
            <ThemeToggle className="scale-90" />
          </div>
        </div>
      </nav>

      {/* ── FULL SCREEN INTERACTIVE BRAIN CONTAINER ── */}
      <main className="relative z-10 pt-24 px-4 sm:px-8 pb-12 max-w-[1500px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Brain className="w-7 h-7 text-emerald-400 animate-pulse" />
              LUCY OS Neural Architecture & Live Synapses
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Visual 2D interactive neural graph. Hover and click nodes to explore connected pathways, role access, and database mutations.
            </p>
          </div>
        </div>

        <SoftwareNeuralGraph className="h-[750px]" />
      </main>
    </div>
  );
}
