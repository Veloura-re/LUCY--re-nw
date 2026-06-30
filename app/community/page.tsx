"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Terminal, Send, Youtube, Mail, Video, Instagram } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { ScanLines, CustomCursor, AnimatedGrid, PageFooter, MatrixRain, TiltCard } from "@/components/public/animations";

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

export default function CommunityPage() {
    const socialNodes = [
        {
            title: "telegram_node",
            link: "https://t.me/+ElIFqzvGBlYzMDBk",
            icon: Send,
            glowClass: "shadow-[0_0_30px_rgba(56,189,248,0.06)] hover:shadow-[0_0_50px_rgba(56,189,248,0.2)] hover:border-sky-500/40",
            iconColor: "text-sky-400",
            label: "telegram"
        },
        {
            title: "discord_node",
            link: "https://discord.gg/Kbm4XhzfMJ",
            icon: DiscordIcon,
            glowClass: "shadow-[0_0_30px_rgba(99,102,241,0.06)] hover:shadow-[0_0_50px_rgba(99,102,241,0.2)] hover:border-indigo-500/40",
            iconColor: "text-indigo-400",
            label: "discord",
            isCustomSvg: true
        },
        {
            title: "youtube_channel",
            link: "https://www.youtube.com/@LucyAcademics",
            icon: Youtube,
            glowClass: "shadow-[0_0_30px_rgba(239,68,68,0.06)] hover:shadow-[0_0_50px_rgba(239,68,68,0.2)] hover:border-red-500/40",
            iconColor: "text-red-500",
            label: "youtube"
        },
        {
            title: "tiktok_node",
            link: "https://tiktok.com/@lucy.academia",
            icon: Video,
            glowClass: "shadow-[0_0_30px_rgba(6,182,212,0.06)] hover:shadow-[0_0_50px_rgba(236,72,153,0.2)] hover:border-pink-500/40",
            iconColor: "text-cyan-400 group-hover:text-pink-400",
            label: "tiktok"
        },
        {
            title: "instagram_node",
            link: "https://www.instagram.com/lucy_devs/",
            icon: Instagram,
            glowClass: "shadow-[0_0_30px_rgba(236,72,153,0.06)] hover:shadow-[0_0_50px_rgba(245,158,11,0.2)] hover:border-orange-500/40",
            iconColor: "text-pink-500",
            label: "instagram"
        },
        {
            title: "x_node",
            link: "https://x.com/GoodLuckfus",
            icon: XIcon,
            glowClass: "shadow-[0_0_30px_rgba(255,255,255,0.02)] hover:shadow-[0_0_50px_rgba(255,255,255,0.12)] hover:border-white/30",
            iconColor: "text-white",
            label: "x",
            isCustomSvg: true
        },
        {
            title: "direct_transmission",
            link: "/contact",
            icon: Mail,
            glowClass: "shadow-[0_0_30px_rgba(16,185,129,0.06)] hover:shadow-[0_0_50px_rgba(16,185,129,0.2)] hover:border-emerald-500/40",
            iconColor: "text-emerald-400",
            label: "contact",
            external: false
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono lowercase tracking-tight overflow-x-hidden relative">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />
            
            {/* Background Matrix Rain */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                <MatrixRain cols={18} />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_os</span>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group">
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
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 bg-zinc-950/60 text-[10px] text-zinc-500 uppercase tracking-widest">
                            <Terminal className="w-3.5 h-3.5" /> network_matrix // connect
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter text-white leading-none">
                            community <span className="text-zinc-800">uplinks.</span>
                        </h1>
                        <p className="text-sm text-zinc-500 max-w-md mx-auto lowercase leading-relaxed">
                            tap any node to establish a secure uplink to the lucy academics grid.
                        </p>
                    </motion.div>

                    {/* Nodes 3D Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-3xl mx-auto justify-center">
                        {socialNodes.map((node, i) => {
                            const Icon = node.icon;
                            return (
                                <motion.div
                                    key={node.title}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05, type: "spring", stiffness: 100 }}
                                    className="flex justify-center"
                                >
                                    <Link 
                                        href={node.link} 
                                        target={node.external !== false ? "_blank" : undefined} 
                                        rel={node.external !== false ? "noopener noreferrer" : undefined}
                                        className="w-full max-w-[150px]"
                                    >
                                        <TiltCard className={`w-full aspect-square rounded-3xl border border-white/10 bg-zinc-950/40 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all duration-300 ${node.glowClass}`}>
                                            {/* 3D Transform Wrapper */}
                                            <div 
                                                className="flex flex-col items-center justify-center w-full h-full p-4 select-none" 
                                                style={{ transformStyle: "preserve-3d" }}
                                            >
                                                {/* Floating Icon */}
                                                <div 
                                                    className={`transition-all duration-300 ${node.iconColor} group-hover:scale-110`}
                                                    style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
                                                >
                                                    {node.isCustomSvg ? (
                                                        <Icon className="w-10 h-10" />
                                                    ) : (
                                                        // @ts-ignore
                                                        <Icon className="w-10 h-10 stroke-[1.5]" />
                                                    )}
                                                </div>
                                                
                                                {/* Label under icon */}
                                                <span 
                                                    className="text-[9px] uppercase tracking-widest text-zinc-600 group-hover:text-zinc-300 transition-colors mt-4 select-none"
                                                    style={{ transform: "translateZ(15px)" }}
                                                >
                                                    [{node.label}]
                                                </span>
                                            </div>

                                            {/* Spotlight hover effect */}
                                            <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        </TiltCard>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </main>

            <PageFooter id="COMMUNITY_NODES" links={[{ href: "/docs", label: "docs" }, { href: "/support", label: "support" }, { href: "/contact", label: "uplink" }]} />
        </div>
    );
}
