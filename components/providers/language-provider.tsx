"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { WORLD_LANGUAGES, Language, DEFAULT_LANGUAGE } from '@/lib/i18n/languages';
import { getTranslation, GLOBAL_TERM_MAP } from '@/lib/i18n/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
    language: DEFAULT_LANGUAGE,
    setLanguage: () => {},
    t: (key: string, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
    const observerRef = useRef<MutationObserver | null>(null);
    const pathname = usePathname();

    // Universal DOM auto-translator for text nodes, buttons, links, and input placeholders
    const translateDomNodes = useCallback((targetLang: Language) => {
        if (typeof window === 'undefined') return;

        const termMap = GLOBAL_TERM_MAP[targetLang.code];
        if (!termMap && targetLang.code !== 'en') return;

        const walkAndTranslate = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
                let content = node.nodeValue;
                let modified = false;

                if (termMap) {
                    // Check phrase replacements
                    for (const [term, replacement] of Object.entries(termMap)) {
                        const regex = new RegExp(`\\b${term}\\b`, 'gi');
                        if (regex.test(content)) {
                            content = content.replace(regex, replacement);
                            modified = true;
                        }
                    }
                }

                if (modified) {
                    node.nodeValue = content;
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                const tagName = el.tagName?.toUpperCase();

                // Skip raw script / style / SVG internal tags
                if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'SVG') return;

                // Translate input & textarea placeholders
                if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                    const inputEl = el as HTMLInputElement;
                    if (inputEl.placeholder && termMap) {
                        let ph = inputEl.placeholder;
                        for (const [term, replacement] of Object.entries(termMap)) {
                            const regex = new RegExp(`\\b${term}\\b`, 'gi');
                            if (regex.test(ph)) {
                                ph = ph.replace(regex, replacement);
                            }
                        }
                        inputEl.placeholder = ph;
                    }
                }

                // Recursively translate child nodes
                for (let i = 0; i < el.childNodes.length; i++) {
                    walkAndTranslate(el.childNodes[i]);
                }
            }
        };

        requestAnimationFrame(() => {
            walkAndTranslate(document.body);
        });
    }, []);

    // Set up MutationObserver to translate dynamically rendered elements (modals, software views)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    translateDomNodes(language);
                    break;
                }
            }
        });

        observerRef.current.observe(document.body, {
            childList: true,
            subtree: true
        });

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [language, translateDomNodes]);

    // Re-run translation on route navigation across all software pages
    useEffect(() => {
        translateDomNodes(language);
    }, [pathname, language, translateDomNodes]);

    useEffect(() => {
        // 1. Check saved language preference in localStorage or cookie
        const savedCode = localStorage.getItem('lucy_language');
        if (savedCode) {
            const found = WORLD_LANGUAGES.find(l => l.code === savedCode);
            if (found) {
                setLanguageState(found);
                document.documentElement.dir = found.dir;
                document.documentElement.lang = found.code;
                translateDomNodes(found);
                return;
            }
        }

        // 2. Auto-detect browser locale
        if (typeof window !== 'undefined' && navigator.language) {
            const browserCode = navigator.language.split('-')[0].toLowerCase();
            const found = WORLD_LANGUAGES.find(l => l.code === browserCode);
            if (found) {
                setLanguageState(found);
                document.documentElement.dir = found.dir;
                document.documentElement.lang = found.code;
                translateDomNodes(found);
            }
        }
    }, [translateDomNodes]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('lucy_language', lang.code);
        document.cookie = `lucy_language=${lang.code}; path=/; max-age=31536000`;
        document.documentElement.dir = lang.dir;
        document.documentElement.lang = lang.code;
        translateDomNodes(lang);
    };

    const t = (key: string, fallback?: string): string => {
        const translated = getTranslation(key, language.code);
        if (translated && translated !== key) return translated;
        return fallback || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
