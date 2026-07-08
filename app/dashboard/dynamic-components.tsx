"use client";

import dynamic from "next/dynamic";

export const DynamicAIAssistant = dynamic(() => import("@/components/dashboard/dynamic-ai-assistant").then(m => m.DynamicAIAssistant), { ssr: false });
export const InteractiveTour = dynamic(() => import("@/components/dashboard/interactive-tour").then(m => m.InteractiveTour), { ssr: false });
export const NetworkBanner = dynamic(() => import("@/components/ui/network-banner").then(m => m.NetworkBanner), { ssr: false });
