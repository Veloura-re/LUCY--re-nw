"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Search,
    Book,
    Layers,
    GraduationCap,
    Command as CommandIcon,
    X,
    FileText,
    ExternalLink,
    Zap,
    Cpu
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export function CommandSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const fetchResults = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            // We'll search across books, but could extend to subjects/classes
            const res = await fetch(`/api/school/books?query=${encodeURIComponent(q)}`);
            const data = await res.json();
            setResults((data as any[]).slice(0, 6)); // Limit for speed/UI
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => fetchResults(query), 300);
        return () => clearTimeout(timer);
    }, [query, fetchResults]);

    const handleSelect = (book: any) => {
        setOpen(false);
        window.open(book.fileUrl, '_blank');
    };

    return (
        <>
            <button 
                onClick={() => setOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-900 rounded-xl hover:bg-slate-200/50 dark:hover:bg-zinc-900 transition-all group"
            >
                <Search className="w-3.5 h-3.5 text-zinc-600 group-hover:text-eduGreen-500" />
                <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-widest mr-2">Search</span>
                <kbd className="hidden sm:inline-flex items-center gap-1 bg-slate-50 dark:bg-zinc-950 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-[10px] font-mono text-slate-500 dark:text-zinc-500">
                    <CommandIcon className="w-3 h-3" />K
                </kbd>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-900 shadow-xl dark:shadow-2xl p-0 overflow-hidden rounded-[2.5rem] top-[20%] translate-y-0">
                    <div className="p-6 border-b border-zinc-200 dark:border-zinc-900 flex items-center gap-4">
                        <Search className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
                        <input 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search commands, students, settings..."
                            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 h-16 text-lg font-medium tracking-tight"
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                            {loading && <div className="w-4 h-4 border-2 border-eduGreen-500 border-t-transparent rounded-full animate-spin" />}
                            <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
                        {results.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-[8px] font-medium text-zinc-600 uppercase tracking-[0.3em] ml-2 mb-4">Library Records</p>
                                {results.map((book) => (
                                    <button
                                        key={book.id}
                                        onClick={() => handleSelect(book)}
                                        className="w-full flex items-center justify-between p-4 bg-zinc-100/40 dark:bg-zinc-900/40 hover:bg-eduGreen-500/10 border border-transparent hover:border-eduGreen-900/30 rounded-2xl transition-all group text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-800 text-zinc-500 group-hover:text-eduGreen-500 transition-colors">
                                                <Book className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-eduGreen-500 transition-colors">{book.title}</h4>
                                                <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-tighter mt-1">
                                                    {book.subject.name} • Grade {book.grade.level}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-medium text-zinc-700 uppercase tracking-widest px-2 py-1 bg-white dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-900">
                                                {book.class.name}
                                            </span>
                                            <Zap className="w-3 h-3 text-zinc-800 group-hover:text-eduGreen-500" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : query.trim() ? (
                            <div className="p-12 text-center flex flex-col items-center justify-center">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center mb-4 border border-slate-200 dark:border-zinc-800">
                                    <Search className="w-5 h-5 text-slate-400 dark:text-zinc-600" />
                                </div>
                                <p className="text-slate-500 dark:text-zinc-500 font-medium tracking-tight">No results found for "{query}"</p>
                                <p className="text-[10px] text-slate-400 dark:text-zinc-600 uppercase tracking-widest mt-1">Try another search term</p>
                            </div>
                        ) : (
                            <div className="py-10">
                                <p className="text-[8px] font-medium text-zinc-600 uppercase tracking-[0.3em] ml-2 mb-6">Discovery Shortcuts</p>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { icon: Layers, label: "All Subjects", cmd: "S" },
                                        { icon: GraduationCap, label: "By Grade", cmd: "G" },
                                        { icon: FileText, label: "Unit Packs", cmd: "U" },
                                        { icon: ExternalLink, label: "External Links", cmd: "L" }
                                    ].map((sh) => (
                                        <div key={sh.label} className="flex items-center gap-3 p-4 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-900/40 transition-all cursor-pointer">
                                            <sh.icon className="w-4 h-4 text-zinc-600" />
                                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">{sh.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/50">
                        <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-slate-400 dark:text-zinc-600 font-medium">
                            <span className="flex items-center gap-2"><Cpu className="w-3 h-3" /> Unified Command</span>
                        </div>
                        <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest text-slate-400 dark:text-zinc-600">
                            <span><kbd className="bg-slate-200 dark:bg-zinc-950 px-1 rounded border border-slate-300 dark:border-zinc-800 text-slate-500 dark:text-zinc-500">↑↓</kbd> Navigate</span>
                            <span><kbd className="bg-slate-200 dark:bg-zinc-950 px-1 rounded border border-slate-300 dark:border-zinc-800 text-slate-500 dark:text-zinc-500">Enter</kbd> Select</span>
                            <span><kbd className="bg-slate-200 dark:bg-zinc-950 px-1 rounded border border-slate-300 dark:border-zinc-800 text-slate-500 dark:text-zinc-500">Esc</kbd> Close</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

