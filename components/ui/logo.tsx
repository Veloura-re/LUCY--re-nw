"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
    return (
        <motion.div 
            whileHover={{ scale: 1.15, rotateY: 180 }} 
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={cn("flex items-center justify-center text-white", className)}
        >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full stroke-[1.5]">
                <path d="M7 3C7 3 13 8 13 12C13 16 7 21 7 21" stroke="currentColor" strokeLinecap="round"/>
                <path d="M17 3C17 3 11 8 11 12C11 16 17 21 17 21" stroke="currentColor" strokeLinecap="round" opacity="0.5"/>
                <path d="M8 7H16" stroke="currentColor" strokeLinecap="round" strokeDasharray="1 3"/>
                <path d="M10 12H14" stroke="currentColor" strokeLinecap="round" strokeDasharray="1 3"/>
                <path d="M8 17H16" stroke="currentColor" strokeLinecap="round" strokeDasharray="1 3"/>
            </svg>
        </motion.div>
    );
}
