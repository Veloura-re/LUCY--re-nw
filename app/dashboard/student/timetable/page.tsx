"use client";

import { useEffect, useState } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, MapPin, BrainCircuit, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Day Mapping Utility
const DAY_MAP: Record<string, string> = {
    "MON": "Monday",
    "TUE": "Tuesday",
    "WED": "Wednesday",
    "THU": "Thursday",
    "FRI": "Friday",
    "SAT": "Saturday",
    "SUN": "Sunday"
};

interface TimetablePeriod {
    id: string;
    subject: string;
    teacher: string;
    startTime: string;
    endTime: string;
    room: string;
    isBreak: boolean;
    topic?: string;
}

export default function StudentTimetablePage() {
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [timetable, setTimetable] = useState<Record<string, TimetablePeriod[]>>({});
    const [viewMode, setViewMode] = useState<"day" | "week">("week");

    useEffect(() => {
        const fetchTimetable = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/student/timetable");
                if (res.ok) {
                    const data = await res.json();
                    setTimetable(data);
                } else {
                    toast.error("Failed to sync temporal coordinates");
                }
            } catch (error) {
                console.error("Timetable Load Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTimetable();
    }, []);

    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const displayedDays = viewMode === "week"
        ? Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
        : [selectedDate];

    if (loading) return <SpringingLoader message="Syncing Temporal Coordinates" />;

    return (
        <div className="space-y-8 animate-in fade-in duration-300 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-medium text-zinc-900 dark:text-white tracking-tighter">Temporal <span className="text-eduGreen-500">Matrix</span></h1>
                    <p className="text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-[0.2em] text-xs mt-2">Class Schedule & Learning Objectives</p>
                </div>

                <div className="flex bg-white dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-900">
                    <Button
                        variant={viewMode === "week" ? "secondary" : "ghost"}
                        onClick={() => setViewMode("week")}
                        className="text-xs font-medium uppercase tracking-widest px-6"
                    >
                        Weekly
                    </Button>
                    <Button
                        variant={viewMode === "day" ? "secondary" : "ghost"}
                        onClick={() => setViewMode("day")}
                        className="text-xs font-medium uppercase tracking-widest px-6"
                    >
                        Daily Format
                    </Button>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-white/40 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-900 backdrop-blur-sm gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, viewMode === "week" ? -7 : -1))}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDate(new Date())}
                        className="rounded-xl border-zinc-200 dark:border-zinc-900 text-[10px] font-medium uppercase tracking-widest px-4 h-9 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                    >
                        Today
                    </Button>
                </div>

                <div className="text-center">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white px-8">
                        {viewMode === "week" ? (
                            <>{format(weekStart, "MMMM d")} - {format(addDays(weekStart, 6), "MMMM d, yyyy")}</>
                        ) : (
                            <>{format(selectedDate, "EEEE, MMMM d, yyyy")}</>
                        )}
                    </h3>
                </div>

                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, viewMode === "week" ? 7 : 1))}>
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {displayedDays.map((date, idx) => {
                    const dayKey = format(date, "EEE").toUpperCase(); // "MON", "TUE", etc.
                    const periods = timetable[dayKey] || [];
                    const isToday = isSameDay(date, new Date());

                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card className={cn(
                                "overflow-hidden border-zinc-200 dark:border-zinc-900 transition-all",
                                isToday ? "bg-white/60 dark:bg-zinc-950/60 border-eduGreen-500/30 ring-1 ring-eduGreen-500/20" : "bg-white/30 dark:bg-zinc-950/30 hover:bg-white/50 dark:bg-zinc-950/50"
                            )}>
                                <div className="flex flex-col md:flex-row">
                                    {/* Date Column */}
                                    <div className={cn(
                                        "w-full md:w-32 p-6 flex items-center md:flex-col md:justify-center gap-2 border-b md:border-b-0 md:border-r border-zinc-300 dark:border-zinc-800/50",
                                        isToday ? "bg-eduGreen-950/10 text-eduGreen-500" : "bg-zinc-100/20 dark:bg-zinc-900/20 text-zinc-600 dark:text-zinc-500"
                                    )}>
                                        <span className="text-2xl font-medium uppercase tracking-tighter">{format(date, "EEE")}</span>
                                        <span className="text-[10px] font-medium uppercase tracking-widest">{format(date, "MMM d")}</span>
                                    </div>

                                    {/* Periods */}
                                    <div className="flex-1 p-6">
                                        {periods.length > 0 ? (
                                            <div className="grid gap-4">
                                                {periods.map((period) => (
                                                    <div key={period.id} className={cn(
                                                        "group relative flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border border-zinc-300 dark:border-zinc-800/50 transition-all",
                                                        period.isBreak ? "bg-zinc-100/10 dark:bg-zinc-900/10 opacity-70 border-dashed" : "bg-zinc-100/20 dark:bg-zinc-900/20 hover:bg-zinc-200 dark:hover:bg-zinc-900/40"
                                                    )}>
                                                        {/* Time */}
                                                        <div className="w-32 flex items-center gap-2 text-zinc-600 dark:text-zinc-400 font-mono text-xs font-medium">
                                                            <div className={cn("w-1.5 h-1.5 rounded-full", period.isBreak ? "bg-blue-500" : "bg-zinc-700")} />
                                                            {period.startTime} - {period.endTime}
                                                        </div>

                                                        {/* Details */}
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <h4 className={cn(
                                                                    "font-medium tracking-tight transition-colors",
                                                                    period.isBreak ? "text-zinc-600 dark:text-zinc-500 text-sm" : "text-zinc-900 dark:text-white text-lg group-hover:text-eduGreen-400"
                                                                )}>
                                                                    {period.subject}
                                                                </h4>
                                                                {!period.isBreak && (
                                                                    <Badge variant="outline" className="border-zinc-300 dark:border-zinc-800 text-[9px] uppercase tracking-widest text-zinc-600">
                                                                        {period.room}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {!period.isBreak && (
                                                                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-500 text-xs font-medium uppercase tracking-wider">
                                                                    <span>{period.teacher}</span>
                                                                    {period.topic && (
                                                                        <>
                                                                            <span className="text-zinc-700">•</span>
                                                                            <span className="text-eduGreen-600 flex items-center gap-1">
                                                                                <BrainCircuit className="w-3 h-3" /> {period.topic}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-zinc-700 font-medium uppercase tracking-widest text-xs py-8 opacity-50">
                                                No Scheduled Operations
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

