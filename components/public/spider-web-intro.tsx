"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SpiderWebIntroProps {
  onDone: () => void;
}

interface WebStrand {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  controlX: number;
  controlY: number;
  baseControlX: number;
  baseControlY: number;
  vx: number;
  vy: number;
  vibration: number;
  vibrationSpeed: number;
  snapped: boolean;
  snapProgress: number;
  recoilAngle: number;
  opacity: number;
  color: string;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

export function SpiderWebIntro({ onDone }: SpiderWebIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [percent, setPercent] = useState(0);
  const [snapped, setSnapped] = useState(false);
  const [lucyState, setLucyState] = useState<{
    y: number;
    vy: number;
    rotate: number;
    vRotate: number;
    opacity: number;
    scale: number;
  }>({
    y: 0,
    vy: 0,
    rotate: 0,
    vRotate: 0,
    opacity: 1,
    scale: 1,
  });

  const mouseRef = useRef<{ x: number; y: number; lastX: number; lastY: number; active: boolean }>({
    x: -9999,
    y: -9999,
    lastX: -9999,
    lastY: -9999,
    active: false
  });

  const isDarkModeRef = useRef(true);
  const hasTriggeredDone = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkTheme = () => {
      isDarkModeRef.current =
        document.documentElement.classList.contains("dark") ||
        !document.documentElement.classList.contains("light");
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const triggerSnap = useCallback(() => {
    if (snapped) return;
    setSnapped(true);
  }, [snapped]);

  useEffect(() => {
    const hasBooted = sessionStorage.getItem("lucy_booted");
    if (hasBooted) {
      onDone();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener("resize", handleResize);

    const cx = width / 2;
    const cy = height / 2;

    // Generate Silk Strands connecting the screen corners and borders to the central 'LUCY' entity
    const strands: WebStrand[] = [];
    const numAnchors = 14;

    const colorsDark = ["#3BD68D", "#10B981", "#34D399", "#06B6D4", "#A7F3D0", "#FFFFFF"];
    const colorsLight = ["#059669", "#10B981", "#0D9488", "#047857", "#2563EB"];

    // 1. Primary Radial Anchor Cords (Screen borders to LUCY hub)
    const anchorPoints: { x: number; y: number }[] = [
      { x: 0, y: 0 }, // Top-Left
      { x: width * 0.25, y: 0 },
      { x: width * 0.5, y: 0 }, // Top-Center
      { x: width * 0.75, y: 0 },
      { x: width, y: 0 }, // Top-Right
      { x: width, y: height * 0.35 },
      { x: width, y: height * 0.65 },
      { x: width, y: height }, // Bottom-Right
      { x: width * 0.75, y: height },
      { x: width * 0.5, y: height }, // Bottom-Center
      { x: width * 0.25, y: height },
      { x: 0, y: height }, // Bottom-Left
      { x: 0, y: height * 0.65 },
      { x: 0, y: height * 0.35 },
    ];

    anchorPoints.forEach((pt, i) => {
      // Connect to center region around 'LUCY' text box
      const targetAngle = (i / anchorPoints.length) * Math.PI * 2;
      const targetRadiusX = Math.min(220, width * 0.28);
      const targetRadiusY = Math.min(90, height * 0.12);
      const targetX = cx + Math.cos(targetAngle) * targetRadiusX;
      const targetY = cy + Math.sin(targetAngle) * targetRadiusY;

      const midX = (pt.x + targetX) / 2;
      const midY = (pt.y + targetY) / 2 + 15; // Natural gravity sag

      strands.push({
        startX: pt.x,
        startY: pt.y,
        endX: targetX,
        endY: targetY,
        controlX: midX,
        controlY: midY,
        baseControlX: midX,
        baseControlY: midY,
        vx: 0,
        vy: 0,
        vibration: 0,
        vibrationSpeed: 0.1 + Math.random() * 0.15,
        snapped: false,
        snapProgress: 0,
        recoilAngle: Math.atan2(pt.y - targetY, pt.x - targetX),
        opacity: 0.75 + Math.random() * 0.25,
        color: colorsDark[i % colorsDark.length],
      });
    });

    // 2. Concentric Spiral Web Loops encircling LUCY
    const concentricRings = 4;
    for (let r = 1; r <= concentricRings; r++) {
      const ringRadiusX = (Math.min(260, width * 0.32) / concentricRings) * r;
      const ringRadiusY = (Math.min(120, height * 0.16) / concentricRings) * r;
      const segments = 12;

      for (let s = 0; s < segments; s++) {
        const a1 = (s / segments) * Math.PI * 2;
        const a2 = ((s + 1) / segments) * Math.PI * 2;

        const p1x = cx + Math.cos(a1) * ringRadiusX;
        const p1y = cy + Math.sin(a1) * ringRadiusY;
        const p2x = cx + Math.cos(a2) * ringRadiusX;
        const p2y = cy + Math.sin(a2) * ringRadiusY;

        // Inward catenary sag between web vertices
        const midA = (a1 + a2) / 2;
        const sagFactor = 0.88;
        const midX = cx + Math.cos(midA) * (ringRadiusX * sagFactor);
        const midY = cy + Math.sin(midA) * (ringRadiusY * sagFactor);

        strands.push({
          startX: p1x,
          startY: p1y,
          endX: p2x,
          endY: p2y,
          controlX: midX,
          controlY: midY,
          baseControlX: midX,
          baseControlY: midY,
          vx: 0,
          vy: 0,
          vibration: 0,
          vibrationSpeed: 0.15 + Math.random() * 0.1,
          snapped: false,
          snapProgress: 0,
          recoilAngle: midA,
          opacity: 0.55 + Math.random() * 0.3,
          color: colorsDark[(r + s) % colorsDark.length],
        });
      }
    }

    const sparks: Spark[] = [];

    let startTime = performance.now();
    const duration = 2200; // 2.2s tension buildup
    let animationFrameId: number;
    let localSnapped = false;

    let lucyY = 0;
    let lucyVy = 0;
    let lucyRotate = 0;
    let lucyVRotate = 0;
    let lucyOpacity = 1;
    let lucyScale = 1;

    const render = (now: number) => {
      const isDark = isDarkModeRef.current;
      const palette = isDark ? colorsDark : colorsLight;

      ctx.clearRect(0, 0, width, height);

      // Tension progress calculation
      const elapsed = now - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      const easeProgress = 1 - Math.pow(1 - rawProgress, 3);
      setPercent(Math.floor(easeProgress * 100));

      if (rawProgress >= 1 && !localSnapped) {
        localSnapped = true;
        setSnapped(true);

        // Spawn Silk Snap Sparks
        strands.forEach((s) => {
          s.snapped = true;
          for (let k = 0; k < 4; k++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            sparks.push({
              x: s.controlX,
              y: s.controlY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 2,
              alpha: 1.0,
              color: s.color,
              size: 1.5 + Math.random() * 2.5,
            });
          }
        });
      }

      // Mouse interaction: pluck silk strands on hover
      const mouse = mouseRef.current;
      if (mouse.active && !localSnapped) {
        strands.forEach((s) => {
          // Distance from mouse to strand control point
          const mdx = mouse.x - s.controlX;
          const mdy = mouse.y - s.controlY;
          const dist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (dist < 80 && dist > 0) {
            const force = (1 - dist / 80) * 12;
            s.vx += (mdx / dist) * force;
            s.vy += (mdy / dist) * force;
            s.vibration = 1.0;
          }
        });
      }

      // Render Silk Strands
      strands.forEach((s) => {
        if (!s.snapped) {
          // Tension vibration
          if (s.vibration > 0.01) {
            s.vibration *= 0.94;
          }
          const wobble = Math.sin(now * s.vibrationSpeed * 0.05) * (s.vibration * 18);
          s.controlX += (s.baseControlX - s.controlX) * 0.12 + s.vx;
          s.controlY += (s.baseControlY - s.controlY) * 0.12 + s.vy + wobble;
          s.vx *= 0.85;
          s.vy *= 0.85;

          // Draw Silk Curve
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(s.startX, s.startY);
          ctx.quadraticCurveTo(s.controlX, s.controlY, s.endX, s.endY);
          ctx.strokeStyle = isDark
            ? `rgba(59, 214, 141, ${s.opacity * 0.65})`
            : `rgba(16, 185, 129, ${s.opacity * 0.75})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Dewdrop along the silk center
          ctx.beginPath();
          ctx.arc(s.controlX, s.controlY, 2.0, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? "#A7F3D0" : "#059669";
          ctx.fill();
          ctx.restore();
        } else {
          // Recoil physics when snapped
          s.snapProgress += 0.06;
          if (s.snapProgress < 1.2) {
            const recoilDist = s.snapProgress * 90;
            const currentEndX = s.startX + Math.cos(s.recoilAngle) * recoilDist;
            const currentEndY = s.startY + Math.sin(s.recoilAngle) * recoilDist;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(s.startX, s.startY);
            ctx.quadraticCurveTo(s.controlX, s.controlY, currentEndX, currentEndY);
            ctx.strokeStyle = isDark
              ? `rgba(59, 214, 141, ${(1 - s.snapProgress / 1.2) * 0.8})`
              : `rgba(16, 185, 129, ${(1 - s.snapProgress / 1.2) * 0.8})`;
            ctx.lineWidth = 1.4;
            ctx.stroke();
            ctx.restore();
          }
        }
      });

      // Render Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.25; // gravity on sparks
        sp.alpha *= 0.93;

        if (sp.alpha > 0.02) {
          ctx.save();
          ctx.globalAlpha = sp.alpha;
          ctx.fillStyle = sp.color;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          sparks.splice(i, 1);
        }
      }

      // Physics for 'LUCY' Plummet
      if (localSnapped) {
        lucyVy += 1.35; // Gravitational acceleration
        lucyY += lucyVy;
        lucyVRotate += 0.08;
        lucyRotate += lucyVRotate;
        lucyScale = Math.max(0.85, lucyScale - 0.006);

        if (lucyY > height * 0.6) {
          lucyOpacity = Math.max(0, lucyOpacity - 0.05);
        }

        setLucyState({
          y: lucyY,
          vy: lucyVy,
          rotate: lucyRotate,
          vRotate: lucyVRotate,
          opacity: lucyOpacity,
          scale: lucyScale,
        });

        // Once LUCY has dropped off-screen, trigger onDone
        if (lucyY > height * 1.1 && !hasTriggeredDone.current) {
          hasTriggeredDone.current = true;
          sessionStorage.setItem("lucy_booted", "true");
          setTimeout(() => {
            onDone();
          }, 150);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        triggerSnap();
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDone, triggerSnap]);

  return (
    <div
      onClick={triggerSnap}
      className="fixed inset-0 z-[999] bg-white dark:bg-black flex flex-col items-center justify-center font-mono overflow-hidden cursor-pointer select-none"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Trapped 'LUCY' Typography Entity */}
      <motion.div
        style={{
          transform: `translateY(${lucyState.y}px) rotate(${lucyState.rotate}deg) scale(${lucyState.scale})`,
          opacity: lucyState.opacity,
          willChange: "transform, opacity",
        }}
        className="relative z-10 flex flex-col items-center justify-center pointer-events-none"
      >
        {/* Glow Halo behind LUCY while trapped */}
        {!snapped && (
          <div className="absolute w-[360px] h-[180px] sm:w-[600px] sm:h-[300px] bg-emerald-500/15 dark:bg-emerald-400/20 blur-[90px] rounded-full pointer-events-none animate-pulse" />
        )}

        <div className="relative inline-block text-6xl sm:text-8xl md:text-[13rem] font-black tracking-tighter text-slate-200 dark:text-zinc-900 select-none uppercase leading-none font-mono">
          LUCY
          <div
            className="absolute bottom-0 left-0 right-0 overflow-hidden"
            style={{ height: `${percent}%` }}
          >
            <div className="absolute bottom-0 left-0 right-0 text-slate-900 dark:text-white text-center flex justify-center whitespace-nowrap text-emerald-600 dark:text-emerald-400">
              LUCY
            </div>
          </div>
        </div>

        {/* Tension & Web Status Indicator */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 text-slate-600 dark:text-zinc-400 text-xs sm:text-sm tracking-[0.3em] font-bold uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{snapped ? "WEB_SNAPPED // GRAVITY_DROP" : `WEB_TENSION // ${percent.toString().padStart(3, "0")}%`}</span>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-zinc-600 uppercase tracking-widest mt-1">
            [click or press space to sever web]
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default SpiderWebIntro;
