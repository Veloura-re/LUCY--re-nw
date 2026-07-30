"use client";


import { Card, CardTitle } from "@/components/ui/card";
import { User, Shield, ArrowRight, GraduationCap, Lock, Sparkles, Building2, Globe, Cpu } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function RegisterPage() {
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const roles = [
        {
            title: "School Director",
            icon: Building2,
            desc: "Complete institutional management. Deploy LUCY for your entire school infrastructure.",
            href: "/register/director",
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/10",
            border: "border-emerald-500/30",
            glow: "from-emerald-500/40",
            tag: "Institutional"
        },
        {
            title: "Parent Portal",
            icon: User,
            desc: "Monitor academic growth, attendance patterns, and direct school connectivity in real-time.",
            href: "/register/parent",
            color: "text-emerald-600 dark:text-eduGreen-400",
            bg: "bg-emerald-50 dark:bg-eduGreen-900/10",
            border: "border-emerald-500/30",
            glow: "from-emerald-500/40",
            tag: "Guardian"
        },
        {
            title: "Global Student",
            icon: GraduationCap,
            desc: "Access your personalized learning hub. Track grades, exams, and attendance.",
            href: "/register/student",
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/10",
            border: "border-emerald-500/30",
            glow: "from-emerald-500/40",
            tag: "Learner"
        }
    ];

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-zinc-950 font-sans text-slate-900 dark:text-white py-20 px-4 selection:bg-emerald-500/30 transition-colors duration-300">
            {/* Top Right Theme Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            {/* Ambient Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-to-b from-emerald-500/10 dark:from-eduGreen-950/20 via-slate-50 dark:via-zinc-950 to-transparent blur-[120px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,122,82,0.05),transparent_70%)]" />
            </div>

            <div className="max-w-7xl w-full z-10 flex flex-col items-center gap-16">
                {/* Header section with Premium typography */}
                <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-10 duration-300">
                    <div className="flex flex-col items-center gap-6">
                        <Logo className="w-16 h-16" />
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 backdrop-blur-xl text-[10px] font-bold text-emerald-600 dark:text-eduGreen-400 uppercase tracking-[0.3em] shadow-md dark:shadow-2xl">
                            <Cpu className="w-3.5 h-3.5 animate-pulse" />
                            <span>Initialize Protocol v2.6</span>
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-none text-slate-900 dark:text-white">
                        Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 dark:from-eduGreen-400 dark:via-eduGreen-500 dark:to-emerald-600">Interface</span>
                    </h1>

                    <p className="max-w-xl mx-auto text-slate-500 dark:text-zinc-500 font-medium text-lg leading-relaxed">
                        Select a role to enter the LUCY ecosystem. Your journey towards educational precision begins with a single selection.
                    </p>
                </div>

                {/* Role Cards - Holographic Approach */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl animate-in fade-in slide-in-from-bottom-12 duration-300 delay-200">
                    {roles.map((role, idx) => (
                        <Link
                            key={idx}
                            href={role.href}
                            className="group relative h-full"
                            onMouseEnter={() => setHoveredCard(idx)}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            {/* Card Glow Effect */}
                            <div className={cn(
                                "absolute -inset-0.5 bg-gradient-to-b opacity-0 group-hover:opacity-100 transition duration-300 blur-2xl rounded-[2.5rem]",
                                role.glow, "to-transparent"
                            )} />

                            <Card className={cn(
                                "relative h-full bg-white/90 dark:bg-zinc-900/30 backdrop-blur-2xl border-slate-200/80 dark:border-zinc-800 transition-all duration-300 rounded-[2.5rem] overflow-hidden p-8 flex flex-col items-center text-center shadow-lg dark:shadow-none",
                                "group-hover:border-emerald-500/40 group-hover:bg-white dark:group-hover:bg-zinc-200 dark:hover:bg-zinc-900/50 group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
                            )}>
                                {/* Holographic Scanline */}
                                <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(20,122,82,0.05)_50%,transparent_100%)] bg-[length:100%_4px] group-hover:animate-scan opacity-0 group-hover:opacity-100" />

                                {/* Top Tag */}
                                <div className="absolute top-4 right-8 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-700 group-hover:text-emerald-600 dark:group-hover:text-eduGreen-600 transition-colors">
                                    [ {role.tag} ]
                                </div>

                                {/* Icon Orbital */}
                                <div className={cn(
                                    "w-20 h-20 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-zinc-800 mb-8 relative transition-all duration-300 bg-slate-50 dark:bg-zinc-950 shadow-inner",
                                    "group-hover:scale-110 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_30px_rgba(20,122,82,0.2)]"
                                )}>
                                    <role.icon className={cn("h-8 w-8 transition-transform duration-300 group-hover:rotate-12", role.color)} />

                                    {/* Orbital Ring */}
                                    <div className="absolute inset-0 border border-transparent group-hover:border-emerald-500/20 rounded-2xl animate-spin-slow opacity-0 group-hover:opacity-100" />
                                </div>

                                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-eduGreen-400 transition-colors">{role.title}</CardTitle>

                                <p className="text-sm text-slate-500 dark:text-zinc-500 font-medium leading-relaxed flex-1 px-2 group-hover:text-slate-600 dark:group-hover:text-zinc-400 transition-colors">
                                    {role.desc}
                                </p>

                                <div className="mt-10 w-full py-4 px-6 rounded-2xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-600 dark:text-zinc-500 group-hover:text-white group-hover:bg-emerald-600 dark:group-hover:bg-eduGreen-600 group-hover:border-emerald-500 transition-all duration-300 flex items-center justify-center gap-3 uppercase tracking-widest shadow-md">
                                    Initialize <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Footer Link section */}
                <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-6 duration-300 delay-500">
                    <p className="text-sm text-slate-500 dark:text-zinc-500 font-medium font-outfit">
                        Already part of the ecosystem? <Link href="/login" className="text-emerald-600 dark:text-eduGreen-400 font-bold hover:text-emerald-500 dark:hover:text-eduGreen-300 transition-colors underline underline-offset-4 decoration-emerald-500/30 hover:decoration-emerald-500">System Log In</Link>
                    </p>

                    <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 py-8 px-12 rounded-[2rem] border border-slate-200 dark:border-zinc-900 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm text-[10px] font-bold text-slate-400 dark:text-zinc-600 tracking-[0.4em] uppercase shadow-inner">
                        <div className="flex items-center gap-2.5"><Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-eduGreen-900" /> Bio-Security</div>
                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-800 hidden sm:block" />
                        <div className="flex items-center gap-2.5"><Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-eduGreen-900" /> Global Node</div>
                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-800 hidden sm:block" />
                        <div className="flex items-center gap-2.5"><Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-eduGreen-900" /> Neural Edge</div>
                    </div>
                </div>
            </div>

            {/* Visual Decoration */}
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-eduGreen-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
        </div>
    );
}
