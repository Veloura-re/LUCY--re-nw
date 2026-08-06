"use client";

import React, { useState } from 'react';
import { useLanguage } from '@/components/providers/language-provider';
import { WORLD_LANGUAGES, Language } from '@/lib/i18n/languages';
import { Globe, Search, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLanguages = WORLD_LANGUAGES.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (lang: Language) => {
        setLanguage(lang);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                title={`Current Language: ${language.name}`}
                className={cn(
                    "relative px-3 h-10 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-300 flex items-center gap-2 group cursor-pointer active:scale-95 text-xs font-mono font-bold text-slate-700 dark:text-zinc-300",
                    className
                )}
            >
                <span className="text-base leading-none">{language.flag}</span>
                <span className="uppercase tracking-wider font-bold">{language.code}</span>
                <Globe className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-500 transition-colors ml-0.5" />
            </button>

            {/* 100+ Languages Search Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />

                        {/* Modal Dialog */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold font-mono uppercase tracking-tight text-slate-900 dark:text-white">
                                            Select Language
                                        </h3>
                                        <p className="text-[10px] font-mono text-zinc-500">
                                            100+ World Languages Supported
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Search Filter */}
                            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder="Search language, code or native name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                        className="w-full pl-10 pr-4 h-10 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Languages Grid */}
                            <div className="p-3 overflow-y-auto space-y-1 scrollbar-none flex-1">
                                {filteredLanguages.length === 0 ? (
                                    <div className="p-8 text-center text-xs font-mono text-zinc-500">
                                        No matching language found for "{searchQuery}"
                                    </div>
                                ) : (
                                    filteredLanguages.map((lang) => {
                                        const isSelected = language.code === lang.code;
                                        return (
                                            <button
                                                key={lang.code}
                                                onClick={() => handleSelect(lang)}
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-2xl text-left flex items-center justify-between transition-all group font-mono text-xs cursor-pointer",
                                                    isSelected
                                                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                                                        : "hover:bg-zinc-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-transparent"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl leading-none">{lang.flag}</span>
                                                    <div>
                                                        <div className="font-bold">{lang.name}</div>
                                                        <div className="text-[10px] opacity-60">{lang.nativeName} ({lang.code.toUpperCase()})</div>
                                                    </div>
                                                </div>
                                                {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
