"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveUser {
    id: string;
    name: string;
    role: string;
    schoolId?: string;
    onlineAt: string;
}

export function LiveTracker() {
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel('global_online');

        channel.on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const users: ActiveUser[] = [];
            Object.values(newState).forEach((presenceArray: any) => {
                presenceArray.forEach((presence: any) => {
                    users.push(presence as ActiveUser);
                });
            });
            // Deduplicate by ID just in case
            const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
            setActiveUsers(uniqueUsers);
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (activeUsers.length === 0) return null;

    return (
        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2 w-max">
            <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-emerald-500/20 rounded-full" />
                    <div className="relative w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-widest">{activeUsers.length} <span className="text-zinc-500">Online</span></span>
            </div>
            
            <div className="w-px h-4 bg-white/10" />

            <div className="flex items-center -space-x-2">
                <AnimatePresence>
                    {activeUsers.slice(0, 5).map((u, i) => (
                        <motion.div
                            key={u.id}
                            initial={{ opacity: 0, scale: 0.8, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: i * 0.05 }}
                            title={`${u.name} (${u.role})`}
                            className={cn(
                                "w-6 h-6 rounded-full border-2 border-[#050505] flex items-center justify-center text-[8px] font-bold text-white uppercase shadow-sm z-10 relative overflow-hidden",
                                u.role === 'SUPERADMIN' ? "bg-purple-600" : 
                                u.role === 'OWNER' || u.role === 'PRINCIPAL' ? "bg-blue-600" :
                                u.role === 'TEACHER' || u.role === 'HOMEROOM' ? "bg-emerald-600" : "bg-zinc-700"
                            )}
                        >
                            {u.name.charAt(0)}
                        </motion.div>
                    ))}
                    {activeUsers.length > 5 && (
                        <div className="w-6 h-6 rounded-full border-2 border-[#050505] bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-400 z-10 relative">
                            +{activeUsers.length - 5}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
