"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface SchoolEvent {
    id: string;
    title: string;
    description?: string;
    eventDate: string;
    location?: string;
}

export function UpcomingEventsWidget() {
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetch('/api/school/events')
            .then(res => res.json())
            .then(data => {
                if (data.events) {
                    // Filter future events and take top 3
                    const future = data.events
                        .filter((e: SchoolEvent) => new Date(e.eventDate) >= new Date())
                        .slice(0, 3);
                    setEvents(future);
                }
            })
            .catch(err => console.error(err));
    }, []);

    if (events.length === 0) return (
        <Card className="bg-zinc-950/40 backdrop-blur-3xl border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden border-t-white/10">
            <CardHeader className="p-10 pb-4">
                <CardTitle className="text-[10px] font-medium text-white uppercase tracking-[0.3em] flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-eduGreen-500" /> Upcoming Events
                </CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-0">
                <div className="text-center py-10 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                    <p className="text-[10px] font-medium text-zinc-800 uppercase tracking-widest">No events scheduled</p>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <Card className="bg-zinc-950/40 backdrop-blur-3xl border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden border-t-white/10">
            <CardHeader className="flex flex-row items-center justify-between p-6 md:p-10 pb-6 text-center">
                <CardTitle className="text-[10px] font-medium text-white uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                    <Calendar className="w-4 h-4 text-eduGreen-500" /> High-Level Events
                </CardTitle>
                <Link href="/dashboard/events">
                    <Button variant="ghost" size="sm" className="h-8 text-[9px] font-medium uppercase tracking-widest text-zinc-500 hover:text-eduGreen-400">View All</Button>
                </Link>
            </CardHeader>
            <CardContent className="p-6 md:p-10 pt-4 space-y-6">
                {events.map((event, index) => (
                    <motion.div
                        key={event.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex gap-6 items-start p-6 bg-white/[0.02] rounded-3xl border border-white/5 group hover:bg-white/[0.04] transition-all relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-[2px] h-0 bg-eduGreen-500 group-hover:h-full transition-all duration-300" />

                        <div className="flex flex-col items-center bg-zinc-900/50 backdrop-blur-md rounded-2xl p-3 min-w-[4rem] border border-white/5 shadow-xl">
                            <span className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest">{mounted ? new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short' }) : "---"}</span>
                            <span className="text-2xl font-medium text-white italic">{mounted ? new Date(event.eventDate).getDate() : "--"}</span>
                        </div>

                        <div className="flex-1">
                            <h4 className="font-medium text-base text-white group-hover:text-eduGreen-400 transition-colors line-clamp-1 uppercase tracking-tight italic" title={event.title}>{event.title}</h4>
                            <p className="text-[11px] font-medium text-zinc-500 mb-3 line-clamp-1">{event.description}</p>
                            <div className="flex items-center gap-4 text-[9px] font-medium text-zinc-700 uppercase tracking-widest">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-eduGreen-700" />
                                    {mounted ? new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "---"}
                                </div>
                                {event.location && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3 text-eduGreen-700" />
                                        {event.location}
                                    </div>
                                )}
                            </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-zinc-900 group-hover:text-eduGreen-600 transition-all self-center" />
                    </motion.div>
                ))}
            </CardContent>
        </Card>
    );
}

