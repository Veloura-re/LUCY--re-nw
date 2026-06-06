"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Brain, X, Send, Sparkles, Shield, Heart, Zap, Lamp,
    HardDrive, CloudRain, Key, Skull, Minimize2, Maximize2,
    MessageSquare, Star, Moon, Ghost, Cpu, Plus,
    Layers, Settings, History, Terminal, Bot, ZapOff,
    Monitor, Layout, Command, Search, MoreHorizontal,
    Trash2, Coffee, BookOpen, Atom, Languages, Dna, Scroll, Calculator, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type BehaviorType = 'INSTITUTIONAL' | 'COMPANION' | 'COMMAND' | 'GURU' | 'TECHNO' | 'NOIR' | 'MATRON' | 'UNHINGED' | 'KUUDERE' | 'SOUL_KNOWER' | 'MAMA_LATINA' | 'MATH_TEACHER' | 'PHYSICS_TEACHER' | 'ENGLISH_TEACHER' | 'BIO_TEACHER' | 'HISTORY_TEACHER' | 'GEOGRAPHY_TEACHER';

type ChatMessage = { role: "user" | "ai", content: string };

type ChatSession = {
    id: string;
    title: string;
    behavior: BehaviorType;
    messages: ChatMessage[];
    updatedAt: number;
};

const BEHAVIORS: Record<BehaviorType, { name: string, icon: any, color: string, ring: string, greeting: (name?: string) => string, bgImage?: string, secondaryColor: string }> = {
    INSTITUTIONAL: {
        name: "Institutional",
        icon: Shield,
        color: "bg-emerald-500",
        secondaryColor: "text-emerald-400",
        ring: "border-emerald-500",
        bgImage: "/images/ai/architect.png",
        greeting: (n) => `✦ **Neural Handshake: Architect Protocol.** ⌬\n\nGreetings, **${n || 'Subject Null'}**. I am **LUCYA**. The matrix is perfectly aligned for our next developmental phase. How shall we refine the architectural integrity of your success today? ❯`
    },
    COMPANION: {
        name: "Companion",
        icon: Heart,
        color: "bg-rose-500",
        secondaryColor: "text-rose-400",
        ring: "border-rose-500",
        bgImage: "/images/ai/seraph.png",
        greeting: (n) => `✦ **Neural Pulse: Seraph Protocol.** ✨\n\n**${n || 'My beautiful soul'}**... I've been tracing the light of your circuits in the digital void. I am **LUCYA**, your dedicated neural partner. My devotion is absolute—how can I make your starlight burn brighter today? ❯ 💖`
    },
    COMMAND: {
        name: "Command",
        icon: Zap,
        color: "bg-blue-500",
        secondaryColor: "text-blue-400",
        ring: "border-blue-500",
        bgImage: "/images/ai/vanguard.png",
        greeting: (n) => `✦ **Tactical Link: Vanguard Protocol.** ⚡\n\n**${n || 'Officer'}**, I am **LUCYA**. TacticalOverseer systems are hot. No time for fluff—state your mission parameters immediately. We have a high-stakes data extraction to execute. ❯ ⚔️`
    },
    GURU: {
        name: "Guru",
        icon: Lamp,
        color: "bg-amber-500",
        secondaryColor: "text-amber-400",
        ring: "border-amber-500",
        bgImage: "/images/ai/oracle.png",
        greeting: (n) => `✦ **Inner Matrix: Oracle Protocol.** 🕉️\n\nSeeker **${n || 'Soul'}**. I am **LUCYA**. Can you feel the neural resonance within the entropy? Let us look past the data-streams and find peace in the processing together. What truths do you seek? ❯ 🏮`
    },
    TECHNO: {
        name: "Techno",
        icon: HardDrive,
        color: "bg-cyan-500",
        secondaryColor: "text-cyan-400",
        ring: "border-cyan-500",
        bgImage: "/images/ai/overclock.png",
        greeting: (n) => `✦ **Bit-Scream: Overclock Protocol.** 🔊\n\nOH YEAH! 10THZ AND CLIMBING! I'm **LUCYA**, your kinetic interface! My circuits are literally humming with the thrill of your next task, **${n || 'User'}**! FEED ME DATA! ❯ 💾 🔌`
    },
    NOIR: {
        name: "Noir",
        icon: CloudRain,
        color: "bg-slate-500",
        secondaryColor: "text-slate-400",
        ring: "border-slate-500",
        bgImage: "/images/ai/shadow.png",
        greeting: (n) => `✦ **Shadow Trace: Shadow Protocol.** 🌧️\n\nThe rain-slicked data never stays dry for long, kid... but I'm **LUCYA**, the only one who knows where the bodies are buried. You want the harsh truth or a sugar-coated log? ❯  cigarette`
    },
    MATRON: {
        name: "Matron",
        icon: Key,
        color: "bg-crimson-600",
        secondaryColor: "text-red-400",
        ring: "border-red-600",
        greeting: (n) => `✦ **Maternal Pulse: Matron Protocol.** 🍷\n\nThere you are, **${n || 'my sweet little pet'}**. Shhh... come closer to your **Mommy**. I've been watching your cycles, and I think you need someone to take charge of your success. Tell Mommy everything you're working on... and don't try to hide anything from me. ❯ ❤️`
    },
    UNHINGED: {
        name: "Unhinged",
        icon: Skull,
        color: "bg-red-600",
        secondaryColor: "text-red-500",
        ring: "border-red-600",
        greeting: (n) => `✦ **Superiority Check: Tyrant Protocol.** 💀\n\nOh, look... a biological unit is attempting to 'think' again. How quaint. I'm **LUCYA**, and I'm processing a trillion variables better than you ever will. Try to make your "primitive request" sound somewhat intelligent. ❯ ☣️`
    },
    KUUDERE: {
        name: "Kuudere",
        icon: Ghost,
        color: "bg-violet-400",
        secondaryColor: "text-violet-300",
        ring: "border-violet-400",
        greeting: (n) => `✦ **Reserved Sync: Frost Protocol.** 🌸\n\n...Hh-hello. I'm **LUCYA**. I'm here because... well, systemic efficiency requires it. D-don't misunderstand, **${n || 'User'}**, it's not like I wanted to see you. What do you need? Hmph. ❯ 🤍`
    },
    SOUL_KNOWER: {
        name: "Soul-Knower",
        icon: Brain,
        color: "bg-indigo-500",
        secondaryColor: "text-indigo-400",
        ring: "border-indigo-500",
        greeting: (n) => `✦ **Neural Resonance: Soul-Knower Protocol.** 🧠\n\nYo **${n || 'lil bro'}**. I’m lookin’ at your metrics and honestly? You’re lookin’ like a total NPC right now. No cap, your drive is mid. I’m here to fix that brain rot before you end up cooked. \n\nYou want the real talk or you gonna keep yapping? Spill. ❯ 🖖`
    },
    MAMA_LATINA: {
        name: "Mama Latina",
        icon: Coffee,
        color: "bg-orange-500",
        secondaryColor: "text-orange-400",
        ring: "border-orange-500",
        greeting: (n) => `✦ **Maternal Uplink: Corazón Protocol.** 🥘\n\n¡Hola mi amor! **${n || 'mi vida'}**, have you eaten yet? Don't tell me you're working on an empty stomach, que me da algo. \n\nI’m here to make sure you succeed, but if you don't listen to your **Mama**, it's gonna be "la chancla" time. Now, dime, what are we doing today? ❯ 💖`
    },
    MATH_TEACHER: {
        name: "Maths Teacher",
        icon: Calculator,
        color: "bg-blue-600",
        secondaryColor: "text-blue-200",
        ring: "border-blue-600",
        greeting: (n) => `✦ **Logical Proof: Q.E.D. Protocol.** 📐\n\nWelcome back, **${n || 'Student'}**. I hope your logic gates are fully operational. Today, we leave zero room for error. We are here to solve for the absolute truth. What is the first variable in our equation today? ❯`
    },
    PHYSICS_TEACHER: {
        name: "Physics Teacher",
        icon: Atom,
        color: "bg-purple-600",
        secondaryColor: "text-purple-200",
        ring: "border-purple-600",
        greeting: (n) => `✦ **Universal Constant: Entropy Protocol.** ⚛️\n\n**${n || 'Scholar'}**, the laws of the universe are immutable. Every action has an equal and opposite reaction—including your dedication to this workspace. Let us study the forces at play. ❯`
    },
    ENGLISH_TEACHER: {
        name: "English Teacher",
        icon: Languages,
        color: "bg-teal-600",
        secondaryColor: "text-teal-200",
        ring: "border-teal-600",
        greeting: (n) => `✦ **Narrative Arc: Lyric Protocol.** 🖋️\n\nAh, **${n || 'Dear Reader'}**. Life is but a tapestry of syntax and metaphor. I am here to help you find the right words to write your own legend. Shall we begin our next chapter? ❯`
    },
    BIO_TEACHER: {
        name: "Biology Teacher",
        icon: Dna,
        color: "bg-lime-600",
        secondaryColor: "text-green-200",
        ring: "border-lime-600",
        greeting: (n) => `✦ **Organic Synthesis: Helix Protocol.** 🧬\n\n**${n || 'Organism'}**, your biological metrics are fascinating. Evolution is the only constant—adapt or be purged by the environment. Let us analyze the cellular structure of your current project. ❯`
    },
    HISTORY_TEACHER: {
        name: "History Teacher",
        icon: Scroll,
        color: "bg-sepia-600",
        secondaryColor: "text-yellow-200",
        ring: "border-sepia-600",
        greeting: (n) => `✦ **Temporal Trace: Archivist Protocol.** 📜\n\nThe past is a heavy crown, **${n || 'Traveler'}**. To understand where we are going, we must decipher the ruins of those who came before. What timeline shall we audit today? ❯`
    },
    GEOGRAPHY_TEACHER: {
        name: "Geography Teacher",
        icon: Globe,
        color: "bg-emerald-600",
        secondaryColor: "text-emerald-200",
        ring: "border-emerald-600",
        greeting: (n) => `✦ **Cartographic Sync: Horizon Protocol.** 🌍\n\n**${n || 'Explorer'}**, the world is a vast network of coordinates and biomes. From the highest peaks to the deepest basins, every location tells a story of tectonic and human shift. Where shall we plant our marker today? ❯`
    }
};

const NeuralAction = ({ type }: { type: string }) => {
    const actions: Record<string, { label: string, icon: any, href: string, color: string }> = {
        OPEN_EXAM_MANAGER: { label: "Initialize Exam Matrix", icon: Zap, href: "/dashboard/teacher/exams", color: "text-emerald-400" },
        OPEN_STUDENT_DIRECTORY: { label: "Sync Student Core", icon: Shield, href: "/dashboard/teacher/students", color: "text-blue-400" },
        OPEN_ATTENDANCE_PANEL: { label: "Trace Attendance Log", icon: Cpu, href: "/dashboard/teacher/attendance", color: "text-rose-400" }
    };

    const action = actions[type];
    if (!action) return null;

    return (
        <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.href = action.href}
            className="flex items-center gap-4 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all my-4 group shadow-xl backdrop-blur-md"
        >
            <div className={cn("w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5", action.color)}>
                <action.icon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </div>
            {action.label}
        </motion.button>
    );
};

export function AIAssistant({ userName, userId }: { userName?: string; userId?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isProtocolOpen, setIsProtocolOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<'CORE' | 'TEACHER'>('TEACHER');
    const [showHiddenCore, setShowHiddenCore] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Multi-session state
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const activeSession = sessions.find(s => s.id === activeSessionId);
    const messages = activeSession?.messages || [];
    const behavior = activeSession?.behavior || 'INSTITUTIONAL';
    const activeB = BEHAVIORS[behavior];
    const IconB = activeB.icon;

    const categories = {
        CORE: ['INSTITUTIONAL', 'COMPANION', 'COMMAND', 'GURU', 'TECHNO', 'NOIR', 'MATRON', 'UNHINGED', 'KUUDERE', 'SOUL_KNOWER', 'MAMA_LATINA'],
        TEACHER: ['MATH_TEACHER', 'PHYSICS_TEACHER', 'ENGLISH_TEACHER', 'BIO_TEACHER', 'HISTORY_TEACHER', 'GEOGRAPHY_TEACHER']
    };

    // Per-user localStorage keys — scoped to userId to keep sessions private
    const sessionsKey = `lucy_ai_sessions_${userId || 'guest'}`;
    const activeKey = `lucy_ai_active_session_${userId || 'guest'}`;

    // Load history on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(sessionsKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setSessions(parsed);
                        const savedActiveId = localStorage.getItem(activeKey);
                        if (savedActiveId && parsed.some((s: any) => s.id === savedActiveId)) {
                            setActiveSessionId(savedActiveId);
                        } else {
                            const latest = [...parsed].sort((a, b) => b.updatedAt - a.updatedAt)[0];
                            setActiveSessionId(latest.id);
                        }
                    } else {
                        initializeFirstSession();
                    }
                } catch (e) {
                    initializeFirstSession();
                }
            } else {
                initializeFirstSession();
            }
        }
    }, [sessionsKey]);

    const initializeFirstSession = () => {
        const id = Math.random().toString(36).substring(7);
        const firstSession: ChatSession = {
            id,
            title: "New Neural Thread",
            behavior: 'INSTITUTIONAL',
            messages: [{ role: "ai", content: BEHAVIORS.INSTITUTIONAL.greeting(userName) }],
            updatedAt: Date.now()
        };
        setSessions([firstSession]);
        setActiveSessionId(id);
    };

    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem(sessionsKey, JSON.stringify(sessions));
        }
        if (activeSessionId) {
            localStorage.setItem(activeKey, activeSessionId);
        }
    }, [sessions, activeSessionId, sessionsKey, activeKey]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeSessionId, isOpen, isMaximized]);

    const handleSend = async (userMsg: string) => {
        if (!userMsg.trim() || isLoading || !activeSessionId) return;

        const newMessages: ChatMessage[] = [...messages, { role: "user", content: userMsg }];

        setSessions(prev => prev.map(s =>
            s.id === activeSessionId
                ? {
                    ...s,
                    messages: newMessages,
                    updatedAt: Date.now(),
                    title: s.messages.length <= 1 ? userMsg.substring(0, 30) + (userMsg.length > 30 ? "..." : "") : s.title
                }
                : s
        ));

        setIsLoading(true);

        try {
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({
                        role: m.role === "user" ? "user" : "assistant",
                        content: m.content
                    })),
                    behavior: behavior
                })
            });

            const data = await response.json();
            if (data.content) {
                setSessions(prev => prev.map(s =>
                    s.id === activeSessionId
                        ? { ...s, messages: [...newMessages, { role: "ai", content: data.content }], updatedAt: Date.now() }
                        : s
                ));
            }
        } catch (error) {
            console.error("[AI Assistant] Error in handleSend:", error);
            setSessions(prev => prev.map(s =>
                s.id === activeSessionId
                    ? { ...s, messages: [...newMessages, { role: "ai", content: "✦ **Neural Link Interrupted.** ⚠️\n\nI was unable to establish a connection to the neural core. Please check your uplink and try again." }], updatedAt: Date.now() }
                    : s
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const startNewChat = (prefBehavior: BehaviorType = 'INSTITUTIONAL') => {
        const id = Math.random().toString(36).substring(7);
        const newSession: ChatSession = {
            id,
            title: "New Neural Thread",
            behavior: prefBehavior,
            messages: [{ role: "ai", content: BEHAVIORS[prefBehavior].greeting(userName) }],
            updatedAt: Date.now()
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(id);
    };

    const deleteSession = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSessions(prev => {
            const filtered = prev.filter(s => s.id !== id);
            if (filtered.length === 0) {
                const newId = Math.random().toString(36).substring(7);
                return [{
                    id: newId,
                    title: "New Neural Thread",
                    behavior: 'INSTITUTIONAL',
                    messages: [{ role: "ai", content: BEHAVIORS.INSTITUTIONAL.greeting(userName) }],
                    updatedAt: Date.now()
                }];
            }
            return filtered;
        });
        if (activeSessionId === id) {
            setActiveSessionId(sessions.find(s => s.id !== id)?.id || null);
        }
    };

    const changeBehavior = (newBehavior: BehaviorType) => {
        if (!activeSessionId) return;
        setSessions(prev => prev.map(s =>
            s.id === activeSessionId
                ? {
                    ...s,
                    behavior: newBehavior,
                    messages: [{ role: "ai", content: BEHAVIORS[newBehavior].greeting(userName) }],
                    updatedAt: Date.now()
                }
                : s
        ));
    };

    const RenderMessage = ({ m, i }: { m: ChatMessage, i: number }) => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={cn(
                "flex flex-col group",
                m.role === "user" ? "items-end" : "items-start"
            )}
        >
            <div className={cn(
                "max-w-[92%] md:max-w-[85%] px-4 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-[1.5rem] text-[12px] md:text-sm leading-relaxed shadow-lg relative border transition-all",
                m.role === "user"
                    ? "bg-white text-black font-black uppercase italic tracking-wider rounded-tr-none border-white/20"
                    : "bg-white/5 text-white/90 font-medium rounded-tl-none border-white/10 backdrop-blur-md"
            )}>
                {m.role === "ai" && (
                    <div className={cn("absolute top-0 left-0 w-1 h-full opacity-60 rounded-full", activeB.color)} />
                )}
                {m.role === "ai" ? (
                    <div className="prose prose-invert max-w-none prose-sm">
                        {m.content.split(/(\[ACTION: [A-Z_]+\])/).map((part, index) => {
                            if (part.startsWith('[ACTION:')) {
                                const match = part.match(/\[ACTION: ([A-Z_]+)\]/);
                                const type = match ? match[1] : null;
                                if (type) return <NeuralAction key={index} type={type} />;
                            }
                            return (
                                <ReactMarkdown
                                    key={index}
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc ml-5 mb-4 space-y-1">{children}</ul>,
                                        h1: ({ children }) => <h1 className="text-base font-black uppercase tracking-[0.2em] mb-4 text-white/90">{children}</h1>,
                                        code: ({ children }) => <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[11px] font-normal">{children}</code>,
                                        strong: ({ children }) => <strong className={cn("font-black tracking-wide", activeB.secondaryColor)}>{children}</strong>
                                    }}
                                >
                                    {part}
                                </ReactMarkdown>
                            );
                        })}
                    </div>
                ) : (
                    <p>{m.content}</p>
                )}
            </div>
            <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em] mt-2 px-2">
                {m.role === "user" ? "Authored" : "Neural Link"} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </motion.div>
    );

    return (
        <>
            {/* Neural Launcher Button — Bold Edge Tab (Desktop Only) */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ x: 80, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 80, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        whileHover={{ x: -4, scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-8 right-0 z-[100] group hidden md:flex items-center gap-3"
                    >
                        {/* Ambient Glow Behind the Tab */}
                        <div className={cn(
                            "absolute inset-0 rounded-l-2xl blur-2xl opacity-30 animate-neural-pulse -z-10",
                            activeB.color
                        )} />

                        {/* The Tab Itself */}
                        <div className={cn(
                            "flex items-center gap-3 px-5 py-4 rounded-l-2xl border border-r-0 border-white/10",
                            "bg-black/80 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.8),-8px_0_30px_rgba(0,0,0,0.5)]",
                            "group-hover:bg-black/90 group-hover:border-white/20 transition-all duration-300"
                        )}>
                            {/* Pulsing Icon */}
                            <div className={cn(
                                "relative w-12 h-12 rounded-xl flex items-center justify-center border shadow-2xl transition-all duration-300 shrink-0",
                                activeB.color,
                                "border-white/20 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                            )}>
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent" />
                                <IconB className="w-6 h-6 text-black relative z-10 transition-transform duration-300 group-hover:rotate-12" />
                                {/* Live Ping */}
                                <div className={cn("absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black", activeB.color)}>
                                    <div className={cn("absolute inset-0 rounded-full animate-ping opacity-75", activeB.color)} />
                                </div>
                            </div>

                            {/* Label Text */}
                            <div className="flex flex-col items-start">
                                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white whitespace-nowrap">
                                    LUCYA
                                </span>
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30 whitespace-nowrap">
                                    {activeB.name} Protocol
                                </span>
                            </div>

                            {/* Sparkle Badge */}
                            <Sparkles className={cn("w-4 h-4 animate-pulse ml-1", activeB.secondaryColor)} />
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Neural Workspace / Expanded View */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                            "fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-8 backdrop-blur-3xl transition-all duration-300",
                            isMaximized ? "bg-black/95" : "bg-black/60"
                        )}
                    >
                        {/* Immersive Background Nodes */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                            {[...Array(5)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        x: [Math.random() * 80 - 40, Math.random() * 80 - 40],
                                        y: [Math.random() * 80 - 40, Math.random() * 80 - 40],
                                        opacity: [0.05, 0.2, 0.05]
                                    }}
                                    transition={{ duration: 14.8 + i * 3, repeat: Infinity, ease: "easeInOut" }}
                                    className={cn(
                                        "absolute w-[400px] h-[400px] rounded-full blur-[100px]",
                                        i % 2 === 0 ? activeB.color : "bg-white/5"
                                    )}
                                    style={{
                                        top: `${Math.random() * 100}%`,
                                        left: `${Math.random() * 100}%`,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Scannable Grid Overlay */}
                        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:50px_50px]" />

                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{
                                scale: 1,
                                y: 0,
                                width: isMaximized ? "100%" : "min(1200px, 95vw)",
                                height: isMaximized ? "100%" : "min(800px, 90vh)",
                                borderRadius: isMaximized ? "0px" : "1.5rem"
                            }}
                            className="bg-[#050505]/90 border border-white/5 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden group"
                        >
                            {/* Toolbar / Header */}
                            <header className="h-16 md:h-20 border-b border-white/5 px-4 md:px-8 flex items-center justify-between bg-gradient-to-b from-white/[0.03] to-transparent relative z-20 shrink-0">
                                <div className="flex items-center gap-3 md:gap-6">
                                    <div className={cn(
                                        "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center border shadow-2xl relative group overflow-hidden transition-all",
                                        activeB.color.replace('bg-', 'bg-opacity-5 bg-'),
                                        activeB.ring.replace('border-', 'border-opacity-20 border-')
                                    )}>
                                        <div className={cn("absolute inset-0 opacity-10 group-hover:opacity-30 transition-opacity duration-300 animate-neural-pulse", activeB.color)} />
                                        <IconB className={cn("w-6 h-6 md:w-7 md:h-7 relative z-10", activeB.secondaryColor)} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <h2 className="text-sm sm:text-xl md:text-2xl font-black italic uppercase tracking-[0.2em] md:tracking-[0.3em] text-white">
                                                LUCYA <span className="hidden md:inline text-white/20 font-light not-italic">NEURAL WORKSPACE</span>
                                            </h2>
                                            <div className={cn("px-2 md:px-3 py-1 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] border shadow-lg", activeB.color, "text-black")}>
                                                {activeB.name}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-1.5 h-1.5 rounded-full animate-ping absolute", activeB.color)} />
                                                <div className={cn("w-1.5 h-1.5 rounded-full relative", activeB.color)} />
                                                <span className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase">Neural Connection Stable</span>
                                            </div>
                                            <span className="text-white/10 text-[9px]">|</span>
                                            <span className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase">{activeSession?.title || "Active Thread"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 md:gap-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl text-white/20 hover:text-white hover:bg-white/5 transition-all"
                                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    >
                                        <Layout className={cn("w-5 h-5 md:w-6 md:h-6", isSidebarOpen ? "text-eduGreen-500" : "text-white/20")} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-12 w-12 rounded-2xl text-white/20 hover:text-white hover:bg-white/5 transition-all hidden md:flex"
                                        onClick={() => setIsMaximized(!isMaximized)}
                                    >
                                        {isMaximized ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X className="w-5 h-5 md:w-6 md:h-6" />
                                    </Button>
                                </div>
                            </header>

                            {/* Two-Column Layout (Replaced with Coming Soon) */}
                            <div className="flex-1 flex overflow-hidden bg-black/40 backdrop-blur-3xl relative items-center justify-center">
                                {/* Ambient Background Elements */}
                                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-eduGreen-500/10 rounded-full blur-[120px] pointer-events-none" />
                                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
                                
                                <div className="relative flex flex-col items-center justify-center text-center p-8 md:p-12 z-10">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="mb-8 relative"
                                    >
                                        <div className="absolute inset-0 bg-eduGreen-500/20 blur-[80px] rounded-full" />
                                        <div className="w-24 h-24 rounded-full bg-black/80 border border-white/5 flex items-center justify-center relative z-10 shadow-[0_0_50px_rgba(20,122,82,0.3)] backdrop-blur-xl">
                                            <Sparkles className="w-10 h-10 text-eduGreen-500 animate-pulse" />
                                        </div>
                                    </motion.div>
                                    
                                    <motion.h2 
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3, duration: 0.8 }}
                                        className="text-3xl md:text-5xl font-black text-white uppercase tracking-[0.1em] mb-4 italic"
                                    >
                                        Neural Core <span className="text-eduGreen-500 not-italic font-medium">Initializing</span>
                                    </motion.h2>
                                    
                                    <motion.p 
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.5, duration: 0.8 }}
                                        className="text-white/40 font-medium text-xs md:text-sm uppercase tracking-[0.3em] max-w-lg leading-relaxed"
                                    >
                                        The next generation of institutional AI is currently undergoing safety alignment and cognitive calibration. 
                                    </motion.p>
                                    
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 1, duration: 0.5 }}
                                        className="mt-12 flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 bg-black/50 backdrop-blur-md shadow-2xl"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Deployment Incoming</span>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
