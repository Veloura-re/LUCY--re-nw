"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

    // Dynamic DOM auto-translator for all software pages
    const translateDomNodes = useCallback((targetLang: Language) => {
        if (typeof window === 'undefined' || targetLang.code === 'en') return;

        const termMap = GLOBAL_TERM_MAP[targetLang.code];
        if (!termMap) return;

        const walkAndTranslate = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
                const trimmed = node.nodeValue.trim().toLowerCase();
                if (termMap[trimmed]) {
                    node.nodeValue = node.nodeValue.replace(new RegExp(`\\b${trimmed}\\b`, 'gi'), termMap[trimmed]);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Skip script/style/input elements
                const tagName = (node as Element).tagName?.toUpperCase();
                if (tagName !== 'SCRIPT' && tagName !== 'STYLE' && tagName !== 'INPUT' && tagName !== 'TEXTAREA') {
                    for (let i = 0; i < node.childNodes.length; i++) {
                        walkAndTranslate(node.childNodes[i]);
                    }
                }
            }
        };

        requestAnimationFrame(() => {
            walkAndTranslate(document.body);
        });
    }, []);

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
