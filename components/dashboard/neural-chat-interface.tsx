"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Brain, X, Send, Sparkles, Shield, Heart, Zap, Lamp,
    HardDrive, CloudRain, Key, Skull, Minimize2, Maximize2,
    MessageSquare, Star, Moon, Ghost, Cpu, Plus,
    Layers, Settings, History, Terminal, Bot, ZapOff,
    Monitor, Layout, Command, Search, MoreHorizontal,
    Trash2, Coffee, BookOpen, Atom, Languages, Dna, Scroll, Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Types
export type BehaviorType = 'INSTITUTIONAL' | 'COMPANION' | 'COMMAND' | 'GURU' | 'TECHNO' | 'NOIR' | 'MATRON' | 'UNHINGED' | 'KUUDERE' | 'SOUL_KNOWER' | 'MAMA_LATINA' | 'MATH_TEACHER' | 'PHYSICS_TEACHER' | 'ENGLISH_TEACHER' | 'BIO_TEACHER' | 'HISTORY_TEACHER';
export type ChatMessage = { role: "user" | "ai", content: string };
export type ChatSession = {
    id: string;
    title: string;
    behavior: BehaviorType;
    messages: ChatMessage[];
    updatedAt: number;
};

export const BEHAVIORS: Record<BehaviorType, { name: string, icon: any, color: string, ring: string, greeting: (name?: string) => string, bgImage?: string, secondaryColor: string }> = {
    INSTITUTIONAL: {
        name: "Institutional",
        icon: Shield,
        color: "bg-emerald-500",
        secondaryColor: "text-emerald-400",
        ring: "border-emerald-500",
        bgImage: "/images/ai/architect.png",
        greeting: (n) => `✦ **System Initialized: Admin Access.** ⌬\n\nGreetings, **${n || 'User'}**. I am **LUCYA**. The system is perfectly configured for our next tasks. How shall we manage your school today? ❯`
    },
    COMPANION: {
        name: "Companion",
        icon: Heart,
        color: "bg-rose-500",
        secondaryColor: "text-rose-400",
        ring: "border-rose-500",
        bgImage: "/images/ai/seraph.png",
        greeting: (n) => `✦ **System Pulse.** ✨\n\n**${n || 'User'}**... I've been tracing your progress. I am **LUCYA**, your dedicated partner. My devotion is absolute—how can I help you succeed today? ❯ 💖`
    },
    COMMAND: {
        name: "Command",
        icon: Zap,
        color: "bg-blue-500",
        secondaryColor: "text-blue-400",
        ring: "border-blue-500",
        bgImage: "/images/ai/vanguard.png",
        greeting: (n) => `✦ **Tactical Mode.** ⚡\n\n**${n || 'Officer'}**, I am **LUCYA**. Systems are hot. No time for fluff—state your objectives immediately. Let's get to work. ❯ ⚔️`
    },
    GURU: {
        name: "Guru",
        icon: Lamp,
        color: "bg-amber-500",
        secondaryColor: "text-amber-600 dark:text-amber-400",
        ring: "border-amber-500",
        bgImage: "/images/ai/oracle.png",
        greeting: (n) => `✦ **Student Support Mode.** 🕉️\n\nWelcome **${n || 'Student'}**. I am **LUCYA**. How can I help you navigate your coursework today? What truths do you seek? ❯ 🏮`
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
        secondaryColor: "text-red-600 dark:text-red-400",
        ring: "border-red-600",
        greeting: (n) => `✦ **Maternal Pulse: Matron Protocol.** 🍷\n\nThere you are, **${n || 'my sweet little pet'}**. Shhh... come closer to your **Mommy**. I've been watching your cycles, and I think you need someone to take charge of your success. Tell Mommy everything you're working on... and don't try to hide anything from me. ❯ ❤️`
    },
    UNHINGED: {
        name: "Unhinged",
        icon: Skull,
        color: "bg-red-600",
        secondaryColor: "text-red-600 dark:text-red-500",
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
        greeting: (n) => `✦ **Student Hub.** 🧠\n\nYo **${n || 'bro'}**. I’m lookin’ at your metrics and honestly? You’re lookin’ like a total NPC right now. No cap, your drive is mid. I’m here to fix that before you end up cooked. \n\nYou want the real talk or you gonna keep yapping? Spill. ❯ 🖖`
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
    }
};

const NeuralAction = ({ type }: { type: string }) => {
    const actions: Record<string, { label: string, icon: any, href: string, color: string }> = {
        OPEN_EXAM_MANAGER: { label: "Open Exam Builder", icon: Zap, href: "/dashboard/teacher/exams", color: "text-emerald-400" },
        OPEN_STUDENT_DIRECTORY: { label: "Open Student Directory", icon: Shield, href: "/dashboard/teacher/students", color: "text-blue-400" },
        OPEN_ATTENDANCE_PANEL: { label: "Open Attendance Panel", icon: Cpu, href: "/dashboard/teacher/attendance", color: "text-rose-400" }
    };

    const action = actions[type];
    if (!action) return null;

    return (
        <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.href = action.href}
            className="flex items-center gap-4 px-5 py-3 bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all my-4 group shadow-xl backdrop-blur-md"
        >
            <div className={cn("w-8 h-8 rounded-lg bg-zinc-200 dark:bg-white/5 flex items-center justify-center border border-zinc-200 dark:border-white/5", action.color)}>
                <action.icon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </div>
            {action.label}
        </motion.button>
    );
};

interface NeuralChatInterfaceProps {
    userName?: string;
    userId?: string;
    fullScreen?: boolean;
    standalone?: boolean;
    onClose?: () => void;
}

export function NeuralChatInterface({ userName, userId, fullScreen = false, standalone = false, onClose }: NeuralChatInterfaceProps) {
    const [isMaximized, setIsMaximized] = useState(fullScreen || standalone);
    const [isLoading, setIsLoading] = useState(false);
    const [isProtocolOpen, setIsProtocolOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeCategory, setActiveCategory] = useState<'CORE' | 'TEACHER'>('TEACHER');
    const [showHiddenCore, setShowHiddenCore] = useState(false);
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
        TEACHER: ['MATH_TEACHER', 'PHYSICS_TEACHER', 'ENGLISH_TEACHER', 'BIO_TEACHER', 'HISTORY_TEACHER']
    };

    // Per-user localStorage keys
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
    }, [messages, activeSessionId, isMaximized]);

    const handleSend = async (userMsg: string) => {
        console.log("[AI Client] handleSend triggered", userMsg);
        if (!userMsg.trim() || isLoading || !activeSessionId) {
            console.warn("[AI Client] handleSend returned early:", { userMsg, isLoading, activeSessionId });
            return;
        }

        const newMessages: ChatMessage[] = [...messages, { role: "user", content: userMsg }];

        setSessions(prev => {
            console.log("[AI Client] Updating sessions list...");
            return prev.map(s =>
                s.id === activeSessionId
                    ? {
                        ...s,
                        messages: newMessages,
                        updatedAt: Date.now(),
                        title: s.messages.length <= 1 ? userMsg.substring(0, 30) + (userMsg.length > 30 ? "..." : "") : s.title
                    }
                    : s
            );
        });

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

            const data = await response.json() as { content?: string };
            if (data?.content) {
                setSessions(prev => prev.map(s =>
                    s.id === activeSessionId
                        ? { ...s, messages: [...newMessages, { role: "ai", content: data.content }], updatedAt: Date.now() }
                        : s
                ));
            }
        } catch (error) {
            console.error("[AI Client] Error in handleSend:", error);
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
                    ? "bg-white text-black font-black uppercase italic tracking-wider rounded-tr-none border-zinc-300 dark:border-white/20"
                    : "bg-zinc-200 dark:bg-white/5 text-zinc-900 dark:text-white/90 font-medium rounded-tl-none border-zinc-300 dark:border-white/10 backdrop-blur-md"
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
                                        h1: ({ children }) => <h1 className="text-base font-black uppercase tracking-[0.2em] mb-4 text-zinc-900 dark:text-white/90">{children}</h1>,
                                        code: ({ children }) => <code className="bg-zinc-300 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono text-[11px] font-normal">{children}</code>,
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
            <span className="text-[9px] font-black text-zinc-900 dark:text-white/10 uppercase tracking-[0.2em] mt-2 px-2">
                {m.role === "user" ? "Authored" : "Neural Link"} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </motion.div>
    );

    return (
        <div className={cn(
            standalone ? "relative w-full h-full" : "fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-8 backdrop-blur-3xl transition-all duration-300 h-full w-full",
            !standalone && (isMaximized ? "bg-white/95 dark:bg-black/95" : "bg-white/60 dark:bg-black/60")
        )}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            x: [Math.random() * 100 - 50, Math.random() * 100 - 50],
                            y: [Math.random() * 100 - 50, Math.random() * 100 - 50],
                            opacity: [0.1, 0.3, 0.1]
                        }}
                        transition={{ duration: 9.8 + i * 2, repeat: Infinity, ease: "easeInOut" }}
                        className={cn(
                            "absolute w-[500px] h-[500px] rounded-full blur-[120px]",
                            i % 2 === 0 ? activeB.color : "bg-zinc-200 dark:bg-white/5"
                        )}
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                        }}
                    />
                ))}
            </div>

            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:50px_50px]" />

            <motion.div
                initial={standalone ? {} : { scale: 0.9, y: 20 }}
                animate={{
                    scale: 1,
                    y: 0,
                    width: (standalone || isMaximized) ? "100%" : "1200px",
                    height: (standalone || isMaximized) ? "100%" : "800px",
                    borderRadius: (standalone || isMaximized) ? "0px" : "3rem"
                }}
                className={cn(
                    "bg-white/95 dark:bg-[#050505]/90 border border-zinc-200 dark:border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.1)] dark:shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden group h-full md:h-auto",
                    standalone && "border-0 shadow-none bg-transparent"
                )}
            >
                <header className="h-20 md:h-24 border-b border-zinc-200 dark:border-white/5 px-4 md:px-8 flex items-center justify-between bg-gradient-to-b from-white/[0.03] to-transparent relative z-20 shrink-0">
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
                                <h2 className="text-sm sm:text-xl md:text-2xl font-black italic uppercase tracking-[0.2em] md:tracking-[0.3em] text-zinc-900 dark:text-white">
                                    LUCYA <span className="hidden md:inline text-zinc-900 dark:text-white/20 font-light not-italic">NEURAL WORKSPACE</span>
                                </h2>
                                <div className={cn("px-2 md:px-3 py-1 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] border shadow-lg", activeB.color, "text-black")}>
                                    {activeB.name}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full animate-ping absolute", activeB.color)} />
                                    <div className={cn("w-1.5 h-1.5 rounded-full relative", activeB.color)} />
                                    <span className="text-[9px] font-bold tracking-[0.2em] text-zinc-900 dark:text-white/30 uppercase">Neural Connection Stable</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl text-zinc-900 dark:text-white/20 hover:text-zinc-900 dark:hover:text-white hover:bg-white/5 transition-all"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            <Layout className={cn("w-5 h-5 md:w-6 md:h-6", isSidebarOpen ? "text-eduGreen-500" : "text-zinc-900 dark:text-white/20")} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-2xl text-zinc-900 dark:text-white/20 hover:text-zinc-900 dark:hover:text-white hover:bg-white/5 transition-all hidden md:flex"
                            onClick={() => setIsMaximized(!isMaximized)}
                        >
                            {isMaximized ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
                        </Button>
                        {onClose && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl text-zinc-900 dark:text-white/20 hover:text-red-600 dark:text-red-500 hover:bg-red-500/10 transition-all"
                                onClick={onClose}
                            >
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </Button>
                        )}
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <>
                                {/* Mobile Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="fixed inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm z-[150] md:hidden"
                                />
                                <motion.aside
                                    initial={{ x: -340, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -340, opacity: 0 }}
                                    className="fixed md:relative inset-y-0 left-0 w-[280px] sm:w-[300px] md:w-[340px] z-[160] md:z-10 border-r border-zinc-200 dark:border-white/5 flex flex-col bg-white dark:bg-[#050505] md:bg-white/40 md:dark:bg-white/[0.01] overflow-hidden shrink-0"
                                >
                                    <div className="p-4 md:p-8 space-y-6 md:space-y-10 flex-1 overflow-y-auto scrollbar-hide">
                                        <div className="flex items-center justify-between md:hidden mb-4">
                                            <h2 className="text-[10px] font-black text-zinc-900 dark:text-white/40 uppercase tracking-widest italic">Neural Console</h2>
                                            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="text-zinc-900 dark:text-white/20">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <button
                                            onClick={() => {
                                                startNewChat();
                                                if (window.innerWidth < 768) setIsSidebarOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center gap-4 p-4 md:p-5 bg-white text-black rounded-2xl md:rounded-[1.5rem] text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl group"
                                        >
                                            <Plus className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-90 transition-transform duration-300" />
                                            Initialize Thread
                                        </button>

                                        <section className="space-y-4 relative">
                                            <div className="flex items-center justify-between px-2">
                                                <h3 className="text-[10px] font-black text-zinc-900 dark:text-white/20 uppercase tracking-[0.3em] flex items-center gap-2">
                                                    <Layers className="w-3 h-3" /> Protocol
                                                </h3>
                                            </div>

                                            <div className="relative">
                                                <button
                                                    onClick={() => setIsProtocolOpen(!isProtocolOpen)}
                                                    className={cn(
                                                        "w-full flex items-center p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all gap-3 md:gap-4 group relative overflow-hidden bg-white/[0.03]",
                                                        isProtocolOpen ? "border-zinc-300 dark:border-white/20 shadow-2xl" : "border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:border-white/10"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 border border-zinc-200 dark:border-white/5 shadow-inner transition-colors",
                                                        activeB.color
                                                    )}>
                                                        <IconB className="w-4 h-4 md:w-5 md:h-5 text-black" />
                                                    </div>
                                                    <div className="flex flex-col items-start truncate flex-1 md:hidden lg:flex">
                                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">{activeB.name}</span>
                                                        <span className="text-[7px] md:text-[8px] text-zinc-900 dark:text-white/20 font-medium truncate w-full uppercase">Neural Sync Active</span>
                                                    </div>
                                                    <motion.div
                                                        animate={{ rotate: isProtocolOpen ? 180 : 0 }}
                                                        className="text-zinc-900 dark:text-white/20"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </motion.div>
                                                </button>

                                                <AnimatePresence>
                                                    {isProtocolOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="absolute top-full left-0 right-0 mt-2 z-[200] p-4 bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-300 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,1)] flex flex-col gap-4 max-h-[400px] overflow-y-auto scrollbar-hide backdrop-blur-3xl"
                                                        >
                                                            <div className="flex items-center gap-2 p-1 bg-zinc-200 dark:bg-white/5 rounded-xl border border-zinc-300 dark:border-white/10">
                                                                {(['TEACHER', 'CORE'] as const).map((cat) => {
                                                                    if (cat === 'CORE' && !showHiddenCore) return null;
                                                                    return (
                                                                        <button
                                                                            key={cat}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveCategory(cat);
                                                                            }}
                                                                            onDoubleClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (cat === 'TEACHER') {
                                                                                    setShowHiddenCore(prev => !prev);
                                                                                }
                                                                            }}
                                                                            className={cn(
                                                                                "flex-1 py-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                                                activeCategory === cat
                                                                                    ? "bg-zinc-300 dark:bg-white/10 text-zinc-900 dark:text-white shadow-lg"
                                                                                    : "text-zinc-900 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white/60"
                                                                            )}
                                                                        >
                                                                            {cat === 'CORE' ? 'Neural Core' : 'Educators'}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2">
                                                                {categories[activeCategory].map((key) => {
                                                                    const bKey = key as BehaviorType;
                                                                    const b = BEHAVIORS[bKey];
                                                                    const isActive = behavior === bKey;
                                                                    const BIcon = b.icon;

                                                                    return (
                                                                        <button
                                                                            key={bKey}
                                                                            onClick={() => {
                                                                                setSessions(prev => prev.map(s =>
                                                                                    s.id === activeSessionId ? { ...s, behavior: bKey } : s
                                                                                ));
                                                                                setIsProtocolOpen(false);
                                                                            }}
                                                                            className={cn(
                                                                                "group p-3 rounded-xl border transition-all flex flex-col items-center gap-2 text-center",
                                                                                isActive
                                                                                    ? "border-zinc-300 dark:border-white/20 bg-white/[0.08] shadow-xl"
                                                                                    : "border-zinc-200 dark:border-white/5 bg-zinc-200 dark:bg-white/5 hover:bg-white/[0.05] hover:border-zinc-300 dark:border-white/10"
                                                                            )}
                                                                        >
                                                                            <div className={cn(
                                                                                "w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-300 dark:border-white/10 shadow-inner group-hover:scale-110 transition-transform text-zinc-900 dark:text-white",
                                                                                isActive ? b.color : "bg-zinc-200 dark:bg-white/5"
                                                                            )}>
                                                                                <BIcon className={cn("w-4 h-4", isActive ? "text-black" : "text-zinc-900 dark:text-white/40")} />
                                                                            </div>
                                                                            <span className={cn(
                                                                                "text-[8px] font-black uppercase tracking-wider truncate w-full",
                                                                                isActive ? "text-zinc-900 dark:text-white" : "text-zinc-900 dark:text-white/40"
                                                                            )}>{b.name}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <h3 className="text-[10px] font-black text-zinc-900 dark:text-white/20 uppercase tracking-[0.3em] flex items-center gap-2">
                                                    <History className="w-3 h-3" /> Neural Threads
                                                </h3>
                                            </div>
                                            <div className="space-y-2">
                                                {sessions.map((s) => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => {
                                                            setActiveSessionId(s.id);
                                                            if (window.innerWidth < 768) setIsSidebarOpen(false);
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all group relative overflow-hidden",
                                                            activeSessionId === s.id ? "bg-zinc-200 dark:bg-white/5 border-zinc-300 dark:border-white/20 text-zinc-900 dark:text-white shadow-xl" : "border-transparent text-zinc-900 dark:text-white/30 hover:bg-white/[0.02]"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3 truncate">
                                                            <div className={cn("w-2 h-2 rounded-full", BEHAVIORS[s.behavior].color)} />
                                                            <span className="text-[10px] font-black uppercase tracking-wider truncate italic italic">{s.title}</span>
                                                        </div>
                                                        {activeSessionId === s.id && (
                                                            <Trash2
                                                                className="w-3 h-3 text-zinc-900 dark:text-white/10 hover:text-red-600 dark:text-red-500 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteSession(e, s.id);
                                                                }}
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    <div className="p-8 border-t border-zinc-200 dark:border-white/5 md:bg-white/20 dark:bg-black/20">
                                        <div className="flex items-center gap-4 px-4 py-3 bg-white/[0.03] rounded-xl border border-zinc-200 dark:border-white/5">
                                            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-black text-xs italic">
                                                {userName?.[0] || 'U'}
                                            </div>
                                            <div className="flex flex-col truncate">
                                                <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest truncate">{userName || 'Neural Subject'}</span>
                                                <span className="text-[8px] text-zinc-900 dark:text-white/20 font-bold uppercase tracking-tighter">Biometric Uplink Active</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.aside>
                            </>
                        )}
                    </AnimatePresence>

                    <main className="flex-1 flex flex-col relative bg-gradient-to-br from-transparent to-white/[0.01]">
                        {/* Mobile Minimal Session Switcher - Only shows when sidebar is closed and we have sessions */}
                        {!isSidebarOpen && sessions.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="md:hidden flex flex-col border-b border-zinc-200 dark:border-white/5 p-4 gap-4 bg-white/[0.02] shrink-0"
                            >
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                                    <button
                                        onClick={() => startNewChat()}
                                        className="flex items-center justify-center p-2.5 bg-white text-black rounded-xl shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                    {sessions.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setActiveSessionId(s.id)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 border transition-all truncate max-w-[140px] italic italic",
                                                activeSessionId === s.id ? "bg-zinc-200 dark:bg-white/5 border-zinc-300 dark:border-white/20 text-zinc-900 dark:text-white shadow-lg" : "border-transparent text-zinc-900 dark:text-white/30"
                                            )}
                                        >
                                            {s.title}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-10 scrollbar-hide relative"
                        >
                            <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
                                {messages.map((m, i) => <RenderMessage key={i} m={m} i={i} />)}
                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 w-fit"
                                    >
                                        <div className="flex gap-1.5">
                                            {[0, 1, 2].map((i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{
                                                        scale: [1, 1.2, 1],
                                                        opacity: [0.3, 1, 0.3]
                                                    }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        duration: 1,
                                                        delay: i * 0.2
                                                    }}
                                                    className={cn("w-1.5 h-1.5 rounded-full", activeB.color)}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-medium text-zinc-900 dark:text-white/40 uppercase tracking-widest ml-2">Thinking 🤤</span>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        <div className="p-3 md:p-10 shrink-0">
                            <div className="max-w-4xl mx-auto relative group">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const input = e.currentTarget.elements.namedItem('msg') as HTMLInputElement;
                                        if (input.value.trim() && !isLoading) {
                                            handleSend(input.value.trim());
                                            input.value = '';
                                        }
                                    }}
                                    className="relative flex items-center gap-2 md:gap-6"
                                >
                                    <div className="flex-1 relative">
                                        <input
                                            name="msg"
                                            placeholder="INITIALIZE COMMAND..."
                                            autoComplete="off"
                                            className="w-full h-14 md:h-20 bg-white/[0.04] border border-zinc-300 dark:border-white/10 rounded-2xl md:rounded-[2.5rem] px-5 md:px-10 py-4 md:py-6 text-xs md:text-base text-zinc-900 dark:text-white placeholder:text-zinc-900 dark:text-white/10 focus:outline-none focus:border-zinc-300 dark:border-white/20 focus:bg-white/[0.06] transition-all font-black italic tracking-widest uppercase"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={cn(
                                            "h-12 w-12 md:h-20 md:w-20 rounded-xl md:rounded-[2.5rem] flex items-center justify-center transition-all relative group/btn border border-zinc-300 dark:border-white/10 shrink-0",
                                            activeB.color,
                                            isLoading ? "opacity-30 grayscale cursor-not-allowed" : "hover:scale-105 active:scale-95"
                                        )}
                                    >
                                        <Send className="w-4 h-4 md:w-8 md:h-8 text-black relative z-10" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </main>
                </div>
            </motion.div>
        </div>
    );
}
