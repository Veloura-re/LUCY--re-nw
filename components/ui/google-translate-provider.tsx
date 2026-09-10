"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages?: string;
            autoDisplay?: boolean;
            layout?: unknown;
          },
          elementId: string
        ) => void;
      };
    };
  }
}

export function GoogleTranslateProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    window.googleTranslateElementInit = () => {
      if (window.google?.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            autoDisplay: false,
          },
          "google_translate_element"
        );
      }
    };

    // If script already loaded prior to effect
    if (window.google?.translate && window.googleTranslateElementInit) {
      window.googleTranslateElementInit();
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* Hidden bridge container for Google Translate widget */}
      <div
        id="google_translate_element"
        aria-hidden="true"
        className="notranslate pointer-events-none absolute -left-[9999px] -top-[9999px] h-0 w-0 overflow-hidden opacity-0"
        style={{ display: "none" }}
      />
      <Script
        id="google-translate-script"
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  );
}
