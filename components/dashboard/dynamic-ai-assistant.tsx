"use client";

import dynamic from 'next/dynamic';
import { safeImport } from '@/lib/dynamic-import';

const AIAssistantComponent = dynamic(
    () => safeImport(() => import('./ai-assistant').then(mod => mod.AIAssistant), 'AIAssistant'),
    {
        ssr: false,
        loading: () => null
    }
);

export function DynamicAIAssistant({ userName, userId }: { userName?: string; userId?: string }) {
    return <AIAssistantComponent userName={userName} userId={userId} />;
}
