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
        if (hour < 12) setGreeting("Good morning");
        else if (hour < 18) setGreeting("Good afternoon");
        else setGreeting("Good evening");

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
        if (role === "SUPERADMIN") return "Admin ";
        if (role === "PRINCIPAL") return "Principal ";
        if (role === "TEACHER" || role === "HOMEROOM") return "Teacher ";
        if (role === "PARENT") return "Parent ";
        if (role === "STUDENT") return "Student ";
        return "";
    };

    const displayName = `${getPrefix()}${name.split(' ')[0]}`;

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-0.5 sm:py-1.5 rounded-full bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 text-eduGreen-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em]"
                >
                    <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-eduGreen-500" />
                    {role} PORTAL ACTIVE
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-300 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-500 text-[8px] sm:text-[10px] font-medium uppercase tracking-widest min-w-[100px] sm:min-w-[140px]"
                >
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-600" />
                    {mounted ? currentDate : <span className="animate-pulse bg-zinc-200 dark:bg-zinc-800 h-2 sm:h-2.5 w-16 sm:w-24 rounded"></span>}
                </motion.div>
            </div>

            <h1 className="text-lg sm:text-2xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white flex items-center flex-wrap gap-1 sm:gap-2">
                <span className="lowercase text-zinc-600 dark:text-zinc-400 capitalize">
                    {mounted ? greeting : <span className="animate-pulse bg-zinc-200 dark:bg-zinc-800 h-6 sm:h-10 w-24 sm:w-48 rounded inline-block"></span>}
                </span>
                <span>
                    {mounted && ","} <span className="text-eduGreen-500 italic">{displayName}</span>
                </span>
            </h1>

            <p className="text-zinc-600 dark:text-zinc-500 font-medium tracking-[0.03em] sm:tracking-[0.1em] text-xs sm:text-base md:text-lg mt-1 sm:mt-3 min-h-[12px] sm:min-h-[16px] flex items-center italic">
                {mounted ? `"${quote}"` : <span className="animate-pulse bg-zinc-200 dark:bg-zinc-800 h-2 sm:h-3 w-36 sm:w-64 rounded inline-block"></span>}
            </p>
        </div>
    );
}
