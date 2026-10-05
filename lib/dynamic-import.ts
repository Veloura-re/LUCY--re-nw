/**
 * Resilient Dynamic Import & Chunk Loading Utility
 * Handles flaky, high-latency, or low-bandwidth connections by retrying
 * dynamic chunk imports with exponential backoff and safe fallbacks.
 */

import React from 'react';

export async function retryImport<T>(
    importFn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 800
): Promise<T> {
    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            return await importFn();
        } catch (error: any) {
            attempt++;
            if (attempt > maxRetries) {
                console.warn(`[retryImport] Module import failed after ${maxRetries} attempts:`, error?.message || error);
                throw error;
            }
            const delay = initialDelayMs * Math.pow(1.8, attempt - 1);
            console.warn(`[retryImport] Chunk import failed (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw new Error('Module import retry limit reached');
}

/**
 * Creates a safe fallback module that renders a non-breaking null or placeholder
 * if a non-critical chunk fails to load after retries.
 */
export async function safeImport<T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default?: T } | T>,
    fallbackName: string = 'Component'
): Promise<{ default: React.ComponentType<any> }> {
    try {
        const mod: any = await retryImport(importFn, 3, 1000);
        if (mod && mod.default) {
            return { default: mod.default };
        }
        if (typeof mod === 'function') {
            return { default: mod };
        }
        return { default: () => null };
    } catch (err) {
        console.warn(`[safeImport] Non-critical component "${fallbackName}" failed to load over network. Using non-blocking placeholder.`, err);
        return { default: () => null };
    }
}
