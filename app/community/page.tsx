"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Terminal, Send, Youtube, Mail, Video, Instagram } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { ScanLines, CustomCursor, AnimatedGrid, PageFooter, MatrixRain, TiltCard } from "@/components/public/animations";
import { useState } from "react";
import { cn } from "@/lib/utils";

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 127.14 96.36" fill="currentColor" {...props}>
        <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.45-5c.87-.64,1.71-1.32,2.51-2a75.49,75.49,0,0,0,93.08,0c.8.71,1.64,1.39,2.51,2a68.43,68.43,0,0,1-10.45,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.07,54.65,123.55,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
    </svg>
);

interface SocialNode {
    title: string;
    link: string;
    icon: any;
    glowClass: string;
    hoverBorder: string;
    iconColor: string;
    label: string;
    desc: string;
    isCustomSvg?: boolean;
    external?: boolean;
}

export default function CommunityPage() {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const socialNodes: SocialNode[] = [
        {
            title: "telegram_node",
            link: "https://t.me/+ElIFqzvGBlYzMDBk",
            icon: Send,
            glowClass: "shadow-[0_0_30px_rgba(56,189,248,0.04)] hover:shadow-[0_0_50px_rgba(56,189,248,0.25)]",
            hoverBorder: "hover:border-sky-500/40",
            iconColor: "text-sky-500 dark:text-sky-400",
            label: "telegram",
            desc: "join the global community discussion, announcements, and live support group."
        },
        {
            title: "discord_node",
            link: "https://discord.gg/Kbm4XhzfMJ",
            icon: DiscordIcon,
            glowClass: "shadow-[0_0_30px_rgba(99,102,241,0.04)] hover:shadow-[0_0_50px_rgba(99,102,241,0.25)]",
            hoverBorder: "hover:border-indigo-500/40",
            iconColor: "text-indigo-500 dark:text-indigo-400",
            label: "discord",
            isCustomSvg: true,
            desc: "chat with developers, get system roles, join voice channels, and request custom features."
        },
        {
            title: "youtube_channel",
            link: "https://www.youtube.com/@LucyAcademics",
            icon: Youtube,
            glowClass: "shadow-[0_0_30px_rgba(239,68,68,0.04)] hover:shadow-[0_0_50px_rgba(239,68,68,0.25)]",
            hoverBorder: "hover:border-red-500/40",
            iconColor: "text-red-600 dark:text-red-500",
            label: "youtube",
            desc: "watch system walk-throughs, updates, features, and platform setup guidelines."
        },
        {
            title: "tiktok_node",
            link: "https://tiktok.com/@lucy.os",
            icon: Video,
            glowClass: "shadow-[0_0_30px_rgba(6,182,212,0.04)] hover:shadow-[0_0_50px_rgba(236,72,153,0.25)]",
            hoverBorder: "hover:border-pink-500/40",
            iconColor: "text-cyan-500 dark:text-cyan-400 group-hover:text-pink-500 dark:group-hover:text-pink-400",
            label: "tiktok",
            desc: "explore short-form feature reveals, dev logs, UI animations, and platform sneak peeks."
        },
        {
            title: "instagram_node",
            link: "https://www.instagram.com/lucy_devs/",
            icon: Instagram,
            glowClass: "shadow-[0_0_30px_rgba(236,72,153,0.04)] hover:shadow-[0_0_50px_rgba(245,158,11,0.25)]",
            hoverBorder: "hover:border-orange-500/40",
            iconColor: "text-pink-500",
            label: "instagram",
            desc: "view clean UI previews, visual design assets, mockups, and layout updates."
        },
        {
            title: "x_node",
            link: "https://x.com/GoodLuckfus",
            icon: XIcon,
            glowClass: "shadow-[0_0_30px_rgba(0,0,0,0.05)] hover:shadow-[0_0_50px_rgba(0,0,0,0.15)] dark:shadow-[0_0_30px_rgba(255,255,255,0.02)] dark:hover:shadow-[0_0_50px_rgba(255,255,255,0.15)]",
            hoverBorder: "hover:border-slate-400 dark:hover:border-white/30",
            iconColor: "text-slate-900 dark:text-white",
            label: "x",
            isCustomSvg: true,
            desc: "follow live dev updates, quick changelogs, build notifications, and technical alerts."
        },
        {
            title: "direct_transmission",
            link: "/contact",
            icon: Mail,
            glowClass: "shadow-[0_0_30px_rgba(16,185,129,0.04)] hover:shadow-[0_0_50px_rgba(16,185,129,0.25)]",
            hoverBorder: "hover:border-emerald-500/40",
            iconColor: "text-emerald-500 dark:text-emerald-400",
            label: "contact",
            external: false,
            desc: "open support tickets, report system issues, submit security disclosures, or contact press."
        }
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-zinc-900 dark:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight overflow-x-hidden relative transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />
            
            {/* Background Matrix Rain */}
            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-10 pointer-events-none">
                <MatrixRain cols={18} />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/80 backdrop-blur-md px-6 py-4 transition-colors">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">lucy_os</span>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group">
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            return_to_main
                        </Button>
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 pt-36 pb-40 px-6 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
                <div className="max-w-4xl w-full mx-auto space-y-16">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-bold rounded-md dark:rounded-none shadow-sm dark:shadow-none">
                            <Terminal className="w-3.5 h-3.5" /> network_matrix // connect
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                            community <span className="text-slate-400 dark:text-zinc-800">uplinks.</span>
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-zinc-500 max-w-md mx-auto lowercase leading-relaxed">
                            tap any node to establish a secure uplink to the lucy academics grid.
                        </p>
                    </motion.div>

                    {/* Nodes 3D Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-3xl mx-auto justify-center">
                        {socialNodes.map((node, i) => (
                            <motion.div
                                key={node.title}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05, type: "spring", stiffness: 100 }}
                                className={cn("flex justify-center transition-all duration-300", hoveredIndex === i ? "z-50 relative" : "z-0 relative")}
                            >
                                <Link 
                                    href={node.link} 
                                    target={node.external !== false ? "_blank" : undefined} 
                                    rel={node.external !== false ? "noopener noreferrer" : undefined}
                                    className="w-full max-w-[150px]"
                                    onMouseEnter={() => setHoveredIndex(i)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                >
                                    <CommunityNodeCard node={node} hovered={hoveredIndex === i} />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <PageFooter id="COMMUNITY_NODES" links={[{ href: "/docs", label: "docs" }, { href: "/support", label: "support" }, { href: "/contact", label: "uplink" }]} />
        </div>
    );
}

function CommunityNodeCard({ node, hovered }: { node: SocialNode; hovered: boolean }) {
    const Icon = node.icon;

    return (
        <TiltCard 
            className={cn(
                "w-full aspect-square rounded-3xl border bg-white/80 dark:bg-zinc-950/40 backdrop-blur-md flex flex-col items-center justify-center relative group cursor-pointer transition-all duration-500 shadow-sm dark:shadow-none",
                hovered ? node.hoverBorder : "border-slate-200 dark:border-white/10",
                node.glowClass
            )}
        >
            <div 
                className="flex flex-col items-center justify-center w-full h-full p-4 select-none relative" 
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* 3D Parallax Container */}
                <motion.div 
                    animate={{ 
                        z: hovered ? 40 : 0,
                        scale: hovered ? 1.2 : 1,
                        y: hovered ? -18 : 0
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className={cn("flex flex-col items-center justify-center transition-colors duration-300", node.iconColor)}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {node.isCustomSvg ? (
                        <Icon className="w-10 h-10" />
                    ) : (
                        // @ts-ignore
                        <Icon className="w-10 h-10 stroke-[1.5]" />
                    )}
                </motion.div>

                {/* Parallax Tag Label */}
                <motion.span 
                    animate={{ 
                        z: hovered ? 20 : 0,
                        y: hovered ? -10 : 0,
                        opacity: hovered ? 0.2 : 1
                    }}
                    className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-zinc-600 mt-4 font-mono select-none font-bold"
                    style={{ transform: "translateZ(15px)" }}
                >
                    [{node.label}]
                </motion.span>

                {/* Animated Description Overlay — Magnifies and shows what we do there in a bended floating style */}
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10, rotateX: 25 }}
                            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 12 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10, rotateX: 25 }}
                            transition={{ type: "spring", stiffness: 220, damping: 18 }}
                            className="absolute top-[105%] left-1/2 -translate-x-1/2 w-[220px] text-center bg-white/95 dark:bg-black/95 border border-slate-200 dark:border-white/15 p-3 rounded-2xl pointer-events-none shadow-[0_15px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-50"
                            style={{ transformStyle: "preserve-3d", transform: "translateZ(70px)" }}
                        >
                            {/* Little triangle tail */}
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-black border-l border-t border-slate-200 dark:border-white/15 rotate-45" />
                            
                            <p className="text-[10px] font-mono leading-normal text-slate-600 dark:text-zinc-300 tracking-tight lowercase font-medium">
                                {node.desc}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Spotlight hover effect */}
            <div className="absolute inset-0 bg-radial-gradient from-slate-900/5 dark:from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </TiltCard>
    );
}
