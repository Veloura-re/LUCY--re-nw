"use client";

import Script from "next/script";
import { useEffect } from "react";

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
  useEffect(() => {
    const initTranslate = () => {
      if (typeof window !== "undefined" && window.google?.translate?.TranslateElement) {
        try {
          const container = document.getElementById("google_translate_element");
          if (container && !container.hasChildNodes()) {
            new window.google.translate.TranslateElement(
              {
                pageLanguage: "en",
                autoDisplay: false,
              },
              "google_translate_element"
            );
          }
        } catch {
          // Silently handle re-initialization guards
        }
      }
    };

    window.googleTranslateElementInit = initTranslate;

    // If script loaded prior to effect execution
    if (window.google?.translate?.TranslateElement) {
      initTranslate();
    }

    // Polling watch to ensure combo mounts cleanly once script evaluates
    const pollInterval = setInterval(() => {
      const combo = document.querySelector(".goog-te-combo");
      if (combo) {
        clearInterval(pollInterval);
      } else if (window.google?.translate?.TranslateElement) {
        initTranslate();
      }
    }, 200);

    const timeout = setTimeout(() => clearInterval(pollInterval), 8000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <>
      {/* Permanent offscreen bridge container for Google Translate widget */}
      <div
        id="google_translate_element"
        aria-hidden="true"
        className="pointer-events-none fixed -left-[9999px] -top-[9999px] h-px w-px overflow-hidden opacity-0 z-[-9999]"
      />

      {/* Inline synchronous initializer callback */}
      <script
        id="google-translate-inline-init"
        dangerouslySetInnerHTML={{
          __html: `
            window.googleTranslateElementInit = function() {
              if (window.google && window.google.translate && window.google.translate.TranslateElement) {
                try {
                  var el = document.getElementById('google_translate_element');
                  if (el && !el.hasChildNodes()) {
                    new window.google.translate.TranslateElement({
                      pageLanguage: 'en',
                      autoDisplay: false
                    }, 'google_translate_element');
                  }
                } catch(e) {}
              }
            };
          `,
        }}
      />

      {/* External Google Translate engine runtime */}
      <Script
        id="google-translate-script"
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  );
}
