'use client';
import { useEffect } from 'react';
import { setupGlobalErrorListeners } from './global-error-boundary';

export function ErrorListenerInit() {
    useEffect(() => {
        setupGlobalErrorListeners();
    }, []);
    return null;
}
