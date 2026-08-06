"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { WORLD_LANGUAGES, Language, DEFAULT_LANGUAGE } from '@/lib/i18n/languages';
import { getTranslation } from '@/lib/i18n/translations';

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

    useEffect(() => {
        // 1. Check saved language preference in localStorage or cookie
        const savedCode = localStorage.getItem('lucy_language');
        if (savedCode) {
            const found = WORLD_LANGUAGES.find(l => l.code === savedCode);
            if (found) {
                setLanguageState(found);
                document.documentElement.dir = found.dir;
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
            }
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('lucy_language', lang.code);
        document.cookie = `lucy_language=${lang.code}; path=/; max-age=31536000`;
        document.documentElement.dir = lang.dir;
        document.documentElement.lang = lang.code;
    };

    const t = (key: string, fallback?: string): string => {
        const translated = getTranslation(key, language.code);
        if (translated !== key) return translated;
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
