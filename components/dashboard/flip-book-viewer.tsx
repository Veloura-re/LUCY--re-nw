"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogClose,
    DialogTitle
} from "@/components/ui/dialog";
import {
    X,
    Maximize2,
    Minimize2,
    Download,
    ScrollText,
    BookOpen,
    Layers,
    Info,
    Calendar,
    ChevronRight,
    ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FlipBookViewerProps {
    isOpen: boolean;
    onClose: () => void;
    book: any | null;
}

export function FlipBookViewer({ isOpen, onClose, book }: FlipBookViewerProps) {
    const [mounted, setMounted] = useState(false);
    const [fullScreen, setFullScreen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !book) return null;

    const parseBookMeta = (desc: string | null) => {
        if (!desc) return { text: "", coverUrl: "" };
        try {
            if (desc.startsWith('{') && desc.includes('coverUrl')) {
                const parsed = JSON.parse(desc);
                return { text: parsed.text || "", coverUrl: parsed.coverUrl || "" };
            }
        } catch { }
        return { text: desc, coverUrl: "" };
    };

    // Remove harsh FitH and zoom restrictions so the user can use native PDF zoom controls
    const viewerUrl = `${book.fileUrl}`;

    const { text: cleanDescription, coverUrl } = parseBookMeta(book.description);

    return (
        <Dialog open={isOpen} onOpenChange={(val: boolean) => !val && onClose()}>
            <DialogContent className={cn(
                "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 p-0 overflow-hidden flex flex-col transition-all duration-500 shadow-[0_0_100px_rgba(0,0,0,0.8)]",
                fullScreen ? "max-w-[100vw] h-[100vh] rounded-none border-none" : "max-w-[95vw] h-[90vh] rounded-[2rem]"
            )}>
                <DialogTitle className="sr-only">Reading {book.title}</DialogTitle>
                {/* Header Overlay */}
                <div className="absolute top-0 left-0 w-full z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-white dark:from-black/80 to-transparent pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto">
                        <div className="p-3 bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-xl border border-zinc-300 dark:border-white/10 shadow-lg">
                            <BookOpen className="w-5 h-5 text-eduGreen-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-zinc-900 dark:text-white truncate max-w-md drop-shadow-md">{book.title}</h2>
                            <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest drop-shadow-md">{book.author || "Institutional Material"}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pointer-events-auto bg-white/40 dark:bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-300 dark:border-white/10 shadow-lg">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={cn("rounded-xl transition-all", sidebarOpen ? "bg-zinc-300 dark:bg-white/10 text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400 hover:text-white hover:bg-white/5")}
                            title="Toggle Info Panel"
                        >
                            <Info className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFullScreen(!fullScreen)}
                            className="text-zinc-600 dark:text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            title={fullScreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {fullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </Button>
                        <a
                            href={book.fileUrl}
                            download
                            className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center justify-center"
                            title="Download PDF"
                        >
                            <Download className="w-5 h-5" />
                        </a>
                        <div className="w-[1px] h-6 bg-zinc-300 dark:bg-white/10 mx-1" />
                        <DialogClose asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </DialogClose>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 w-full relative flex bg-white dark:bg-zinc-950 overflow-hidden">
                    
                    {/* PDF Frame */}
                    <div className="flex-1 h-full relative z-0 transition-all duration-500 bg-white dark:bg-zinc-950">
                        <iframe
                            src={viewerUrl}
                            className="absolute inset-0 w-full h-full border-none bg-white dark:bg-zinc-950"
                            style={{ height: '100%', minHeight: '100%' }}
                            title={book.title}
                            allow="fullscreen"
                        />
                    </div>

                    {/* Sliding Metadata Sidebar */}
                    <div className={cn(
                        "h-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-l border-zinc-300 dark:border-white/10 transition-all duration-500 ease-in-out z-20 flex flex-col relative",
                        sidebarOpen ? "w-80 translate-x-0 opacity-100" : "w-0 translate-x-full opacity-0 overflow-hidden"
                    )}>
                        <div className="p-8 pt-28 space-y-8 overflow-y-auto h-full scrollbar-hide w-80">
                            {/* Visual Book Spine representation matching outer cover */}
                            {coverUrl ? (
                                <div className="w-full h-48 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-300 dark:border-white/10 shadow-2xl relative overflow-hidden group">
                                    <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-80" />
                                    <div className="absolute bottom-3 left-3 right-3">
                                        <div className="text-zinc-900 dark:text-white font-bold text-xs uppercase tracking-widest break-words leading-tight">{book.title}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-24 h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-lg border border-zinc-300 dark:border-white/10 shadow-2xl flex flex-col justify-between p-3 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-eduGreen-500/20 blur-xl group-hover:opacity-100 opacity-50 transition-all" />
                                    <ScrollText className="w-5 h-5 text-eduGreen-500" />
                                    <div className="text-zinc-900 dark:text-white font-medium text-[10px] uppercase tracking-widest break-words leading-tight">{book.title.substring(0, 30)}</div>
                                </div>
                            )}

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2">Subject Mastery</h3>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{book.subject?.name || "General Curriculum"}</p>
                                </div>
                                
                                <div>
                                    <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2">Academic Level</h3>
                                    <div className="flex gap-2">
                                        <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-white/5 text-[10px] font-medium text-zinc-900 dark:text-white uppercase tracking-widest">
                                            Grade {book.grade?.level || "N/A"}
                                        </span>
                                        <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-white/5 text-[10px] font-medium text-zinc-900 dark:text-white uppercase tracking-widest">
                                            {book.class?.name || "All"}
                                        </span>
                                    </div>
                                </div>

                                {cleanDescription && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2">Synopsis</h3>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">{cleanDescription}</p>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-zinc-300 dark:border-white/10 grid grid-cols-2 gap-4">
                                    {book.edition && (
                                        <div>
                                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-500 mb-1">
                                                <Layers className="w-3 h-3" />
                                                <span className="text-[9px] uppercase tracking-widest font-semibold">Edition</span>
                                            </div>
                                            <p className="text-xs font-medium text-zinc-900 dark:text-white">{book.edition}</p>
                                        </div>
                                    )}
                                    {book.academicYear && (
                                        <div>
                                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-500 mb-1">
                                                <Calendar className="w-3 h-3" />
                                                <span className="text-[9px] uppercase tracking-widest font-semibold">Year</span>
                                            </div>
                                            <p className="text-xs font-medium text-zinc-900 dark:text-white">{book.academicYear}</p>
                                        </div>
                                    )}
                                </div>
                                
                                {book.teacherNote && (
                                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mt-4">
                                        <h3 className="text-[9px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Teacher&apos;s Note</h3>
                                        <p className="text-[10px] font-medium text-amber-600 dark:text-amber-500/80 leading-relaxed">{book.teacherNote}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
