"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose
} from "@/components/ui/dialog";
import {
    X,
    Maximize2,
    Minimize2,
    Download,
    ScrollText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FlipBookViewerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fileUrl: string;
}

export function FlipBookViewer({ isOpen, onClose, title, fileUrl }: FlipBookViewerProps) {
    const [mounted, setMounted] = useState(false);
    const [fullScreen, setFullScreen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(val: boolean) => !val && onClose()}>
            <DialogContent className={cn(
                "bg-zinc-950 border-zinc-900 p-0 overflow-hidden flex flex-col transition-all duration-300",
                fullScreen ? "max-w-[100vw] h-[100vh]" : "max-w-[98vw] h-[98vh] rounded-xl"
            )}>
                {/* PDF Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                            <ScrollText className="w-5 h-5 text-eduGreen-500" />
                        </div>
                        <h2 className="text-lg font-semibold text-white truncate max-w-md">{title}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFullScreen(!fullScreen)}
                            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                            {fullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </Button>
                        <a
                            href={fileUrl}
                            download
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-all"
                            title="Download PDF"
                        >
                            <Download className="w-5 h-5" />
                        </a>
                        <div className="w-[1px] h-6 bg-zinc-800 mx-2" />
                        <DialogClose asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </DialogClose>
                    </div>
                </div>

                {/* PDF Content Area */}
                <div className="flex-1 w-full relative bg-zinc-900">
                    <iframe
                        src={`${fileUrl}#view=Fit`}
                        className="w-full h-full min-h-[500px] border-none"
                        title={title}
                        allow="fullscreen"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
