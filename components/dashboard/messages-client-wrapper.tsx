"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Send, User, MoreVertical, Loader2, Signal, Shield, MessageSquare, Paperclip, Check, CheckCheck, Pin, Users, ImageIcon, FileText, Sparkles, ChevronRight, ArrowLeft, X, Trash2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import Image from "next/image";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { AlertModal } from "@/components/ui/confirmation-modal";

interface MessagesClientWrapperProps {
    me: any;
    initialRooms: any[];
    initialActiveRoom?: any;
    initialMessages?: any[];
    initialNextCursor?: string | null;
    initialTargetUserId?: string | null;
}

import { usePreferences } from "@/hooks/use-preferences";

export default function MessagesClientWrapper({ 
    me, 
    initialRooms, 
    initialActiveRoom, 
    initialMessages = [],
    initialNextCursor = null,
    initialTargetUserId = null
}: MessagesClientWrapperProps) {
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Core State
    const { preferences } = usePreferences();
    const [rooms, setRooms] = useState<any[]>(initialRooms);
    const [activeRoom, setActiveRoom] = useState<any>(initialActiveRoom);
    const [messages, setMessages] = useState<any[]>(initialMessages);
    const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
    
    // UI State
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchType, setSearchType] = useState<'normal' | 'studentCode'>('normal');
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const topMessageRef = useRef<HTMLDivElement>(null);

    // Initial Fetch (if needed)
    useEffect(() => {
        if (activeRoom && initialMessages.length === 0) {
            fetchMessages(activeRoom.id);
        }
    }, [activeRoom]);

    // Handle incoming initialTargetUserId to auto-open chat
    useEffect(() => {
        if (initialTargetUserId && !initialActiveRoom) {
            startChat({ id: initialTargetUserId });
        }
    }, [initialTargetUserId, initialActiveRoom]);

    // Infinite Scroll Implementation
    const loadMoreMessages = useCallback(async () => {
        if (!activeRoom || !nextCursor || loadingMore) return;
        
        setLoadingMore(true);
        try {
            const res = await fetch(`/api/messages?chatRoomId=${activeRoom.id}&cursor=${nextCursor}`);
            const data: any = await res.json();
            if (data.messages) {
                // Prepend older messages
                setMessages(prev => [...data.messages, ...prev]);
                setNextCursor(data.nextCursor);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMore(false);
        }
    }, [activeRoom, nextCursor, loadingMore]);

    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && nextCursor) {
                loadMoreMessages();
            }
        }, { threshold: 0.1 });

        if (topMessageRef.current) observerRef.current.observe(topMessageRef.current);

        return () => observerRef.current?.disconnect();
    }, [messages, nextCursor, loadMoreMessages]);

    // Real-time Handlers
    useEffect(() => {
        if (!me) return;

        const channel = supabase
            .channel('advanced-messaging')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Message' },
                async (payload) => {
                    const msg = payload.new;
                    
                    // Check if message is for a room I'm in
                    const roomIdx = rooms.findIndex(r => r.id === msg.chatRoomId);
                    if (roomIdx !== -1) {
                        if (activeRoom?.id === msg.chatRoomId) {
                            // Only append if it's not from me (optimistic UI handles mine)
                            setMessages(prev => {
                                if (prev.some(m => m.id === msg.id)) return prev;
                                return [...prev, msg];
                            });
                            markAsRead(activeRoom.id);
                        }
                        
                        // Play Chat Sound if enabled and not from me
                        if (msg.fromUserId !== me.id && preferences?.chatSounds !== false) {
                            try {
                                // Fetch latest preferences dynamically or assume enabled if not explicitly false
                                // For immediate sync, we can check localStorage or the global window object if needed, 
                                // but a simple read of document body class or similar is fast.
                                // Actually, let's play a high-tech "neural" chirp using Web Audio API
                                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                                if (AudioContext) {
                                    const ctx = new AudioContext();
                                    const osc = ctx.createOscillator();
                                    const gain = ctx.createGain();
                                    osc.connect(gain);
                                    gain.connect(ctx.destination);
                                    osc.type = 'sine';
                                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                                    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
                                    gain.gain.setValueAtTime(0, ctx.currentTime);
                                    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
                                    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
                                    osc.start(ctx.currentTime);
                                    osc.stop(ctx.currentTime + 0.2);
                                }
                            } catch (e) {
                                console.error('Chat sound failed', e);
                            }
                        }

                        // Refresh room list positions
                        fetchRooms();
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [me, activeRoom, rooms, preferences]);

    // Data Actions
    const fetchRooms = async () => {
        try {
            const res = await fetch('/api/messages/rooms');
            const data: any = await res.json();
            if (data.rooms) setRooms(data.rooms);
        } catch (e) { console.error(e); }
    };

    const fetchMessages = async (chatRoomId: string) => {
        try {
            const res = await fetch(`/api/messages?chatRoomId=${chatRoomId}`);
            const data: any = await res.json();
            if (data.messages) {
                setMessages(data.messages);
                setNextCursor(data.nextCursor);
            }
        } catch (e) { console.error(e); }
    };

    const markAsRead = async (chatRoomId: string) => {
        try {
            await fetch('/api/messages/read', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatRoomId })
            });
            setRooms(prev => prev.map(r => r.id === chatRoomId ? { ...r, unreadCount: 0 } : r));
        } catch (e) { console.error(e); }
    };

    const handleSendMessage = async (e?: React.FormEvent, attachments?: any) => {
        if (e) e.preventDefault();
        if ((!newMessage.trim() && !attachments) || !activeRoom) return;

        const content = newMessage;
        setNewMessage("");

        // Optimistic Update
        const tempId = 'temp-' + Date.now();
        const tempMsg = {
            id: tempId,
            content,
            attachments,
            createdAt: new Date().toISOString(),
            fromUserId: me.id,
            chatRoomId: activeRoom.id,
            fromUser: { name: me.user_metadata?.name || 'Me' },
            isOptimistic: true
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatRoomId: activeRoom.id, content, attachments })
            });

            if (!res.ok) {
                setMessages(prev => prev.filter(m => m.id !== tempId));
                setAlertConfig({ title: "Transmission Error", message: "The neural signal could not be relayed.", isOpen: true, variant: "error" });
            } else {
                fetchRooms();
                // Replace temp with real response to avoid flashes
                const data: any = await res.json();
                setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
            }
        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            const isStudent = me?.user_metadata?.role === 'STUDENT';
            const endpoint = isStudent ? `/api/students/lookup?code=${query}` : `/api/school/users/search?q=${query}`;
            const res = await fetch(endpoint);
            const data: any = await res.json();
            if (data.users) {
                setSearchResults(data.users);
                setSearchType(data.type === 'studentCode' ? 'studentCode' : 'normal');
            }
        } catch (e) { console.error(e); }
    };

    const startChat = async (user: any) => {
        try {
            const res = await fetch('/api/messages/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: user.id })
            });
            const data: any = await res.json();
            if (data.room) {
                await fetchRooms();
                setActiveRoom(data.room);
                setSearchQuery("");
                setSearchResults([]);
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-300 relative max-w-full overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-eduGreen-500/10 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="mb-8 flex justify-between items-end relative z-10">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-eduGreen-950/30 border border-eduGreen-500/20 text-[10px] font-medium text-eduGreen-400 uppercase tracking-[0.3em] mb-4 backdrop-blur-md">
                        <Sparkles className="w-3 h-3" />
                        <span>Institutional Neural Link</span>
                    </div>
                    <h1 className="text-4xl font-medium text-white tracking-tighter uppercase italic">
                        Message <span className="text-eduGreen-500 not-italic">Hub</span>
                    </h1>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden bg-zinc-950/40 backdrop-blur-3xl border border-zinc-900/50 rounded-[2rem] relative z-10 w-full min-w-0">
                {/* Sidebar */}
                <div className={cn("w-full md:w-80 border-r border-zinc-900/50 flex flex-col bg-zinc-950/20 relative shrink-0", activeRoom ? "hidden md:flex" : "flex")}>
                    <div className="p-4 border-b border-zinc-900/50 bg-zinc-950/40">
                        <Input
                            placeholder="Identify node..."
                            className="bg-zinc-900/40 border-zinc-800/50 h-12 rounded-xl text-xs"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {searchQuery.length > 0 ? (
                            searchResults.map(user => (
                                <button key={user.id} onClick={() => startChat(user)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-eduGreen-950/20 text-left group transition-all">
                                    <Avatar className="h-10 w-10 border border-zinc-800"><AvatarFallback>{user.name[0]}</AvatarFallback></Avatar>
                                    <div>
                                        <div className="text-[10px] font-bold text-white uppercase tracking-tight">{user.name}</div>
                                        <div className="text-[8px] text-zinc-500 uppercase tracking-widest">{user.role}</div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            rooms.map(room => (
                                <button 
                                    key={room.id} 
                                    onClick={() => { setActiveRoom(room); setMessages([]); fetchMessages(room.id); }}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-2xl transition-all border text-left group relative",
                                        activeRoom?.id === room.id ? "bg-eduGreen-600/10 border-eduGreen-900/40" : "bg-transparent border-transparent hover:bg-zinc-900/30"
                                    )}
                                >
                                    <Avatar className="h-10 w-10 border border-zinc-800">
                                        <AvatarFallback>{room.type === 'GROUP' ? 'G' : room.partner?.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-[10px] text-white uppercase tracking-tight truncate">{room.type === 'GROUP' ? room.name : room.partner?.name}</span>
                                            {room.unreadCount > 0 && <div className="w-2 h-2 rounded-full bg-eduGreen-500 shadow-[0_0_10px_rgba(33,201,141,0.6)]" />}
                                        </div>
                                        <p className="text-[9px] text-zinc-600 truncate">{room.messages?.[0]?.content || "No records"}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className={cn("flex-1 flex flex-col bg-zinc-950/20 relative min-w-0", !activeRoom ? "hidden md:flex" : "flex")}>
                    {activeRoom ? (
                        <>
                            <div className="h-16 px-6 border-b border-zinc-900/50 flex items-center justify-between bg-zinc-950/60 backdrop-blur-3xl shrink-0">
                                <div className="flex items-center gap-4">
                                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveRoom(null)}><ArrowLeft className="w-5 h-5" /></Button>
                                    <Avatar className="h-10 w-10 border border-eduGreen-500/50"><AvatarFallback>{activeRoom.type === 'GROUP' ? 'G' : activeRoom.partner?.name[0]}</AvatarFallback></Avatar>
                                    <div>
                                        <div className="font-bold text-[10px] text-white uppercase tracking-widest">{activeRoom.type === 'GROUP' ? activeRoom.name : activeRoom.partner?.name}</div>
                                        <div className="text-[8px] text-eduGreen-500/80 uppercase tracking-widest">Neural Link Established</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {nextCursor && (
                                    <div ref={topMessageRef} className="py-4 flex justify-center">
                                        {loadingMore ? <Loader2 className="w-5 h-5 text-eduGreen-500 animate-spin" /> : <div className="h-5" />}
                                    </div>
                                )}
                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn("flex gap-4 max-w-[85%]", msg.fromUserId === me.id ? "ml-auto flex-row-reverse" : "")}
                                    >
                                        <Avatar className="h-8 w-8 shrink-0"><AvatarFallback>{msg.fromUser?.name?.[0] || "?"}</AvatarFallback></Avatar>
                                        <div className={cn("space-y-2", msg.fromUserId === me.id ? "items-end" : "items-start")}>
                                            <div className={cn(
                                                "p-4 rounded-2xl text-xs leading-relaxed border shadow-2xl",
                                                msg.fromUserId === me.id ? "bg-eduGreen-600/10 border-eduGreen-900/50 text-white" : "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                                            )}>
                                                {msg.content}
                                            </div>
                                            <div className="flex items-center gap-2 px-1">
                                                <span className="text-[8px] text-zinc-700 font-mono uppercase tracking-tighter">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <form onSubmit={handleSendMessage} className="p-6 border-t border-zinc-900/50 bg-zinc-950/60 shrink-0">
                                <div className="flex gap-4">
                                    <Input
                                        placeholder="Transmit signal..."
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        className="h-14 bg-zinc-900/40 border-zinc-800 border-2 rounded-2xl text-xs px-6 focus:border-eduGreen-600 transition-all font-medium"
                                    />
                                    <Button type="submit" className="h-14 w-14 rounded-2xl bg-white hover:bg-zinc-200 text-black shrink-0 shadow-lg active:scale-95 transition-all">
                                        <Send className="w-5 h-5" />
                                    </Button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                            <MessageSquare className="w-12 h-12 mb-4" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Initialize Uplink</p>
                        </div>
                    )}
                </div>
            </div>
            
            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                variant={alertConfig.variant === 'error' ? 'error' : 'info'}
            />
        </div>
    );
}
