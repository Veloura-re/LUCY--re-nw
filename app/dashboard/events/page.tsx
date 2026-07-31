"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Plus, Trash2, MapPin, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import SpringingLoader from "@/components/dashboard/springing-loader";

export default function EventsPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: "", description: "", date: "" });
    const [loading, setLoading] = useState(true);
    const [createLoading, setCreateLoading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;

    useEffect(() => {
        fetchEvents();
    }, [page]);

    const fetchEvents = async () => {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });
            const res = await fetch(`/api/school/events?${params.toString()}`);
            const data = await res.json() as any;
            if (data.events) setEvents(data.events);
            if (data.userRole) setUserRole(data.userRole);
            if (data.pagination) setTotalPages(data.pagination.totalPages || 1);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            await fetch('/api/school/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEvent)
            });
            setIsCreating(false);
            setNewEvent({ title: "", description: "", date: "" });
            fetchEvents();
        } finally {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setCreateLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
    };

    const executeDelete = async () => {
        if (!deleteId) return;
        try {
            await fetch(`/api/school/events?id=${deleteId}`, { method: 'DELETE' });
            fetchEvents();
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-300 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-eduGreen-950/20 border border-eduGreen-900/30 text-[10px] font-medium text-eduGreen-500 uppercase tracking-widest mb-4">
                        <Calendar className="w-3 h-3 text-eduGreen-500" />
                        <span>Institutional Timeline</span>
                    </div>
                    <h1 className="text-4xl font-medium text-zinc-900 dark:text-white tracking-tight">Institutional Events</h1>
                    <p className="text-zinc-600 dark:text-zinc-500 mt-2 font-medium text-sm leading-relaxed max-w-2xl">
                        Orchestrate school activities, academic deadlines, and community engagements in a unified timeline.
                    </p>
                </div>

                {userRole === 'PRINCIPAL' && (
                    <Button
                        onClick={() => setIsCreating(true)}
                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-14 px-8 rounded-2xl font-medium text-xs uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-900/20 transition-all active:scale-95"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Event
                    </Button>
                )}
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                    <Card key={event.id} className="group relative bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 backdrop-blur-2xl border-zinc-200 dark:border-zinc-900 rounded-[2.5rem]  hover:border-eduGreen-900/40 transition-all border-t-zinc-800/20 shadow-2xl h-full flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-eduGreen-600 via-eduGreen-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-xl group-hover:border-eduGreen-900/30 transition-colors">
                                    <Calendar className="w-5 h-5 text-zinc-600 dark:text-zinc-500 group-hover:text-eduGreen-500 transition-colors" />
                                </div>
                                <div className="text-[10px] font-medium text-zinc-600 uppercase tracking-[0.2em] bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-900 group-hover:text-eduGreen-500 group-hover:border-eduGreen-900/20 transition-all">
                                    {new Date(event.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>
                            <CardTitle className="text-xl font-medium text-zinc-900 dark:text-white dark:text-zinc-100 group-hover:text-eduGreen-600 dark:group-hover:text-eduGreen-400 transition-colors tracking-tight leading-tight">{event.title}</CardTitle>
                            <CardDescription className="text-zinc-600 dark:text-zinc-500 font-medium text-sm mt-3 leading-relaxed line-clamp-2">{event.description || "No tactical details provided for this event sequence."}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 mt-auto">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest border border-zinc-200 dark:border-zinc-900 group-hover:border-zinc-800 transition-all">
                                        <Clock className="w-3.5 h-3.5 text-zinc-700 group-hover:text-eduGreen-600 transition-colors" />
                                        {new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                {userRole === 'PRINCIPAL' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(event.id)}
                                        className="h-10 w-10 text-zinc-800 dark:text-zinc-200 hover:text-red-600 dark:text-red-500 hover:bg-red-50 dark:bg-red-950/20 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {events.length === 0 && !loading && (
                <div className="p-24 text-center flex flex-col items-center gap-6 bg-white/30 dark:bg-zinc-950/30 rounded-[3rem] border-2 border-dashed border-zinc-200 dark:border-zinc-900">
                    <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center opacity-20">
                        <Calendar className="w-10 h-10 text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                        <p className="text-zinc-700 font-medium uppercase tracking-[0.4em] text-xs">No Scheduled Operations</p>
                        <p className="text-zinc-800 dark:text-zinc-200 text-[10px] font-medium uppercase tracking-widest mt-2">Institutional registry is awaiting new entries</p>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white/40 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-900/50 backdrop-blur-md">
                    <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] p-6 md:p-10 max-w-[95vw] md:max-w-xl max-h-[85vh] overflow-y-auto shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-3xl font-medium text-zinc-900 dark:text-white tracking-tight">Event System</DialogTitle>
                        <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Initialize new institutional event sequence</CardDescription>
                    </DialogHeader>
                    {createLoading ? (
                        <div className="py-12 flex justify-center items-center scale-90">
                            <SpringingLoader message="Deploying Event Sequence" />
                        </div>
                    ) : (
                        <form onSubmit={handleCreate} className="space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Operation Identity</label>
                                <Input
                                    placeholder="Event Title"
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                    required
                                    className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2 text-lg font-medium"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Tactical Breifing</label>
                                <Input
                                    placeholder="Contextual details (Optional)"
                                    value={newEvent.description}
                                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                    className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Temporal Placement</label>
                                <Input
                                    type="datetime-local"
                                    value={newEvent.date}
                                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                    required
                                    className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2 font-mono"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-900/50">
                                <Button type="button" variant="ghost" disabled={createLoading} onClick={() => setIsCreating(false)} className="text-zinc-600 hover:text-zinc-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 font-medium uppercase tracking-[0.2em] text-[10px] h-14 px-8">Abort</Button>
                                <Button type="submit" isLoading={createLoading} className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-14 px-10 rounded-2xl font-medium text-xs uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-900/20">Confirm Deployment</Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={executeDelete}
                title="Purge Event"
                description="Are you sure you want to expunge this event from the institutional timeline? This action will synchronize across all faculty calendars."
                confirmText="Expunge"
                variant="danger"
            />
        </div>
    );
}

