"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

// ─── Canvas Confetti Component ──────────────────────────────────────────────────
function CanvasConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const colors = ["#10b981", "#6366f1", "#f59e0b", "#38bdf8", "#ec4899", "#14b8a6"];
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    // Spawn particles
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      let active = false;

      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y < height) {
          active = true;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (active) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1000] w-full h-full" />;
}

export function WelcomeAnnouncement() {
  const [showV1Doc, setShowV1Doc] = useState(false);

  useEffect(() => {
    const hasAnnounced = localStorage.getItem("lucy_v1_announced");
    if (!hasAnnounced) {
      setShowV1Doc(true);
    }
  }, []);

  return (
    <AnimatePresence>
      {showV1Doc && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <CanvasConfetti />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="relative max-w-2xl w-full bg-white/95 dark:bg-zinc-950/95 border border-slate-200 dark:border-white/10 p-8 md:p-10 rounded-3xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto space-y-6 lowercase text-left font-mono tracking-tight"
          >
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-emerald-500/30 bg-emerald-950/20 text-[10px] text-emerald-400 font-bold uppercase tracking-widest rounded-full">
                ★ system_announcement // active
              </div>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                finally, <span className="text-emerald-500 dark:text-emerald-400">its up!</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-md mx-auto leading-relaxed">
                LUCY OS version 1.0 is initialized and online. evaluate the core feature specifications logged below.
              </p>
            </div>

            {/* Specs Grid */}
            <div className="space-y-4 border-t border-b border-slate-200 dark:border-white/5 py-6">
              <div className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-2">[system_changelog_v1]</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01]">
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-1">⚡ 3d community grids</div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                    redesigned community links inside a 3d squircle tile format. hover events trigger spring depth z-perspective and tooltip details.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01]">
                  <div className="text-indigo-600 dark:text-indigo-400 font-bold mb-1">🔒 security vault</div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                    the security disclosure form receives vulnerabilities and maps reports to the secure system database.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01]">
                  <div className="text-sky-600 dark:text-sky-400 font-bold mb-1">📩 wants access ledger</div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                    public contact transmissions route to our new db wants-access ledger, viewable inside the admin panel.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01]">
                  <div className="text-amber-600 dark:text-amber-400 font-bold mb-1">🎓 grade matching</div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                    automatic exam grading computes mcq and short-answer keywords, upserting reports directly into the database.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01]">
                  <div className="text-pink-600 dark:text-pink-400 font-bold mb-1">✉️ parent sync</div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                    grade reports deliver automatically to student parents via resend onboarding integration.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01]">
                  <div className="text-teal-600 dark:text-teal-400 font-bold mb-1">🏫 institutional ledger</div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                    superadmins can create, activate, or suspend entire school environments under supreme ledger rules.
                  </p>
                </div>
              </div>
            </div>

            {/* Community Links */}
            <div className="border-t border-slate-200 dark:border-white/5 pt-4 text-center">
              <div className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-3">[community_uplinks]</div>
              <div className="flex flex-wrap justify-center gap-3 text-[10px] font-mono">
                <a href="https://t.me/+ElIFqzvGBlYzMDBk" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl border border-sky-500/20 bg-sky-50 dark:bg-sky-950/10 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-all">
                  telegram
                </a>
                <a href="https://discord.gg/Kbm4XhzfMJ" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-50 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all">
                  discord
                </a>
                <a href="https://www.youtube.com/@LucyAcademics" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">
                  youtube
                </a>
                <a href="https://tiktok.com/@lucy.os" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl border border-pink-500/20 bg-pink-50 dark:bg-pink-950/10 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-all">
                  tiktok
                </a>
                <a href="https://www.instagram.com/lucy_devs/" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl border border-orange-500/20 bg-orange-50 dark:bg-orange-950/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all">
                  instagram
                </a>
                <a href="https://x.com/GoodLuckfus" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/25 transition-all">
                  x.com
                </a>
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center pt-2">
              <Button
                onClick={() => {
                  localStorage.setItem("lucy_v1_announced", "true");
                  setShowV1Doc(false);
                }}
                className="w-full md:w-auto h-12 px-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-emerald-950/20 transition-all"
              >
                establish_session
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
