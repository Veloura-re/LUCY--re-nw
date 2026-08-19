'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/lib/i18n/translations';
import { Globe, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LanguageToggleProps {
    className?: string;
    variant?: 'compact' | 'full';
}

export function LanguageToggle({ className = '', variant = 'compact' }: LanguageToggleProps) {
    const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem('lucy_language') as SupportedLanguage;
        if (saved && SUPPORTED_LANGUAGES[saved]) {
            setCurrentLang(saved);
            applyLanguage(saved);
        }
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyLanguage = (lang: SupportedLanguage) => {
        const meta = SUPPORTED_LANGUAGES[lang];
        if (!meta) return;
        document.documentElement.lang = lang;
        document.documentElement.dir = meta.direction;
        localStorage.setItem('lucy_language', lang);
        window.dispatchEvent(new CustomEvent('lucy_language_changed', { detail: { lang } }));
    };

    const handleSelect = (lang: SupportedLanguage) => {
        setCurrentLang(lang);
        applyLanguage(lang);
        setIsOpen(false);
    };

    const current = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES.en;

    return (
        <div ref={containerRef} className={`relative inline-block text-left z-50 ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 border bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-zinc-300 hover:text-white backdrop-blur-md shadow-lg shadow-black/20"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-sm leading-none">{current.flag}</span>
                {variant === 'full' ? (
                    <span>{current.nativeName}</span>
                ) : (
                    <span className="uppercase text-[10px] font-mono tracking-widest">{current.code}</span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 mt-2 w-56 rounded-2xl bg-zinc-950/90 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/80 py-1.5 focus:outline-none overflow-hidden z-50 divide-y divide-white/5"
                    >
                        <div className="px-3 py-2 text-[10px] font-mono tracking-widest uppercase text-zinc-500">
                            Select Language
                        </div>
                        <div className="max-h-64 overflow-y-auto py-1">
                            {Object.values(SUPPORTED_LANGUAGES).map((meta) => {
                                const isSelected = meta.code === currentLang;
                                return (
                                    <button
                                        key={meta.code}
                                        onClick={() => handleSelect(meta.code)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors duration-150 ${
                                            isSelected
                                                ? 'bg-cyan-500/10 text-cyan-400 font-semibold'
                                                : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-base">{meta.flag}</span>
                                            <div className="flex flex-col text-left">
                                                <span className="leading-tight">{meta.nativeName}</span>
                                                <span className="text-[10px] text-zinc-500 font-mono">{meta.label}</span>
                                            </div>
                                        </div>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
