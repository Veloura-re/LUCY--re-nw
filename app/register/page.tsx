"use client";


import { Card, CardTitle } from "@/components/ui/card";
import { User, Shield, ArrowRight, GraduationCap, Lock, Sparkles, Building2, Globe, Cpu } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { motion } from "framer-motion";
import { InteractiveParticleSimulation } from "@/components/public/animations";

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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-zinc-950 font-sans text-slate-900 dark:text-white py-10 sm:py-20 px-4 selection:bg-emerald-500/30 transition-colors duration-300">
            <InteractiveParticleSimulation count={120} interactive={true} burstOnLoad={true} fullScreen={true} connectionDistance={145} showTriangles={true} />

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

            <div className="max-w-7xl w-full z-10 flex flex-col items-center gap-8 sm:gap-16">
                {/* Header section with Premium typography */}
                <div className="text-center space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-top-10 duration-300">
                    <div className="flex flex-col items-center gap-4 sm:gap-6">
                        <Logo className="w-12 h-12 sm:w-16 sm:h-16" />
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/80 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 backdrop-blur-xl text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-eduGreen-400 uppercase tracking-[0.3em] shadow-md dark:shadow-2xl">
                            <Cpu className="w-3 sm:w-3.5 h-3 sm:h-3.5 animate-pulse" />
                            <span>System Setup</span>
                        </div>
                    </div>

                    <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tighter leading-tight text-slate-900 dark:text-white">
                        Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 dark:from-eduGreen-400 dark:via-eduGreen-500 dark:to-emerald-600">Interface</span>
                    </h1>

                    <p className="max-w-xl mx-auto text-slate-500 dark:text-zinc-500 font-medium text-sm sm:text-lg leading-relaxed px-2">
                        Select a role to enter the LUCY ecosystem. Your journey begins with a single selection.
                    </p>
                </div>

                {/* Role Cards - Holographic Approach */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-7xl animate-in fade-in slide-in-from-bottom-12 duration-300 delay-200">
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
                                "absolute -inset-0.5 bg-gradient-to-b opacity-0 group-hover:opacity-100 transition duration-300 blur-2xl rounded-2xl sm:rounded-[2.5rem]",
                                role.glow, "to-transparent"
                            )} />

                            <Card className={cn(
                                "relative h-full bg-white/90 dark:bg-zinc-900/30 backdrop-blur-2xl border-slate-200/80 dark:border-zinc-800 transition-all duration-300 rounded-2xl sm:rounded-[2.5rem] overflow-hidden p-5 sm:p-8 flex flex-col items-center text-center shadow-lg dark:shadow-none",
                                "group-hover:border-emerald-500/40 group-hover:bg-white dark:group-hover:bg-zinc-200 dark:hover:bg-zinc-900/50 group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
                            )}>
                                {/* Holographic Scanline */}
                                <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(20,122,82,0.05)_50%,transparent_100%)] bg-[length:100%_4px] group-hover:animate-scan opacity-0 group-hover:opacity-100" />

                                {/* Top Tag */}
                                <div className="absolute top-4 right-6 sm:right-8 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-700 group-hover:text-emerald-600 dark:group-hover:text-eduGreen-600 transition-colors">
                                    [ {role.tag} ]
                                </div>

                                {/* Icon Orbital */}
                                <div className={cn(
                                    "w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center border border-slate-200 dark:border-zinc-800 mb-4 sm:mb-8 relative transition-all duration-300 bg-slate-50 dark:bg-zinc-950 shadow-inner",
                                    "group-hover:scale-110 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_30px_rgba(20,122,82,0.2)]"
                                )}>
                                    <role.icon className={cn("h-6 w-6 sm:h-8 sm:w-8 transition-transform duration-300 group-hover:rotate-12", role.color)} />

                                    {/* Orbital Ring */}
                                    <div className="absolute inset-0 border border-transparent group-hover:border-emerald-500/20 rounded-xl sm:rounded-2xl animate-spin-slow opacity-0 group-hover:opacity-100" />
                                </div>

                                <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-4 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-eduGreen-400 transition-colors">{role.title}</CardTitle>

                                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-500 font-medium leading-relaxed flex-1 px-1 sm:px-2 group-hover:text-slate-600 dark:group-hover:text-zinc-400 transition-colors">
                                    {role.desc}
                                </p>

                                <div className="mt-6 sm:mt-10 w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-zinc-500 group-hover:text-white group-hover:bg-emerald-600 dark:group-hover:bg-eduGreen-600 group-hover:border-emerald-500 transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 uppercase tracking-widest shadow-md">
                                    Get Started <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Footer Link section */}
                <div className="flex flex-col items-center gap-6 sm:gap-8 animate-in fade-in slide-in-from-bottom-6 duration-300 delay-500">
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-500 font-medium font-outfit">
                        Already part of the ecosystem? <Link href="/login" className="text-emerald-600 dark:text-eduGreen-400 font-bold hover:text-emerald-500 dark:hover:text-eduGreen-300 transition-colors underline underline-offset-4 decoration-emerald-500/30 hover:decoration-emerald-500">Log In</Link>
                    </p>

                    <div className="flex flex-wrap justify-center items-center gap-x-6 sm:gap-x-10 gap-y-3 py-4 sm:py-8 px-6 sm:px-12 rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-zinc-900 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-zinc-600 tracking-[0.3em] sm:tracking-[0.4em] uppercase shadow-inner">
                        <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-eduGreen-900" /> Global Platform</div>
                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-800 hidden sm:block" />
                        <div className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-eduGreen-900" /> Smart Cloud</div>
                    </div>
                </div>
            </div>

            {/* Visual Decoration */}
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-eduGreen-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

            {/* Breathtaking 4-Month Trial Popup */}
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 100, damping: 20 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            >
                <div className="relative group cursor-pointer pointer-events-auto overflow-hidden rounded-full p-[1px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-eduGreen-500 animate-[spin_4s_linear_infinite] opacity-70 group-hover:opacity-100" />
                    <div className="relative flex items-center gap-4 bg-slate-50 dark:bg-zinc-950 px-8 py-4 rounded-full border border-transparent group-hover:bg-white dark:group-hover:bg-zinc-900 transition-colors shadow-2xl">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-emerald-500/20 animate-pulse" />
                            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-eduGreen-400 relative z-10" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                4-Month Unrestricted Trial <span className="flex h-2 w-2 rounded-full bg-emerald-500 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span></span>
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest font-medium mt-0.5">
                                Included with all new school accounts
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
