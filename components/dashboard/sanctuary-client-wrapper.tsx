"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Users,
    HeartHandshake,
    Send,
    LogOut,
    AlertTriangle,
    LifeBuoy,
    CheckCircle2,
    Lock,
    EyeOff,
    CameraOff,
    FileText,
    CopyX,
    ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SanctuaryProps {
    currentUser: {
        id: string;
        role: string;
        schoolId: string | null;
        name: string;
    };
    isEligibleStudent: boolean;
}

interface SanctuarySessionInfo {
    id: string;
    mode: "PEER_TO_PEER" | "FACULTY_MENTOR";
    status: "WAITING" | "ACTIVE" | "ENDED" | "FLAGGED";
    myPseudo: string;
    myRole: string;
    partnerPseudo?: string;
    partnerRole?: string;
    createdAt: string;
}

interface SanctuaryChatMessage {
    id: string;
    senderName: string;
    senderRole: string;
    content: string;
    isMe: boolean;
    createdAt: string;
}

interface CrisisHelpline {
    name: string;
    contact: string;
    description: string;
}

export function SanctuaryClientWrapper({ currentUser, isEligibleStudent }: SanctuaryProps) {
    const router = useRouter();
    const isStudent = currentUser.role === "STUDENT";

    const [selectedMode, setSelectedMode] = useState<"PEER_TO_PEER" | "FACULTY_MENTOR">(
        isStudent ? "PEER_TO_PEER" : "FACULTY_MENTOR"
    );
    const [viewState, setViewState] = useState<"IDLE" | "MATCHING" | "ACTIVE" | "ENDED">("IDLE");
    const [sessionData, setSessionData] = useState<SanctuarySessionInfo | null>(null);
    const [waitingSessionId, setWaitingSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SanctuaryChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [crisisAlert, setCrisisAlert] = useState<CrisisHelpline | null>(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [isReporting, setIsReporting] = useState(false);
    const [hotlineDrawerOpen, setHotlineDrawerOpen] = useState(false);
    const [privacyRulesModalOpen, setPrivacyRulesModalOpen] = useState(false);
    const [privacyToast, setPrivacyToast] = useState<string | null>(null);
    const [isWindowBlurred, setIsWindowBlurred] = useState(false);
    const [queueTimer, setQueueTimer] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isPollingRef = useRef(false);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Global Panic Exit Keyboard Listener (Esc key)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && viewState === "ACTIVE") {
                triggerPanicExit();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [viewState, sessionData]);

    // Screenshot Prevention & Window Blur Obscuring Interceptors
    useEffect(() => {
        const handleCaptureDetection = (e: KeyboardEvent) => {
            if (
                e.key === "PrintScreen" ||
                ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5" || e.key === "S" || e.key === "s"))
            ) {
                setPrivacyToast("Confidentiality Notice: Capturing screenshots of Sanctuary conversations violates institutional privacy rules.");
            }
        };

        const handleVisibilityChange = () => {
            setIsWindowBlurred(document.visibilityState === "hidden");
        };

        const handleWindowBlur = () => {
            if (viewState === "ACTIVE") {
                setIsWindowBlurred(true);
            }
        };

        const handleWindowFocus = () => {
            setIsWindowBlurred(false);
        };

        window.addEventListener("keyup", handleCaptureDetection);
        window.addEventListener("keydown", handleCaptureDetection);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);
        window.addEventListener("focus", handleWindowFocus);

        return () => {
            window.removeEventListener("keyup", handleCaptureDetection);
            window.removeEventListener("keydown", handleCaptureDetection);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleWindowBlur);
            window.removeEventListener("focus", handleWindowFocus);
        };
    }, [viewState]);

    // Auto-clear privacy toast after 4s
    useEffect(() => {
        if (privacyToast) {
            const timer = setTimeout(() => setPrivacyToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [privacyToast]);

    // Matchmaking Polling: Sequential, non-overlapping polling with 4s interval
    useEffect(() => {
        let isMounted = true;
        let timerId: NodeJS.Timeout;

        if (viewState === "MATCHING") {
            const startTime = Date.now();
            const intervalTimer = setInterval(() => {
                if (isMounted) {
                    setQueueTimer(Math.floor((Date.now() - startTime) / 1000));
                }
            }, 1000);

            const pollMatchStatus = async () => {
                if (!isMounted || isPollingRef.current) return;
                isPollingRef.current = true;
                try {
                    const query = waitingSessionId ? `?sessionId=${waitingSessionId}` : '';
                    const res = await fetch(`/api/sanctuary/match${query}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" }
                    });
                    if (res.ok) {
                        const data = await res.json() as { matched?: boolean; session?: SanctuarySessionInfo; messages?: SanctuaryChatMessage[] };
                        if (data.matched && data.session && isMounted) {
                            setSessionData(data.session);
                            setMessages(data.messages || []);
                            setViewState("ACTIVE");
                            isPollingRef.current = false;
                            return; // Stop polling
                        }
                    }
                } catch (e) {
                    console.warn("Match polling retry:", e);
                } finally {
                    isPollingRef.current = false;
                }

                if (isMounted && viewState === "MATCHING") {
                    timerId = setTimeout(pollMatchStatus, 4000);
                }
            };

            timerId = setTimeout(pollMatchStatus, 3000);

            return () => {
                isMounted = false;
                clearInterval(intervalTimer);
                clearTimeout(timerId);
                isPollingRef.current = false;
            };
        }
    }, [viewState, waitingSessionId]);

    // Active Chat Message Sync: Sequential non-overlapping polling with 3.5s interval
    useEffect(() => {
        let isMounted = true;
        let timerId: NodeJS.Timeout;

        if (viewState === "ACTIVE" && sessionData?.id) {
            const pollMessages = async () => {
                if (!isMounted || isPollingRef.current) return;
                isPollingRef.current = true;
                try {
                    const res = await fetch(`/api/sanctuary/message?sessionId=${sessionData.id}`);
                    if (res.ok) {
                        const data = await res.json() as { session?: SanctuarySessionInfo; messages?: SanctuaryChatMessage[] };
                        if (data.session && isMounted) {
                            if (data.session.status === "ENDED" || data.session.status === "FLAGGED") {
                                setViewState("ENDED");
                                isPollingRef.current = false;
                                return;
                            }
                            setSessionData(data.session);
                            if (data.messages && data.messages.length > 0) {
                                setMessages(data.messages);
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Message sync retry:", e);
                } finally {
                    isPollingRef.current = false;
                }

                if (isMounted && viewState === "ACTIVE") {
                    timerId = setTimeout(pollMessages, 3500);
                }
            };

            timerId = setTimeout(pollMessages, 3500);

            return () => {
                isMounted = false;
                clearTimeout(timerId);
                isPollingRef.current = false;
            };
        }
    }, [viewState, sessionData?.id]);

    // Start Matchmaking Action
    const handleStartMatch = async (mode: "PEER_TO_PEER" | "FACULTY_MENTOR") => {
        setSelectedMode(mode);
        setViewState("MATCHING");
        setQueueTimer(0);
        setWaitingSessionId(null);
        try {
            const res = await fetch("/api/sanctuary/match", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode })
            });
            const data = await res.json() as {
                matched?: boolean;
                sessionId?: string;
                session?: SanctuarySessionInfo;
                messages?: SanctuaryChatMessage[]
            };
            if (data.matched && data.session) {
                setSessionData(data.session);
                setMessages(data.messages || []);
                setViewState("ACTIVE");
            } else if (data.sessionId) {
                setWaitingSessionId(data.sessionId);
            }
        } catch (e) {
            console.error("Match error", e);
        }
    };

    // Send Message with Real-Time Guardrails
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || isSending || !sessionData?.id) return;

        const rawText = inputText;
        setInputText("");
        setIsSending(true);

        try {
            const res = await fetch("/api/sanctuary/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: sessionData.id, content: rawText })
            });
            const data = await res.json() as {
                success?: boolean;
                message?: SanctuaryChatMessage;
                safety?: { isCrisisDetected?: boolean; crisisHelpline?: CrisisHelpline };
            };
            if (data.success && data.message) {
                setMessages(prev => [...prev, data.message!]);
                if (data.safety?.isCrisisDetected && data.safety.crisisHelpline) {
                    setCrisisAlert(data.safety.crisisHelpline);
                }
            }
        } catch (e) {
            console.error("Send failure", e);
        } finally {
            setIsSending(false);
        }
    };

    // Panic Exit / End Chat
    const triggerPanicExit = async () => {
        try {
            await fetch("/api/sanctuary/end", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: sessionData?.id || waitingSessionId })
            });
        } catch (e) {}
        setViewState("IDLE");
        setSessionData(null);
        setWaitingSessionId(null);
        setMessages([]);
        router.push("/dashboard");
    };

    // Submit Abuse / Safety Report
    const handleReportSubmit = async () => {
        if (!reportReason.trim() || isReporting || !sessionData?.id) return;
        setIsReporting(true);
        try {
            await fetch("/api/sanctuary/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: sessionData.id, reason: reportReason })
            });
            setReportModalOpen(false);
            setReportReason("");
            setViewState("ENDED");
        } catch (e) {
            console.error("Report failure", e);
        } finally {
            setIsReporting(false);
        }
    };

    if (isStudent && !isEligibleStudent) {
        return (
            <div className="max-w-xl mx-auto my-12 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-2xl border border-zinc-300 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
                <Shield className="w-12 h-12 text-zinc-400 mx-auto" />
                <h2 className="text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white">Sanctuary Clearance Required</h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    The Sanctuary anonymous peer support network is reserved for junior and senior secondary scholars in Grades 7 through 12.
                </p>
                <Button onClick={() => router.push("/dashboard")} variant="outline" className="rounded-xl border-zinc-300 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
                    Return to Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 relative select-none">
            {/* Privacy Notification Toast */}
            <AnimatePresence>
                {privacyToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-6 right-6 z-50 max-w-md bg-rose-950/90 border border-rose-500/50 backdrop-blur-xl p-4 rounded-2xl shadow-2xl flex items-start gap-3 text-rose-200"
                    >
                        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="text-xs leading-relaxed">
                            <span className="font-bold block uppercase tracking-wider text-rose-300">Confidentiality Protection</span>
                            {privacyToast}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header / Safety Bar */}
            <div className="bg-white/70 dark:bg-zinc-950/40 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-eduGreen-500/10 border border-eduGreen-500/30 flex items-center justify-center text-eduGreen-600 dark:text-eduGreen-400 shrink-0">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-eduGreen-700 dark:text-eduGreen-400 bg-eduGreen-500/10 px-2 py-0.5 rounded-md border border-eduGreen-500/20">
                                Anonymous Sanctuary
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> End-to-End Pseudonymized
                            </span>
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white mt-1">
                            Peer Support &amp; Faculty Uplink
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrivacyRulesModalOpen(true)}
                        className="rounded-xl border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-zinc-500 dark:text-zinc-400" />
                        Privacy Rules
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHotlineDrawerOpen(true)}
                        className="rounded-xl border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                        <LifeBuoy className="w-3.5 h-3.5 mr-1.5 text-eduGreen-600 dark:text-eduGreen-400" />
                        Crisis Resources
                    </Button>

                    {(viewState === "ACTIVE" || viewState === "MATCHING") && (
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={triggerPanicExit}
                            className="rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-950/20"
                            title="Shortcut: Press Esc anytime to panic exit"
                        >
                            <LogOut className="w-3.5 h-3.5 mr-1.5" />
                            {viewState === "MATCHING" ? "Cancel Queue" : "Quick Exit (Esc)"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Interactive Stage */}
            <AnimatePresence mode="wait">
                {/* 1. IDLE SELECTION VIEW */}
                {viewState === "IDLE" && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        {/* Channel 1: Peer to Peer */}
                        <div
                            onClick={() => isStudent && handleStartMatch("PEER_TO_PEER")}
                            className={cn(
                                "group bg-white/70 dark:bg-zinc-950/40 backdrop-blur-2xl border rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 shadow-lg",
                                isStudent
                                    ? "border-zinc-300 dark:border-zinc-800/80 hover:border-eduGreen-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 cursor-pointer"
                                    : "border-zinc-200 dark:border-zinc-900 opacity-60 cursor-not-allowed"
                            )}
                        >
                            <div className="space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-eduGreen-500/10 border border-eduGreen-500/30 flex items-center justify-center text-eduGreen-600 dark:text-eduGreen-400 group-hover:scale-105 transition-transform">
                                    <Users className="w-7 h-7" />
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Channel 01</div>
                                <h3 className="text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white group-hover:text-eduGreen-600 dark:group-hover:text-eduGreen-400 transition-colors">
                                    Peer-to-Peer Uplink
                                </h3>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                    Connect anonymously with a fellow student across the secondary school network. Share academic thoughts, talk through stress, or listen without judgment.
                                </p>
                            </div>
                            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-900 mt-6 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Grades 7–12 Only</span>
                                <Button
                                    size="sm"
                                    disabled={!isStudent}
                                    className="rounded-xl text-xs font-bold bg-eduGreen-600 hover:bg-eduGreen-500 text-white dark:text-zinc-950 shadow-md shadow-eduGreen-900/20 dark:shadow-none transition-all"
                                >
                                    Join Queue
                                </Button>
                            </div>
                        </div>

                        {/* Channel 2: Faculty Mentorship */}
                        <div
                            onClick={() => handleStartMatch("FACULTY_MENTOR")}
                            className="group bg-white/70 dark:bg-zinc-950/40 backdrop-blur-2xl border border-zinc-300 dark:border-zinc-800/80 hover:border-sky-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 rounded-3xl p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 shadow-lg"
                        >
                            <div className="space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                                    <HeartHandshake className="w-7 h-7" />
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Channel 02</div>
                                <h3 className="text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                    Educator Mentorship
                                </h3>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                    {isStudent
                                        ? "Connect with a verified teacher or school counselor for academic guidance, guidance questions, or confidential encouragement."
                                        : "Offer supportive, anonymous academic mentorship and guidance to verified students seeking counseling across the network."}
                                </p>
                            </div>
                            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-900 mt-6 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Verified Educators</span>
                                <Button
                                    size="sm"
                                    className="rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-900/20 dark:shadow-none transition-all"
                                >
                                    {isStudent ? "Connect with Mentor" : "Accept Students"}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 2. MATCHMAKING RADAR VIEW */}
                {viewState === "MATCHING" && (
                    <motion.div
                        key="matching"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white/80 dark:bg-zinc-950/40 backdrop-blur-2xl border border-zinc-300 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-6 shadow-2xl"
                    >
                        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                            <motion.div
                                animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                                className="absolute inset-0 rounded-full bg-eduGreen-500/20 border border-eduGreen-500/40"
                            />
                            <div className="w-16 h-16 rounded-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-eduGreen-600 dark:text-eduGreen-400 relative z-10 shadow-lg">
                                <Shield className="w-8 h-8 animate-pulse" />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white">
                                Scanning Anonymous Network
                            </h2>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                Matching you with a verified participant in {selectedMode === "PEER_TO_PEER" ? "Peer Support" : "Faculty Mentorship"} mode.
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-400">
                            <span>Queue Elapsed:</span>
                            <span className="text-eduGreen-600 dark:text-eduGreen-400 font-bold">{queueTimer}s</span>
                        </div>

                        <div className="pt-4 flex justify-center">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setViewState("IDLE");
                                    setWaitingSessionId(null);
                                }}
                                className="rounded-xl border-zinc-300 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300"
                            >
                                Cancel Search
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* 3. ACTIVE SANCTUARY ROOM */}
                {viewState === "ACTIVE" && sessionData && (
                    <motion.div
                        key="active"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="relative bg-white/80 dark:bg-zinc-950/60 backdrop-blur-2xl border border-zinc-300 dark:border-zinc-800 rounded-3xl flex flex-col h-[650px] shadow-2xl overflow-hidden"
                    >
                        {/* Out-of-Focus Privacy Blur Shield */}
                        {isWindowBlurred && (
                            <div className="absolute inset-0 z-40 bg-zinc-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-3">
                                <CameraOff className="w-12 h-12 text-zinc-400 animate-pulse" />
                                <h3 className="text-base font-bold uppercase tracking-tight text-white">Sanctuary Privacy Shield Active</h3>
                                <p className="text-xs text-zinc-400 max-w-sm">
                                    Conversation content is obscured while your window is out of focus to protect confidentiality against background recording or screen captures.
                                </p>
                                <span className="text-[10px] uppercase font-mono text-eduGreen-400 bg-eduGreen-950/50 px-3 py-1 rounded-full border border-eduGreen-500/30">
                                    Click window to resume
                                </span>
                            </div>
                        )}

                        {/* Room Bar */}
                        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-eduGreen-500/10 border border-eduGreen-500/30 flex items-center justify-center text-eduGreen-600 dark:text-eduGreen-400 font-black text-xs">
                                    <EyeOff className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                            {sessionData.partnerPseudo || "Anonymous Peer"}
                                        </span>
                                        <span className="text-[9px] font-black uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700">
                                            {sessionData.partnerRole === "STUDENT" ? "Peer Scholar" : "Faculty Mentor"}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                        Speaking as <strong className="text-eduGreen-600 dark:text-eduGreen-400 font-semibold">{sessionData.myPseudo}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setReportModalOpen(true)}
                                    className="rounded-lg text-zinc-500 hover:text-rose-500 text-xs"
                                >
                                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                    Report
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={triggerPanicExit}
                                    className="rounded-lg border-zinc-300 dark:border-zinc-800 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
                                >
                                    End Chat
                                </Button>
                            </div>
                        </div>

                        {/* Crisis Banner Notice if triggered */}
                        {crisisAlert && (
                            <div className="bg-eduGreen-50 dark:bg-eduGreen-950/40 border-b border-eduGreen-200 dark:border-eduGreen-500/30 px-6 py-3 flex items-center justify-between text-xs text-eduGreen-800 dark:text-eduGreen-300">
                                <div className="flex items-center gap-2">
                                    <HeartHandshake className="w-4 h-4 text-eduGreen-600 dark:text-eduGreen-400 shrink-0" />
                                    <span>{crisisAlert.name}: <strong>{crisisAlert.contact}</strong></span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setHotlineDrawerOpen(true)}
                                    className="text-[10px] uppercase font-bold text-eduGreen-700 dark:text-eduGreen-400 hover:text-eduGreen-800 dark:hover:text-eduGreen-300"
                                >
                                    View Resources
                                </Button>
                            </div>
                        )}

                        {/* Message Timeline with Anti-Copy and Watermark Protection */}
                        <div
                            onCopy={(e) => {
                                e.preventDefault();
                                setPrivacyToast("Copying or exporting Sanctuary transcripts is strictly blocked to protect peer privacy.");
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setPrivacyToast("Right-click actions are disabled on active Sanctuary transcripts.");
                            }}
                            className="relative flex-1 p-6 overflow-y-auto space-y-4 select-none"
                        >
                            {/* Subtle Dynamic Watermark */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] dark:opacity-[0.04] text-[40px] font-black uppercase tracking-widest text-center select-none rotate-[-20deg]">
                                CONFIDENTIAL SANCTUARY // NO CAPTURE // {sessionData.id.slice(-6).toUpperCase()}
                            </div>

                            <div className="text-center my-4">
                                <div className="inline-block px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-800 text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                                    Session initialized. Real-time PII filtering &amp; anti-screenshot shields active.
                                </div>
                            </div>

                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex flex-col max-w-[75%] relative z-10",
                                        msg.isMe ? "ml-auto items-end" : "mr-auto items-start"
                                    )}
                                >
                                    <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1 px-1">
                                        {msg.senderName}
                                    </div>
                                    <div
                                        className={cn(
                                            "p-4 rounded-2xl text-xs leading-relaxed break-words shadow-md select-none",
                                            msg.isMe
                                                ? "bg-eduGreen-600 text-white dark:text-zinc-950 font-semibold rounded-tr-sm"
                                                : "bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 rounded-tl-sm"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                    <span className="text-[9px] text-zinc-500 dark:text-zinc-500 mt-1 px-1">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Composer */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/20 flex gap-2">
                            <Input
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                placeholder="Type a supportive message (phone numbers and handles are automatically filtered)..."
                                className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                                disabled={isSending}
                            />
                            <Button
                                type="submit"
                                disabled={!inputText.trim() || isSending}
                                className="rounded-xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white dark:text-zinc-950 font-bold px-5 shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </motion.div>
                )}

                {/* 4. ENDED STATE VIEW */}
                {viewState === "ENDED" && (
                    <motion.div
                        key="ended"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white/80 dark:bg-zinc-950/40 backdrop-blur-2xl border border-zinc-300 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-4 shadow-xl"
                    >
                        <CheckCircle2 className="w-12 h-12 text-eduGreen-600 dark:text-eduGreen-500 mx-auto" />
                        <h2 className="text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white">Session Concluded</h2>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                            The anonymous session has dissolved. No persistent messages remain on your active dashboard.
                        </p>
                        <div className="pt-4 flex justify-center gap-3">
                            <Button
                                onClick={() => setViewState("IDLE")}
                                className="rounded-xl text-xs font-bold bg-eduGreen-600 hover:bg-eduGreen-500 text-white dark:text-zinc-950 shadow-md shadow-eduGreen-900/20 dark:shadow-none"
                            >
                                Start New Session
                            </Button>
                            <Button
                                onClick={() => router.push("/dashboard")}
                                variant="outline"
                                className="rounded-xl text-xs border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                            >
                                Return to Dashboard
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Privacy & Confidentiality Rules Modal */}
            <AnimatePresence>
                {privacyRulesModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-eduGreen-600 dark:text-eduGreen-400">
                                    <Lock className="w-6 h-6" />
                                    <h3 className="text-lg font-bold uppercase tracking-tight text-zinc-900 dark:text-white">Sanctuary Privacy &amp; Conduct Rules</h3>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setPrivacyRulesModalOpen(false)} className="rounded-xl text-xs text-zinc-600 dark:text-zinc-400">
                                    Close
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                        <CameraOff className="w-4 h-4 text-rose-500" />
                                        <span>1. Zero Screenshots &amp; Zero Leaks</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                        Capturing, recording, copying, or distributing conversation transcripts is strictly prohibited by school policy.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                        <EyeOff className="w-4 h-4 text-eduGreen-500" />
                                        <span>2. Ephemeral Lifespan</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                        Sessions dissolve immediately upon ending. No message transcripts remain stored on your active dashboard.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                        <CopyX className="w-4 h-4 text-sky-500" />
                                        <span>3. No Doxxing or Personal Identifiers</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                        Do not request or share phone numbers, social media handles, addresses, or personal real names. System filters automatically block shared handles.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                                        <span>4. Safety &amp; Disciplinary Consequences</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                        Any verified harassment, bullying, or leak attempt results in permanent loss of Sanctuary access and referral to school leadership.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Abuse / Safety Report Modal */}
            <AnimatePresence>
                {reportModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                                <AlertTriangle className="w-6 h-6" />
                                <h3 className="text-base font-bold uppercase tracking-tight text-zinc-900 dark:text-white">Report Safety Concern</h3>
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Submitting a report terminates the session immediately and securely records an encrypted transcript snapshot for school counselor safety audit.
                            </p>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Reason for Report</label>
                                <textarea
                                    value={reportReason}
                                    onChange={e => setReportReason(e.target.value)}
                                    placeholder="Please describe why this session is unsafe (e.g. cyberbullying, harassment, self-harm crisis, explicit content)..."
                                    className="w-full h-24 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-rose-500 resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setReportModalOpen(false)}
                                    className="rounded-xl text-xs text-zinc-600 dark:text-zinc-400"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleReportSubmit}
                                    disabled={!reportReason.trim() || isReporting}
                                    className="rounded-xl text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold"
                                >
                                    {isReporting ? "Filing Report..." : "Submit Report & Dissolve"}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Crisis Hotline Drawer */}
            <AnimatePresence>
                {hotlineDrawerOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-eduGreen-600 dark:text-eduGreen-400">
                                    <LifeBuoy className="w-6 h-6" />
                                    <h3 className="text-lg font-bold uppercase tracking-tight text-zinc-900 dark:text-white">Crisis &amp; Mental Health Helplines</h3>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setHotlineDrawerOpen(false)} className="rounded-xl text-xs text-zinc-600 dark:text-zinc-400">
                                    Close
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                                        <span>National Crisis &amp; Suicide Lifeline</span>
                                        <span className="text-eduGreen-600 dark:text-eduGreen-400 font-mono">Dial 988</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Free, confidential support available 24 hours a day, 7 days a week.</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                                        <span>Youth Crisis Text Line</span>
                                        <span className="text-eduGreen-600 dark:text-eduGreen-400 font-mono">Text HOME to 741741</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Free 24/7 crisis support via SMS messaging.</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                                        <span>School Academic Guidance Desk</span>
                                        <span className="text-eduGreen-600 dark:text-eduGreen-400 font-mono">Dean / Counselor Desk</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Contact your school administration or student counselor for academic and personal assistance.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
