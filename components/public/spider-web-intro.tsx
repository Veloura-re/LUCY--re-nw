"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SpiderWebIntroProps {
  onDone: () => void;
}

export function SpiderWebIntro({ onDone }: SpiderWebIntroProps) {
  const [done, setDone] = useState(false);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const hasBooted = sessionStorage.getItem("lucy_booted");
    if (hasBooted) {
      setDone(true);
      onDone();
      return;
    }

    let startTime = performance.now();
    const duration = 700; // Exactly 0.7 seconds of animation

    let animationFrameId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Smooth ease-out curve
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setPercent(Math.floor(easeProgress * 100));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        sessionStorage.setItem("lucy_booted", "true");
        setDone(true);
        setTimeout(onDone, 120);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    const handleSkip = () => {
      sessionStorage.setItem("lucy_booted", "true");
      setDone(true);
      onDone();
    };

    window.addEventListener("keydown", handleSkip);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("keydown", handleSkip);
    };
  }, [onDone]);

  const handleContainerClick = () => {
    sessionStorage.setItem("lucy_booted", "true");
    setDone(true);
    onDone();
  };

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          onClick={handleContainerClick}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed inset-0 z-[999] bg-white dark:bg-black flex flex-col items-center justify-center font-mono cursor-pointer select-none"
        >
          {/* Ambient Glow behind LUCY */}
          <div className="absolute w-[320px] h-[180px] sm:w-[540px] sm:h-[260px] bg-emerald-500/15 dark:bg-emerald-400/20 blur-[90px] rounded-full pointer-events-none" />

          {/* Clean 'LUCY' 0.7s Fill Typography */}
          <div className="relative inline-block text-6xl sm:text-8xl md:text-[13rem] font-black tracking-tighter text-slate-200 dark:text-zinc-900 select-none uppercase leading-none font-mono">
            LUCY
            <div
              className="absolute bottom-0 left-0 right-0 overflow-hidden transition-[height] ease-linear"
              style={{ height: `${percent}%` }}
            >
              <div className="absolute bottom-0 left-0 right-0 text-emerald-600 dark:text-emerald-400 text-center flex justify-center whitespace-nowrap">
                LUCY
              </div>
            </div>
          </div>

          {/* Percentage Counter */}
          <div className="mt-8 flex items-center gap-3 text-slate-500 dark:text-zinc-500 text-xs sm:text-sm tracking-[0.3em] font-bold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{percent.toString().padStart(3, "0")}%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SpiderWebIntro;
