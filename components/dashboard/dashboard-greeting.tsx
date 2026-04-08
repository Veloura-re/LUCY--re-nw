"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Calendar } from "lucide-react";
import { quotes } from "@/lib/quotes";

interface DashboardGreetingProps {
    name: string;
    role: string;
    gender?: string | null;
}

export function DashboardGreeting({ name, role, gender }: DashboardGreetingProps) {
    const [mounted, setMounted] = useState(false);
    const [quote, setQuote] = useState("System telemetry nominal.");
    const [currentDate, setCurrentDate] = useState("");
    const [greeting, setGreeting] = useState("Welcome");

    useEffect(() => {
        setMounted(true);
        const today = new Date();

        setCurrentDate(today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }));

        const hour = today.getHours();
        if (hour < 12) setGreeting("Good morrow");
        else if (hour < 18) setGreeting("Good day");
        else setGreeting("Good even");

        const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);

        let userHash = 0;
        for (let i = 0; i < name.length; i++) {
            userHash = (userHash << 5) - userHash + name.charCodeAt(i);
            userHash |= 0;
        }

        const index = Math.abs((userHash + dayOfYear) % quotes.length);
        setQuote(quotes[index] || quotes[0]);
    }, [name]);

    const getPrefix = () => {
        if (role === "SUPERADMIN") return "Supreme Architect ";
        if (role === "PRINCIPAL") return "Noble Governor ";
        if (role === "TEACHER" || role === "HOMEROOM") return "Learned Scholar ";
        if (role === "PARENT") return "Esteemed Protector ";
        if (role === "STUDENT") return "Young Scribe ";
        return "";
    };

    const displayName = `${getPrefix()}${name.split(' ')[0]}`;

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="inline-flex items-center gap-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800 text-eduGreen-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                    <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 text-eduGreen-500" />
                    {role} PORTAL ACTIVE
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="inline-flex items-center gap-2 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-zinc-900/30 border border-zinc-800/50 text-zinc-500 text-[9px] md:text-[10px] font-medium uppercase tracking-widest min-w-[120px] md:min-w-[140px]"
                >
                    <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3 text-zinc-600" />
                    {mounted ? currentDate : <span className="animate-pulse bg-zinc-800 h-2.5 w-20 md:w-24 rounded"></span>}
                </motion.div>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-5xl font-medium tracking-tighter text-white flex items-center flex-wrap gap-1.5 md:gap-2">
                <span className="lowercase text-zinc-400 capitalize">
                    {mounted ? greeting : <span className="animate-pulse bg-zinc-800 h-8 md:h-10 w-32 md:w-48 rounded inline-block"></span>}
                </span>
                <span>
                    {mounted && ","} <span className="text-eduGreen-500 italic">{displayName}</span>
                </span>
            </h1>

            <p className="text-zinc-500 font-medium tracking-[0.05em] md:tracking-[0.1em] text-sm md:text-lg mt-2 md:mt-3 min-h-[14px] md:min-h-[16px] flex items-center italic">
                {mounted ? `"${quote}"` : <span className="animate-pulse bg-zinc-800 h-2.5 md:h-3 w-48 md:w-64 rounded inline-block"></span>}
            </p>

            {/* Mobile-only beauty hint */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="md:hidden text-[9px] text-zinc-600 mt-4 uppercase tracking-[0.2em] font-black italic opacity-50"
            >
                for a bttr beauty try oour pc version
            </motion.p>
        </div>
    );
}
