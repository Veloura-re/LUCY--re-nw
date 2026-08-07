"use client";

import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

interface SchoolLogoProps {
    logoUrl?: string | null;
    className?: string;
    fallbackSize?: string;
}

export function SchoolLogo({ logoUrl, className, fallbackSize = "w-8 h-8 sm:w-10 sm:h-10" }: SchoolLogoProps) {
    const [hasError, setHasError] = useState(false);

    if (!logoUrl || !logoUrl.trim() || hasError) {
        return <Logo className={fallbackSize} />;
    }

    return (
        <img
            src={logoUrl}
            alt=""
            onError={() => setHasError(true)}
            className={cn("object-contain rounded-lg sm:rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 p-1", className || fallbackSize)}
        />
    );
}
