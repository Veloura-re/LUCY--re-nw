"use client";

import { useState, useEffect } from "react";
import { RoleTutorial } from "./role-tutorial";

export function NeuralTutorialWrapper({ role }: { role: string }) {
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        const handleOpen = () => setShowTutorial(true);
        window.addEventListener('lucy:open-tutorial', handleOpen);

        const hasSeen = localStorage.getItem(`tutorial_seen_${role}`);
        if (!hasSeen) {
            const timer = setTimeout(() => {
                setShowTutorial(true);
            }, 1500);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('lucy:open-tutorial', handleOpen);
            };
        }
        return () => window.removeEventListener('lucy:open-tutorial', handleOpen);
    }, [role]);

    const handleClose = () => {
        setShowTutorial(false);
    };

    if (!showTutorial) return null;

    return <RoleTutorial role={role} onClose={handleClose} />;
}
