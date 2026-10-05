"use client";

import dynamic from "next/dynamic";
import { safeImport } from "@/lib/dynamic-import";

export const InteractiveTour = dynamic(
    () => safeImport(() => import("@/components/dashboard/interactive-tour").then(m => m.InteractiveTour), "InteractiveTour"),
    { ssr: false }
);

export const NetworkBanner = dynamic(
    () => safeImport(() => import("@/components/ui/network-banner").then(m => m.NetworkBanner), "NetworkBanner"),
    { ssr: false }
);

