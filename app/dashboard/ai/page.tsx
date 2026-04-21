"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { NeuralChatInterface } from "@/components/dashboard/neural-chat-interface";

export default function NeuralPage() {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/user/settings');
                const data = await res.json();
                if (data.user) {
                    setUserData(data.user);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 className="w-12 h-12 text-eduGreen-500 animate-spin mb-4" />
                <p className="text-zinc-500 font-medium uppercase tracking-[0.3em] text-[10px]">Synchronizing Neural Correlates</p>
            </div>
        );
    }
    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-300 relative max-w-full overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-eduGreen-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="mb-8 flex justify-between items-end relative z-10">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-eduGreen-950/30 border border-eduGreen-500/20 text-[10px] font-medium text-eduGreen-400 uppercase tracking-[0.3em] mb-4 backdrop-blur-md">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        <span>Institutional Neural Link</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-medium text-white tracking-tighter uppercase italic">
                        Neural <span className="text-eduGreen-500 not-italic">Interface</span>
                    </h1>
                </div>

                <div className="hidden md:flex flex-col items-end gap-1">
                    <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Core Synchronized</div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-950/50 border border-zinc-900 rounded-2xl backdrop-blur-xl">
                        <div className="w-2 h-2 rounded-full bg-eduGreen-500 animate-pulse shadow-[0_0_10px_rgba(20,122,82,0.6)]" />
                        <span className="text-[10px] font-medium text-white uppercase tracking-tighter">Active Link</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-zinc-950/40 backdrop-blur-3xl border border-zinc-900/50 rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative z-10 w-full min-w-0">
                <NeuralChatInterface standalone userName={userData?.name} userId={userData?.id} />
            </div>
        </div>
    );
}
