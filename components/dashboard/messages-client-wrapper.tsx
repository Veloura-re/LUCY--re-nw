"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
    Search, Send, MoreVertical, Loader2, MessageSquare, 
    Paperclip, Sparkles, ChevronRight, ArrowLeft, Users, 
    Hash, School, GraduationCap, ShieldAlert, CheckCheck, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { AlertModal } from "@/components/ui/confirmation-modal";
import { usePreferences } from "@/hooks/use-preferences";

interface MessagesClientWrapperProps {
    me: any;
    initialRooms: any[];
    initialActiveRoom?: any;
    initialMessages?: any[];
    initialNextCursor?: string | null;
    initialTargetUserId?: string | null;
}

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
    const { preferences } = usePreferences();

    // State
    const [rooms, setRooms] = useState<any[]>(initialRooms);
    const [activeRoom, setActiveRoom] = useState<any>(initialActiveRoom);
    const [messages, setMessages] = useState<any[]>(initialMessages);
    const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
    const [activeTab, setActiveTab] = useState<'ALL' | 'GROUPS' | 'DIRECT'>('ALL');
    
    // UI State
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Mount Fetch for guaranteed rooms
    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        if (!activeRoom && rooms.length > 0) {
            setActiveRoom(rooms[0]);
            fetchMessages(rooms[0].id);
        }
    }, [rooms, activeRoom]);

    useEffect(() => {
        if (activeRoom && initialMessages.length === 0) {
            fetchMessages(activeRoom.id);
        }
    }, [activeRoom]);

    useEffect(() => {
        if (initialTargetUserId && !initialActiveRoom) {
            startChat({ id: initialTargetUserId });
        }
    }, [initialTargetUserId, initialActiveRoom]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Real-time Subscriptions
    useEffect(() => {
        if (!me) return;

        const channel = supabase
            .channel('lucy-realtime-messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Message' },
                async (payload) => {
                    const msg = payload.new;
                    
                    if (activeRoom?.id === msg.chatRoomId) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) return prev;
                            return [...prev, msg];
                        });
                        markAsRead(activeRoom.id);
                    }
                    
                    fetchRooms();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [me, activeRoom]);

    const fetchRooms = async () => {
        setLoadingRooms(true);
        try {
            const res = await fetch('/api/messages/rooms');
            const data: any = await res.json();
            if (data.rooms) {
                setRooms(data.rooms);
            }
        } catch (e) {
            console.error("Failed to fetch rooms", e);
        } finally {
            setLoadingRooms(false);
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

    const markAsRead = async (chatRoomId: string) => {
        try {
            await fetch('/api/messages/read', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatRoomId })
            });
            setRooms(prev => prev.map(r => r.id === chatRoomId ? { ...r, unreadCount: 0 } : r));
        } catch (e) {}
    };

    const handleSendMessage = async (e?: React.FormEvent, attachments?: any) => {
        if (e) e.preventDefault();
        if ((!newMessage.trim() && !attachments) || !activeRoom) return;

        const content = newMessage;
        setNewMessage("");

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
                body: JSON.stringify({
                    chatRoomId: activeRoom.id,
                    content,
                    attachments
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                setAlertConfig({
                    title: "Message Blocked",
                    message: errData.error || "Failed to send message.",
                    isOpen: true,
                    variant: "error"
                });
                setMessages(prev => prev.filter(m => m.id !== tempId));
            } else {
                const sentData = await res.json();
                setMessages(prev => prev.map(m => m.id === tempId ? sentData.message || m : m));
            }
        } catch (err: any) {
            setAlertConfig({
                title: "Transmission Failure",
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
            if (data.users) {
                setSearchResults(data.users);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const startChat = async (targetUser: any) => {
        try {
            const res = await fetch('/api/messages/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: targetUser.id })
            });

            const data: any = await res.json();
            if (data.error) {
                setAlertConfig({ title: "Action Restricted", message: data.error, isOpen: true, variant: "error" });
                return;
            }

            if (data.room) {
                setRooms(prev => {
                    const exists = prev.find(r => r.id === data.room.id);
                    if (exists) return prev;
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

    // Filter rooms by tab
    const groupRooms = rooms.filter(r => r.type === 'GROUP');
    const directRooms = rooms.filter(r => r.type === 'PRIVATE');
    const displayedRooms = activeTab === 'GROUPS' ? groupRooms : activeTab === 'DIRECT' ? directRooms : rooms;

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-300 relative max-w-full overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-eduGreen-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex-1 flex overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-900/60 rounded-[2.5rem] relative z-10 w-full min-w-0 shadow-2xl">
                {/* SIDEBAR: Group Channels & Direct Contacts */}
                <div className={cn(
                    "w-full md:w-84 border-r border-zinc-200 dark:border-zinc-900/60 flex flex-col bg-white/30 dark:bg-zinc-950/30 relative shrink-0",
                    activeRoom ? "hidden md:flex" : "flex"
                )}>
                    {/* Search & Filter Header */}
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-900/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-eduGreen-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-eduGreen-400" />
                                Institutional Comms
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">{rooms.length} Active Channels</span>
                        </div>

                        <div className="relative">
                            <Input
                                placeholder="Search channels & staff..."
                                className="bg-zinc-100 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 h-11 rounded-xl text-xs pl-9"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                        </div>

                        {/* Channel Type Filter Pills */}
                        <div className="flex gap-1.5 p-1 bg-zinc-200/50 dark:bg-zinc-900/50 rounded-xl">
                            <button
                                onClick={() => setActiveTab('ALL')}
                                className={cn(
                                    "flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                    activeTab === 'ALL' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                All ({rooms.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('GROUPS')}
                                className={cn(
                                    "flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                    activeTab === 'GROUPS' ? "bg-eduGreen-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                Groups ({groupRooms.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('DIRECT')}
                                className={cn(
                                    "flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                    activeTab === 'DIRECT' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                Direct ({directRooms.length})
                            </button>
                        </div>
                    </div>

                    {/* Channel List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {searchQuery.length > 0 ? (
                            searchResults.map(user => (
                                <button key={user.id} onClick={() => startChat(user)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-eduGreen-950/20 text-left group transition-all border border-transparent hover:border-eduGreen-500/30">
                                    <Avatar className="h-10 w-10 border border-zinc-300 dark:border-zinc-800">
                                        <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-xs font-bold">{user.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden flex-1">
                                        <div className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight truncate">{user.name}</div>
                                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">{user.role}</div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-eduGreen-400 transition-colors" />
                                </button>
                            ))
                        ) : displayedRooms.length === 0 ? (
                            <div className="text-center py-12 px-4 space-y-3">
                                <Users className="w-8 h-8 text-zinc-500 mx-auto" />
                                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">
                                    Syncing Channels...
                                </p>
                                <Button 
                                    onClick={fetchRooms}
                                    size="sm"
                                    className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest"
                                >
                                    Refresh Channels
                                </Button>
                            </div>
                        ) : (
                            displayedRooms.map(room => {
                                const isGroup = room.type === 'GROUP';
                                const displayName = isGroup ? room.name : (room.partner?.name || 'Direct Channel');
                                const isSelected = activeRoom?.id === room.id;

                                return (
                                    <button 
                                        key={room.id} 
                                        onClick={() => { 
                                            setActiveRoom(room); 
                                            setMessages([]); 
                                            fetchMessages(room.id); 
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all border text-left group relative",
                                            isSelected 
                                                ? "bg-eduGreen-600/10 border-eduGreen-500/40 shadow-lg shadow-eduGreen-900/10" 
                                                : "bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border",
                                            isGroup 
                                                ? "bg-eduGreen-500/20 border-eduGreen-500/30 text-eduGreen-500" 
                                                : "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                                        )}>
                                            {isGroup ? <Hash className="w-5 h-5" /> : displayName[0]}
                                        </div>

                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="font-bold text-xs text-zinc-900 dark:text-white uppercase tracking-tight truncate">
                                                    {displayName}
                                                </span>
                                                {isGroup && (
                                                    <span className="text-[8px] font-mono text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900">
                                                        GROUP
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                                {room.messages?.[0]?.content || (isGroup ? "Campus Channel" : "Encrypted direct messaging")}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* CHAT WINDOW */}
                <div className={cn(
                    "flex-1 flex flex-col bg-white/20 dark:bg-zinc-950/20 relative min-w-0",
                    !activeRoom ? "hidden md:flex" : "flex"
                )}>
                    {activeRoom ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-900/60 flex items-center justify-between bg-white/60 dark:bg-zinc-950/60 backdrop-blur-3xl shrink-0">
                                <div className="flex items-center gap-3.5">
                                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveRoom(null)}>
                                        <ArrowLeft className="w-5 h-5" />
                                    </Button>

                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border",
                                        activeRoom.type === 'GROUP' 
                                            ? "bg-eduGreen-500/20 border-eduGreen-500/40 text-eduGreen-500" 
                                            : "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                                    )}>
                                        {activeRoom.type === 'GROUP' ? <Hash className="w-5 h-5" /> : (activeRoom.partner?.name?.[0] || 'U')}
                                    </div>

                                    <div>
                                        <div className="font-black text-sm text-zinc-900 dark:text-white uppercase tracking-tight">
                                            {activeRoom.type === 'GROUP' ? activeRoom.name : (activeRoom.partner?.name || 'Direct Channel')}
                                        </div>
                                        <div className="text-[9px] font-mono text-eduGreen-500 uppercase tracking-widest flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            {activeRoom.type === 'GROUP' ? 'Verified School Channel' : 'Direct End-to-End Link'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Message Feed */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                                {loadingMessages ? (
                                    <div className="h-full flex items-center justify-center">
                                        <SpringingLoader message="Decrypting Channel Transmissions..." />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                                        <div className="w-16 h-16 rounded-3xl bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center text-eduGreen-500">
                                            <MessageSquare className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-base font-black uppercase text-zinc-900 dark:text-white">
                                            Channel Initialized
                                        </h3>
                                        <p className="text-xs text-zinc-500 max-w-sm">
                                            {activeRoom.type === 'GROUP' 
                                                ? `This is the official space for ${activeRoom.name}. Post updates, coordination notes, and announcements.` 
                                                : "Direct messaging thread established. Transmit a message to start communicating."}
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
                                                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1 px-1">
                                                        {msg.fromUser?.name || "Participant"}
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

                            {/* Message Composer */}
                            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-200 dark:border-zinc-900/60 bg-white/40 dark:bg-zinc-950/40 flex items-center gap-3">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={activeRoom.type === 'GROUP' ? `Message #${activeRoom.name}...` : "Type a direct transmission..."}
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
                                Institutional Message Hub
                            </h2>
                            <p className="text-xs text-zinc-500 max-w-sm">
                                Select any school group or direct channel from the sidebar to view transcripts and transmit updates.
                            </p>
                        </div>
                    )}
                </div>
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
