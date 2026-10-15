"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Send, Sparkles, Shield, Zap, Minimize2, Maximize2, Cpu, Plus, History, Layout, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMessage = { role: "user" | "ai", content: string };

type ChatSession = {
    id: string;
    title: string;
    messages: ChatMessage[];
    updatedAt: number;
};

const ASSISTANT = {
    name: "Assistant",
    icon: Shield,
    color: "bg-emerald-500",
    secondaryColor: "text-emerald-400",
    ring: "border-emerald-500",
    greeting: (n?: string) => `Hello, **${n || 'there'}**. I am LUCY, the school assistant. I can help with school administration, teaching, studying and using the platform. How can I help you today?`
};

const SmartAction = ({ type }: { type: string }) => {
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

export function AIAssistant({ userName, userId }: { userName?: string; userId?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Multi-session state
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const activeSession = sessions.find(s => s.id === activeSessionId);
    const messages = activeSession?.messages || [];
    const activeB = ASSISTANT;
    const IconB = activeB.icon;

    // Per-user localStorage keys — scoped to userId to keep sessions private
    const sessionsKey = `lucy_ai_sessions_v2_${userId || 'guest'}`;
    const activeKey = `lucy_ai_active_session_v2_${userId || 'guest'}`;

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
            title: "New Smart Thread",
            messages: [{ role: "ai", content: ASSISTANT.greeting(userName) }],
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
                    }))
                })
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            let aiMessageContent = "";

            setSessions(prev => prev.map(s =>
                s.id === activeSessionId
                    ? { ...s, messages: [...newMessages, { role: "ai", content: "" }], updatedAt: Date.now() }
                    : s
            ));

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    aiMessageContent += chunk;
                    setSessions(prev => prev.map(s => {
                        if (s.id !== activeSessionId) return s;
                        return { ...s, messages: [...newMessages, { role: "ai", content: aiMessageContent }], updatedAt: Date.now() };
                    }));
                }
            }

        } catch (error) {
            console.error("[AI Assistant] Error in handleSend:", error);
            setSessions(prev => prev.map(s =>
                s.id === activeSessionId
                    ? { ...s, messages: [...newMessages, { role: "ai", content: "✦ **Smart Link Interrupted.**\n\nI was unable to establish a connection to the smart core. Please check your connection and try again." }], updatedAt: Date.now() }
                    : s
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const startNewChat = () => {
        const id = Math.random().toString(36).substring(7);
        const newSession: ChatSession = {
            id,
            title: "New Smart Thread",
            messages: [{ role: "ai", content: ASSISTANT.greeting(userName) }],
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
                    title: "New Smart Thread",
                    messages: [{ role: "ai", content: ASSISTANT.greeting(userName) }],
                    updatedAt: Date.now()
                }];
            }
            return filtered;
        });
        if (activeSessionId === id) {
            setActiveSessionId(sessions.find(s => s.id !== id)?.id || null);
        }
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
                                if (type) return <SmartAction key={index} type={type} />;
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
                {m.role === "user" ? "Authored" : "Smart Link"} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </motion.div>
    );

    return (
        <>
            {/* Smart Launcher Button — Bold Edge Tab (Desktop Only) */}
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
                            "absolute inset-0 rounded-l-2xl blur-2xl opacity-30 animate-smart-pulse -z-10",
                            activeB.color
                        )} />

                        {/* The Tab Itself */}
                        <div className={cn(
                            "flex items-center gap-3 px-5 py-4 rounded-l-2xl border border-r-0 border-zinc-300 dark:border-white/10",
                            "bg-white/80 dark:bg-black/80 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.8),-8px_0_30px_rgba(0,0,0,0.5)]",
                            "group-hover:bg-white/90 dark:bg-black/90 group-hover:border-white/20 transition-all duration-300"
                        )}>
                            {/* Pulsing Icon */}
                            <div className={cn(
                                "relative w-12 h-12 rounded-xl flex items-center justify-center border shadow-2xl transition-all duration-300 shrink-0",
                                activeB.color,
                                "border-zinc-300 dark:border-white/20 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
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
                                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-900 dark:text-white whitespace-nowrap">
                                    LUCYA
                                </span>
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-900 dark:text-white/30 whitespace-nowrap">
                                    {activeB.name}
                                </span>
                            </div>

                            {/* Sparkle Badge */}
                            <Sparkles className={cn("w-4 h-4 animate-pulse ml-1", activeB.secondaryColor)} />
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Smart Workspace / Expanded View */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                            "fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-8 backdrop-blur-3xl transition-all duration-300",
                            isMaximized ? "bg-white/95 dark:bg-black/95" : "bg-white/60 dark:bg-black/60"
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
                                        i % 2 === 0 ? activeB.color : "bg-zinc-200 dark:bg-white/5"
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
                            className="bg-white/95 dark:bg-[#050505]/90 border border-zinc-200 dark:border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.1)] dark:shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden group"
                        >
                            {/* Toolbar / Header */}
                            <header className="h-16 md:h-20 border-b border-zinc-200 dark:border-white/5 px-4 md:px-8 flex items-center justify-between bg-gradient-to-b from-white/[0.03] to-transparent relative z-20 shrink-0">
                                <div className="flex items-center gap-3 md:gap-6">
                                    <div className={cn(
                                        "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center border shadow-2xl relative group overflow-hidden transition-all",
                                        activeB.color.replace('bg-', 'bg-opacity-5 bg-'),
                                        activeB.ring.replace('border-', 'border-opacity-20 border-')
                                    )}>
                                        <div className={cn("absolute inset-0 opacity-10 group-hover:opacity-30 transition-opacity duration-300 animate-smart-pulse", activeB.color)} />
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
                                                <span className="text-[9px] font-bold tracking-[0.2em] text-zinc-900 dark:text-white/30 uppercase">Smart Connection Stable</span>
                                            </div>
                                            <span className="text-zinc-900 dark:text-white/10 text-[9px]">|</span>
                                            <span className="text-[9px] font-bold tracking-[0.2em] text-zinc-900 dark:text-white/30 uppercase">{activeSession?.title || "Active Thread"}</span>
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
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl text-zinc-900 dark:text-white/20 hover:text-red-600 dark:text-red-500 hover:bg-red-500/10 transition-all"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X className="w-5 h-5 md:w-6 md:h-6" />
                                    </Button>
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
                                                        <h2 className="text-[10px] font-black text-zinc-900 dark:text-white/40 uppercase tracking-widest italic">Smart Console</h2>
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

                                                    <section className="space-y-4">
                                                        <div className="flex items-center justify-between px-2">
                                                            <h3 className="text-[10px] font-black text-zinc-900 dark:text-white/20 uppercase tracking-[0.3em] flex items-center gap-2">
                                                                <History className="w-3 h-3" /> Smart Threads
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
                                                                        <div className={cn("w-2 h-2 rounded-full", ASSISTANT.color)} />
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
                                                            <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest truncate">{userName || 'Smart Subject'}</span>
                                                            <span className="text-[8px] text-zinc-900 dark:text-white/20 font-bold uppercase tracking-tighter">Biometric Connection Active</span>
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
                                                    <span className="text-[10px] font-medium text-zinc-900 dark:text-white/40 uppercase tracking-widest ml-2">Thinking</span>
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
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
