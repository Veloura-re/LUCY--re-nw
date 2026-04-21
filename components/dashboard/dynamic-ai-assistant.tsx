"use client";

import dynamic from 'next/dynamic';

const AIAssistantComponent = dynamic(
    () => import('./ai-assistant').then(mod => mod.AIAssistant),
    {
        ssr: false,
        loading: () => null // Don't show anything while loading
    }
);

export function DynamicAIAssistant({ userName, userId }: { userName?: string; userId?: string }) {
    return <AIAssistantComponent userName={userName} userId={userId} />;
}
