"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Terminal, MessageSquare, Send, Youtube, Mail, ExternalLink, Video } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, MatrixRain, TiltCard } from "@/components/public/animations";

export default function CommunityPage() {
    const socialNodes = [
        {
            title: "telegram_node",
            desc: "official lucy academics community chat supergroup with dedicated forum topics.",
            link: "https://t.me/+ElIFqzvGBlYzMDBk",
            btnLabel: "join_telegram",
            icon: Send,
            color: "from-zinc-950 to-zinc-900",
            borderColor: "border-white/10"
        },
        {
            title: "discord_node",
            desc: "official lucy academics community server for voice chats, announcements, and roles.",
            link: "https://discord.gg/Kbm4XhzfMJ",
            btnLabel: "join_discord",
            icon: MessageSquare,
            color: "from-zinc-950 to-zinc-900",
            borderColor: "border-white/10"
        },
        {
            title: "youtube_channel",
            desc: "official youtube channel featuring system walk-throughs, updates, and documentation.",
            link: "https://www.youtube.com/@LucyAcademics",
            btnLabel: "youtube_channel",
            icon: Youtube,
            color: "from-zinc-950 to-zinc-900",
            borderColor: "border-white/10"
        },
        {
            title: "tiktok_node",
            desc: "official lucy academics tiktok for short-form feature reveals, devlogs, and platform tutorials.",
            link: "https://tiktok.com/@lucy.academia",
            btnLabel: "follow_tiktok",
            icon: Video,
            color: "from-zinc-950 to-zinc-900",
            borderColor: "border-white/10"
        },
        {
            title: "direct_transmission",
            desc: "standard support tickets, vulnerability disclosures, and press office contacts.",
            link: "/contact",
            btnLabel: "contact_form",
            icon: Mail,
            color: "from-zinc-950 to-zinc-900",
            borderColor: "border-white/10",
            external: false
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono lowercase tracking-tight overflow-x-hidden relative">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />
            
            {/* Background Matrix Rain */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <MatrixRain cols={18} />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-md px-6 py-4">
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

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-4xl mx-auto space-y-16">
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
                        <p className="text-lg text-zinc-500 max-w-xl mx-auto lowercase leading-relaxed">
                            access official decentralised nodes, support channels, and video guidelines for lucy os.
                        </p>
                    </motion.div>

                    {/* Nodes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {socialNodes.map((node, i) => {
                            const Icon = node.icon;
                            return (
                                <motion.div
                                    key={node.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="w-full h-full"
                                >
                                    <TiltCard className={`p-8 border ${node.borderColor} bg-gradient-to-br ${node.color} backdrop-blur-sm flex flex-col justify-between h-[260px] relative overflow-hidden group cursor-pointer`}>
                                        {/* Scanbar animation */}
                                        <div className="absolute top-0 left-0 right-0 h-px bg-white/20 -translate-y-full group-hover:translate-y-[260px] transition-all duration-1000 ease-in-out" />
                                        
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between text-zinc-500">
                                                <div className="flex items-center gap-2.5">
                                                    <Icon className="w-5 h-5 text-white" />
                                                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                        active_node
                                                    </span>
                                                </div>
                                                {node.external !== false && <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />}
                                            </div>
                                            <h3 className="font-bold text-white uppercase text-lg">{node.title}</h3>
                                            <p className="text-xs text-zinc-400 leading-relaxed font-mono">{node.desc}</p>
                                        </div>

                                        <Link href={node.link} target={node.external !== false ? "_blank" : undefined} rel={node.external !== false ? "noopener noreferrer" : undefined} className="block w-full">
                                            <Button variant="ghost" className="w-full text-[10px] uppercase tracking-widest text-zinc-300 hover:text-black hover:bg-white border border-white/10 hover:border-white transition-all rounded-none mt-4 py-5 font-bold">
                                                {node.btnLabel}
                                            </Button>
                                        </Link>
                                    </TiltCard>
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
