"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Globe, Search, Check, X, ChevronDown, RotateCcw, Languages, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  iso: string;
  popular?: boolean;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", iso: "EN", popular: true },
  { code: "es", name: "Spanish", nativeName: "Español", iso: "ES", popular: true },
  { code: "fr", name: "French", nativeName: "Français", iso: "FR", popular: true },
  { code: "de", name: "German", nativeName: "Deutsch", iso: "DE", popular: true },
  { code: "ar", name: "Arabic", nativeName: "العربية", iso: "AR", popular: true },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", iso: "ZH", popular: true },
  { code: "ja", name: "Japanese", nativeName: "日本語", iso: "JA", popular: true },
  { code: "pt", name: "Portuguese", nativeName: "Português", iso: "PT", popular: true },
  { code: "ru", name: "Russian", nativeName: "Русский", iso: "RU", popular: true },
  { code: "ko", name: "Korean", nativeName: "한국어", iso: "KO", popular: true },
  { code: "it", name: "Italian", nativeName: "Italiano", iso: "IT" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", iso: "HI" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", iso: "SW" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", iso: "NL" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", iso: "TR" },
  { code: "pl", name: "Polish", nativeName: "Polski", iso: "PL" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", iso: "VI" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", iso: "ID" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", iso: "UK" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", iso: "SV" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", iso: "EL" },
  { code: "iw", name: "Hebrew", nativeName: "עברית", iso: "HE" },
  { code: "th", name: "Thai", nativeName: "ไทย", iso: "TH" },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文", iso: "ZT" },
];

function getActiveLanguageCookie(): string {
  if (typeof document === "undefined") return "en";
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith("googtrans=")) {
      const val = decodeURIComponent(trimmed.substring("googtrans=".length));
      const parts = val.split("/");
      if (parts.length >= 3 && parts[2]) {
        return parts[2];
      }
    }
  }
  return "en";
}

function setGoogleTransCookie(code: string) {
  if (typeof document === "undefined") return;
  const isEnglish = code.toLowerCase() === "en";
  const cookieVal = isEnglish ? "" : `/en/${code}`;
  const expireStr = isEnglish
    ? "expires=Thu, 01 Jan 1970 00:00:00 UTC;"
    : "expires=Fri, 31 Dec 9999 23:59:59 GMT;";

  // 1. Root path cookie (works on localhost, IPv4/v6, and standard origins)
  document.cookie = `googtrans=${cookieVal}; path=/; ${expireStr}`;

  // 2. Domain-scoped cookie if host has dot notation (e.g. lucy-re-nw.vercel.app)
  const host = window.location.hostname;
  if (host && host.includes(".")) {
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${host}; ${expireStr}`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=.${host}; ${expireStr}`;
  }

  // 3. Fallback /auto/ format
  const autoVal = isEnglish ? "" : `/auto/${code}`;
  document.cookie = `googtrans=${autoVal}; path=/; ${expireStr}`;
}

function triggerGoogleComboDirectly(code: string): boolean {
  if (typeof document === "undefined") return false;
  const isEnglish = code.toLowerCase() === "en";
  const combo = (document.querySelector(".goog-te-combo") as unknown) as HTMLSelectElement | null;
  if (!combo) return false;

  const targetVal = isEnglish ? "" : code;
  let found = false;

  for (let i = 0; i < combo.options.length; i++) {
    const optVal = combo.options[i].value;
    if (
      optVal.toLowerCase() === targetVal.toLowerCase() ||
      (isEnglish && (optVal === "" || optVal.toLowerCase() === "en"))
    ) {
      combo.selectedIndex = i;
      found = true;
      break;
    }
  }

  if (!found && !isEnglish) {
    combo.value = code;
  }

  if (typeof combo.onchange === "function") {
    try {
      combo.onchange(new Event("change"));
    } catch {
      // ignore
    }
  }

  combo.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

interface LanguageSelectorProps {
  variant?: "default" | "compact" | "minimal";
  className?: string;
}

export function LanguageSelector({ variant = "default", className }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCode, setActiveCode] = useState<string>("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Synchronize active language state from cookie on mount
  useEffect(() => {
    const initialLang = getActiveLanguageCookie();
    setActiveCode(initialLang);
  }, []);

  // Keyboard navigation and outside click dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    searchInputRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activeLanguage = useMemo(() => {
    return (
      SUPPORTED_LANGUAGES.find((lang) => lang.code.toLowerCase() === activeCode.toLowerCase()) ||
      SUPPORTED_LANGUAGES[0]
    );
  }, [activeCode]);

  const filteredLanguages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.iso.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const selectLanguage = (code: string) => {
    setActiveCode(code);
    setIsTranslating(true);
    setIsOpen(false);
    setSearchQuery("");

    // 1. Write the cookies immediately
    setGoogleTransCookie(code);

    // 2. Dispatch custom event for telemetry
    window.dispatchEvent(new CustomEvent("lucy-language-change", { detail: code }));

    // 3. Attempt live DOM combo switch
    triggerGoogleComboDirectly(code);

    // 4. Guaranteed full-page translation reload
    // A rapid reload with the cookie set ensures that all server-rendered text,
    // client components, and nested views load cleanly without virtual DOM conflicts.
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  return (
    <div className={cn("relative notranslate select-none", className)} translate="no">
      {/* Trigger Capsule Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Select institutional language"
        className={cn(
          "group flex items-center gap-2 cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
          variant === "compact"
            ? "px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs"
            : "px-3 py-1.5 rounded-xl bg-white/80 dark:bg-black/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm hover:border-emerald-500/50 dark:hover:border-emerald-500/40"
        )}
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          {isTranslating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
          ) : (
            <Globe className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-12" />
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-200">
          <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
            {activeLanguage.iso}
          </span>
          <span className="hidden sm:inline text-slate-500 dark:text-zinc-400 font-medium text-[11px]">
            {activeLanguage.nativeName}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 transition-transform duration-200",
            isOpen && "rotate-180 text-emerald-500"
          )}
        />
      </motion.button>

      {/* Modal / Popover Dialog */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm sm:hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed sm:absolute z-50 left-4 right-4 sm:left-auto sm:right-0 top-20 sm:top-full sm:mt-2 sm:w-[420px] max-h-[85vh] sm:max-h-[540px] flex flex-col rounded-2xl bg-white/95 dark:bg-[#0c0d12]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Languages className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                      Institutional Translation
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                      Real-time cognitive localization powered by LUCY engine
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close language selector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c0d12]">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search languages or native script..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 transition-all font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Language List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
                {filteredLanguages.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 dark:text-zinc-500">
                    No matching languages found
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {filteredLanguages.map((lang) => {
                      const isSelected = activeCode.toLowerCase() === lang.code.toLowerCase();
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => selectLanguage(lang.code)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-150 outline-none",
                            isSelected
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm"
                              : "bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.06] border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-zinc-300"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={cn(
                                "flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-mono font-bold shrink-0 transition-colors",
                                isSelected
                                  ? "bg-emerald-500 text-white"
                                  : "bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                              )}
                            >
                              {lang.iso}
                            </span>
                            <div className="min-w-0 flex flex-col">
                              <span className="text-xs font-semibold truncate leading-tight">
                                {lang.nativeName}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate leading-tight mt-0.5">
                                {lang.name}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between text-[11px]">
                <span className="text-slate-400 dark:text-zinc-500 font-mono">
                  {SUPPORTED_LANGUAGES.length} Regional Locales
                </span>

                {activeCode.toLowerCase() !== "en" && (
                  <button
                    type="button"
                    onClick={() => selectLanguage("en")}
                    className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to English
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
