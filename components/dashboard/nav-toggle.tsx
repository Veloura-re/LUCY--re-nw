"use client";

import { Button } from "@/components/ui/button";
import { LayoutGrid, PanelLeft } from "lucide-react";
import { updateNavPreference } from "@/utils/nav-actions";

export function NavToggle({ mode }: { mode: "DOCK" | "SIDEBAR" }) {
    const isDock = mode === "DOCK";

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => updateNavPreference(mode)}
            className="w-full gap-2 border-zinc-300 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 hover:bg-eduGreen-900/20 hover:text-eduGreen-400 hover:border-eduGreen-900/50 text-[10px] uppercase tracking-widest font-bold py-5 rounded-xl transition-all"
        >
            {isDock ? (
                <>
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Switch to Dock
                </>
            ) : (
                <>
                    <PanelLeft className="w-3.5 h-3.5" />
                    Switch to Sidebar
                </>
            )}
        </Button>
    );
}
