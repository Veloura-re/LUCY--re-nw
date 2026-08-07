"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
    Search, Send, MoreVertical, Loader2, MessageSquare, 
    Paperclip, Sparkles, ChevronRight, ArrowLeft, Users, 
    Hash, School, GraduationCap, ShieldAlert, CheckCheck, 
    FileText, Megaphone, Briefcase, ChevronDown, Plus, 
    Smile, CornerDownLeft, ShieldCheck, User as UserIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { AlertModal } from "@/components/ui/confirmation-modal";
import { usePreferences } from "@/hooks/use-preferences";

interface MessagesClientWrapperProps {
    me: any;
    initialRooms?: any[];
    initialCampusChannels?: any[];
    initialClassCohorts?: any[];
    initialDirectChats?: any[];
    initialActiveRoom?: any;
    initialMessages?: any[];
    initialNextCursor?: string | null;
    initialTargetUserId?: string | null;
}

export default function MessagesClientWrapper({ 
    me, 
    initialRooms = [],
    initialCampusChannels = [],
    initialClassCohorts = [],
    initialDirectChats = [],
    initialActiveRoom, 
    initialMessages = [],
    initialNextCursor = null,
    initialTargetUserId = null
}: MessagesClientWrapperProps) {
    const supabase = createClient();
    const router = useRouter();
    const { preferences } = usePreferences();

    // Channel State
    const [campusChannels, setCampusChannels] = useState<any[]>(initialCampusChannels);
    const [classCohorts, setClassCohorts] = useState<any[]>(initialClassCohorts);
    const [directChats, setDirectChats] = useState<any[]>(initialDirectChats);
    const [activeRoom, setActiveRoom] = useState<any>(initialActiveRoom || initialCampusChannels[0] || initialRooms[0] || null);
    
    // Message State
    const [messages, setMessages] = useState<any[]>(initialMessages);
    const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
    const [newMessage, setNewMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    
    // UI Accordions & Drawers
    const [showClassSection, setShowClassSection] = useState(true);
    const [showDirectSection, setShowDirectSection] = useState(true);
    const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Initial Fetch on Mount
    useEffect(() => {
        fetchChannels();
    }, []);

    useEffect(() => {
        if (activeRoom?.id && messages.length === 0) {
            fetchMessages(activeRoom.id);
        }
    }, [activeRoom]);

    useEffect(() => {
        if (initialTargetUserId) {
            startChat({ id: initialTargetUserId });
        }
    }, [initialTargetUserId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Real-time Supabase Subscription
    useEffect(() => {
        if (!me) return;

        const channel = supabase
            .channel('lucy-realtime-messages-stream')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Message' },
                async (payload) => {
                    const msg = payload.new as any;
                    
                    if (activeRoom?.id === msg.chatRoomId) {
                        const enrichedMsg = {
                            ...msg,
                            fromUser: msg.fromUser || (msg.fromUserId === me.id 
                                ? { name: me.user_metadata?.name || me.dbUser?.name || 'Me', role: me.dbUser?.role || 'Campus Member' } 
                                : (activeRoom.partner || { name: 'Campus Member', role: 'Staff' }))
                        };
                        setMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) return prev;
                            return [...prev, enrichedMsg];
                        });
                    }
                    
                    fetchChannels();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [me, activeRoom]);

    const fetchChannels = async () => {
        try {
            const res = await fetch('/api/messages/rooms');
            const data: any = await res.json();
            if (data.campusChannels) setCampusChannels(data.campusChannels);
            if (data.classCohorts) setClassCohorts(data.classCohorts);
            if (data.directChats) setDirectChats(data.directChats);

            if (!activeRoom && (data.campusChannels?.[0] || data.rooms?.[0])) {
                const defaultRoom = data.campusChannels?.[0] || data.rooms?.[0];
                setActiveRoom(defaultRoom);
                fetchMessages(defaultRoom.id);
            }
        } catch (e) {
            console.error("Failed to fetch channels", e);
        }
    };

    const fetchMessages = async (chatRoomId: string) => {
        setLoadingMessages(true);
        try {
            const res = await fetch(`/api/messages?chatRoomId=${chatRoomId}`);
            const data: any = await res.json();
            if (data.messages) {
                setMessages(data.messages);
                setNextCursor(data.nextCursor);
            }
        } catch (e) {
            console.error("Failed to fetch messages", e);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !activeRoom) return;

        const content = newMessage;
        setNewMessage("");

        const tempId = 'temp-' + Date.now();
        const tempMsg = {
            id: tempId,
            content,
            createdAt: new Date().toISOString(),
            fromUserId: me.id,
            chatRoomId: activeRoom.id,
            fromUser: { name: me.user_metadata?.name || me.dbUser?.name || 'Me', role: me.dbUser?.role || 'OWNER' },
            isOptimistic: true
        };

        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatRoomId: activeRoom.id,
                    content
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                setAlertConfig({
                    title: "Message Transmission Failed",
                    message: errData.error || "Unable to deliver transmission.",
                    isOpen: true,
                    variant: "error"
                });
                setMessages(prev => prev.filter(m => m.id !== tempId));
            } else {
                const sentData = await res.json();
                setMessages(prev => prev.map(m => m.id === tempId ? (sentData.message || m) : m));
            }
        } catch (err: any) {
            setAlertConfig({
                title: "Network Offline",
                message: err.message,
                isOpen: true,
                variant: "error"
            });
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const res = await fetch(`/api/school/users/search?q=${encodeURIComponent(query)}`);
            const data: any = await res.json();
            if (data.users) setSearchResults(data.users);
        } catch (e) {
            console.error(e);
        }
    };

    const startChat = async (targetUser: any) => {
        try {
            const targetId = typeof targetUser === 'string' ? targetUser : (targetUser?.id || targetUser?.userId);
            if (!targetId) return;

            const res = await fetch('/api/messages/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: targetId })
            });

            const data: any = await res.json();
            if (data.error) {
                setAlertConfig({ title: "Action Restricted", message: data.error, isOpen: true, variant: "error" });
                return;
            }

            if (data.room) {
                setDirectChats(prev => {
                    const exists = prev.find(r => r.id === data.room.id);
                    if (exists) {
                        return prev.map(r => r.id === data.room.id ? { ...r, ...data.room } : r);
                    }
                    return [data.room, ...prev];
                });
                setActiveRoom(data.room);
                setMessages([]);
                fetchMessages(data.room.id);
                setSearchQuery("");
                setSearchResults([]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const selectRoom = (room: any) => {
        setActiveRoom(room);
        setMessages([]);
        fetchMessages(room.id);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] animate-in fade-in duration-300 relative max-w-full overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-eduGreen-500/10 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />

            {/* THREE-PANE DISCORD / SLACK WORKSPACE CONTAINER */}
            <div className="flex-1 flex overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-900/60 rounded-[2.5rem] relative z-10 w-full min-w-0 shadow-2xl">
                
                {/* 1. LEFT CHANNEL RAIL (320px) */}
                <div className={cn(
                    "w-full md:w-80 border-r border-zinc-200 dark:border-zinc-900/60 flex flex-col bg-white/50 dark:bg-zinc-950/50 shrink-0",
                    activeRoom ? "hidden md:flex" : "flex"
                )}>
                    {/* School Identity & Status */}
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-900/60 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-eduGreen-600/20 border border-eduGreen-500/30 flex items-center justify-center text-eduGreen-500 font-black text-xs">
                                🏫
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight truncate">
                                    Institutional Net
                                </h2>
                                <div className="flex items-center gap-1.5 text-[9px] font-mono text-eduGreen-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Campus Comms
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Search Bar */}
                    <div className="p-3 border-b border-zinc-200 dark:border-zinc-900/40">
                        <div className="relative">
                            <Input
                                placeholder="Jump to channel or staff..."
                                className="bg-zinc-100 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 h-10 rounded-xl text-xs pl-8 placeholder:text-zinc-500"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3.5" />
                        </div>
                    </div>

                    {/* Channel Streams Scroll Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-5">
                        {searchQuery.length > 0 ? (
                            <div className="space-y-1.5">
                                <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest px-2">
                                    Search Matches
                                </span>
                                {searchResults.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => startChat(user)}
                                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-eduGreen-950/20 text-left group transition-all border border-transparent hover:border-eduGreen-500/30"
                                    >
                                        <Avatar className="h-8 w-8 border border-zinc-300 dark:border-zinc-800">
                                            <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-xs font-bold">{user.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden flex-1">
                                            <div className="text-xs font-bold text-zinc-900 dark:text-white uppercase truncate">{user.name}</div>
                                            <div className="text-[8px] text-zinc-500 uppercase tracking-widest">{user.role}</div>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-eduGreen-400" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <>
                                {/* 📢 UNIVERSAL CAMPUS CHANNELS */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between px-2 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5">
                                            <Megaphone className="w-3 h-3 text-eduGreen-500" />
                                            Campus Broadcasts
                                        </span>
                                        <span>{campusChannels.length}</span>
                                    </div>
                                    <div className="space-y-0.5 mt-1">
                                        {campusChannels.map(channel => {
                                            const isSelected = activeRoom?.id === channel.id;
                                            return (
                                                <button
                                                    key={channel.id}
                                                    onClick={() => selectRoom(channel)}
                                                    className={cn(
                                                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-xs font-bold tracking-tight",
                                                        isSelected 
                                                            ? "bg-eduGreen-600/15 text-eduGreen-600 dark:text-eduGreen-400 border border-eduGreen-500/30 shadow-sm" 
                                                            : "text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white"
                                                    )}
                                                >
                                                    <Hash className={cn("w-4 h-4 shrink-0", isSelected ? "text-eduGreen-500" : "text-zinc-400")} />
                                                    <span className="truncate flex-1">{channel.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 🏫 CLASS COHORT CHANNELS */}
                                <div className="space-y-1">
                                    <button 
                                        onClick={() => setShowClassSection(!showClassSection)}
                                        className="w-full flex items-center justify-between px-2 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <School className="w-3 h-3 text-emerald-500" />
                                            Class Cohorts
                                        </span>
                                        <ChevronDown className={cn("w-3 h-3 transition-transform", !showClassSection && "-rotate-90")} />
                                    </button>
                                    
                                    {showClassSection && (
                                        <div className="space-y-0.5 mt-1">
                                            {classCohorts.length === 0 ? (
                                                <div className="text-[10px] text-zinc-500 italic px-3 py-1">No active classes registered</div>
                                            ) : (
                                                classCohorts.map(channel => {
                                                    const isSelected = activeRoom?.id === channel.id;
                                                    return (
                                                        <button
                                                            key={channel.id}
                                                            onClick={() => selectRoom(channel)}
                                                            className={cn(
                                                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-xs font-bold tracking-tight",
                                                                isSelected 
                                                                    ? "bg-eduGreen-600/15 text-eduGreen-600 dark:text-eduGreen-400 border border-eduGreen-500/30 shadow-sm" 
                                                                    : "text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white"
                                                            )}
                                                        >
                                                            <GraduationCap className={cn("w-4 h-4 shrink-0", isSelected ? "text-emerald-500" : "text-zinc-400")} />
                                                            <span className="truncate flex-1">{channel.name}</span>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 💬 DIRECT MESSAGES (1-ON-1) */}
                                <div className="space-y-1">
                                    <button 
                                        onClick={() => setShowDirectSection(!showDirectSection)}
                                        className="w-full flex items-center justify-between px-2 text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <MessageSquare className="w-3 h-3 text-blue-500" />
                                            Direct Messages
                                        </span>
                                        <ChevronDown className={cn("w-3 h-3 transition-transform", !showDirectSection && "-rotate-90")} />
                                    </button>

                                    {showDirectSection && (
                                        <div className="space-y-0.5 mt-1">
                                            {directChats.length === 0 ? (
                                                <div className="text-[10px] text-zinc-500 italic px-3 py-1">Search staff above to start DM</div>
                                            ) : (
                                                directChats.map(channel => {
                                                    const isSelected = activeRoom?.id === channel.id;
                                                    const partnerName = channel.partner?.name || 'Direct Contact';
                                                    return (
                                                        <button
                                                            key={channel.id}
                                                            onClick={() => selectRoom(channel)}
                                                            className={cn(
                                                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-xs font-bold tracking-tight",
                                                                isSelected 
                                                                    ? "bg-eduGreen-600/15 text-eduGreen-600 dark:text-eduGreen-400 border border-eduGreen-500/30 shadow-sm" 
                                                                    : "text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white"
                                                            )}
                                                        >
                                                            <Avatar className="h-6 w-6 border border-zinc-300 dark:border-zinc-800">
                                                                <AvatarFallback className="text-[10px] font-bold">{partnerName[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="truncate flex-1">
                                                                <div className="truncate">{partnerName}</div>
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bottom User Bar */}
                    <div className="p-3 border-t border-zinc-200 dark:border-zinc-900/60 bg-white/40 dark:bg-zinc-950/40 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 border border-eduGreen-500/40">
                                <AvatarFallback className="bg-eduGreen-600 text-white text-xs font-bold">
                                    {me.user_metadata?.name?.[0] || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden">
                                <div className="text-xs font-black text-zinc-900 dark:text-white uppercase truncate">
                                    {me.user_metadata?.name || 'Me'}
                                </div>
                                <div className="text-[8px] font-mono text-eduGreen-500 uppercase tracking-widest">
                                    {me.dbUser?.role || 'Campus Member'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. CENTER CHAT TIMELINE */}
                <div className={cn(
                    "flex-1 flex flex-col bg-white/20 dark:bg-zinc-950/20 relative min-w-0",
                    !activeRoom ? "hidden md:flex" : "flex"
                )}>
                    {activeRoom ? (
                        <>
                            {/* Room Header Banner */}
                            <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-900/60 flex items-center justify-between bg-white/60 dark:bg-zinc-950/60 backdrop-blur-3xl shrink-0">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveRoom(null)}>
                                        <ArrowLeft className="w-5 h-5" />
                                    </Button>

                                    <div className="w-10 h-10 rounded-xl bg-eduGreen-500/15 border border-eduGreen-500/30 flex items-center justify-center font-bold text-eduGreen-500 shrink-0">
                                        {activeRoom.type === 'GROUP' ? <Hash className="w-5 h-5" /> : (activeRoom.partner?.name?.[0] || 'U')}
                                    </div>

                                    <div className="overflow-hidden">
                                        <div className="font-black text-sm text-zinc-900 dark:text-white uppercase tracking-tight truncate">
                                            {activeRoom.type === 'GROUP' ? activeRoom.name : (activeRoom.partner?.name || 'Direct Channel')}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 truncate">
                                            {activeRoom.description || (activeRoom.type === 'GROUP' ? 'Institutional channel' : 'Encrypted direct transmission')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setShowDetailsDrawer(!showDetailsDrawer)}
                                        className="rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                    >
                                        <Users className="w-4 h-4 mr-1.5" /> Roster
                                    </Button>
                                </div>
                            </div>

                            {/* Chat Messages Stream */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                                {loadingMessages ? (
                                    <div className="h-full flex items-center justify-center">
                                        <SpringingLoader message="Synthesizing Channel Transmissions..." />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                                        <div className="w-16 h-16 rounded-3xl bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center text-eduGreen-500">
                                            <MessageSquare className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-base font-black uppercase text-zinc-900 dark:text-white">
                                            Channel Live & Ready
                                        </h3>
                                        <p className="text-xs text-zinc-500 max-w-sm">
                                            Welcome to {activeRoom.name || 'this direct transmission'}. Post updates, coordination notes, and curriculum questions.
                                        </p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isMine = msg.fromUserId === me.id;
                                        return (
                                            <div 
                                                key={msg.id || idx} 
                                                className={cn("flex flex-col", isMine ? "items-end" : "items-start")}
                                            >
                                                {!isMine && (
                                                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1 px-1 flex items-center gap-1.5">
                                                        {msg.fromUser?.name || "Campus Member"}
                                                        {msg.fromUser?.role && (
                                                            <span className="px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-[8px]">
                                                                {msg.fromUser.role}
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                                <div className={cn(
                                                    "max-w-[75%] p-4 rounded-2xl text-xs leading-relaxed shadow-md",
                                                    isMine 
                                                        ? "bg-eduGreen-600 text-white rounded-tr-none font-medium" 
                                                        : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 text-zinc-900 dark:text-white rounded-tl-none"
                                                )}>
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                    <div className={cn(
                                                        "text-[8px] font-mono mt-2 text-right opacity-70",
                                                        isMine ? "text-white" : "text-zinc-500"
                                                    )}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Rich Message Console */}
                            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-200 dark:border-zinc-900/60 bg-white/40 dark:bg-zinc-950/40 flex items-center gap-3">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`Message ${activeRoom.name || 'direct channel'}...`}
                                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl h-12 text-xs"
                                />
                                <Button 
                                    type="submit" 
                                    disabled={!newMessage.trim()}
                                    className="h-12 px-6 rounded-xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-bold text-xs uppercase tracking-widest shrink-0 shadow-lg shadow-eduGreen-600/20"
                                >
                                    <Send className="w-4 h-4 mr-1.5" /> Send
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                            <School className="w-12 h-12 text-zinc-400 animate-pulse" />
                            <h2 className="text-xl font-black uppercase text-zinc-900 dark:text-white">
                                Institutional Comms Hub
                            </h2>
                            <p className="text-xs text-zinc-500 max-w-sm">
                                Select a campus channel or class cohort from the rail to begin.
                            </p>
                        </div>
                    )}
                </div>

                {/* 3. RIGHT DETAILS & MEMBER DRAWER (Collapsible) */}
                {showDetailsDrawer && activeRoom && (
                    <div className="w-72 border-l border-zinc-200 dark:border-zinc-900/60 bg-white/50 dark:bg-zinc-950/50 p-4 space-y-6 hidden lg:block">
                        <div>
                            <span className="text-[9px] font-mono font-bold text-eduGreen-500 uppercase tracking-widest block mb-1">
                                Channel Info
                            </span>
                            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase">
                                {activeRoom.name}
                            </h3>
                            <p className="text-xs text-zinc-500 mt-1">
                                {activeRoom.description || "Active institutional transmission space."}
                            </p>
                        </div>

                        <div className="border-t border-zinc-200 dark:border-zinc-900/60 pt-4 space-y-3">
                            <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
                                Channel Governance
                            </span>
                            <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                                <ShieldCheck className="w-4 h-4 text-eduGreen-500" />
                                <span>Multi-Tenant Encrypted</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                variant={alertConfig.variant}
            />
        </div>
    );
}
