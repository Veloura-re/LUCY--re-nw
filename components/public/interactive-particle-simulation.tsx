"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import { useIsLowPower } from "@/hooks/use-network-quality";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    baseVx: number;
    baseVy: number;
    radius: number;
    baseRadius: number;
    alpha: number;
    maxAlpha: number;
    color: string;
    pulseSpeed: number;
    pulseVal: number;
    layer: number; // 0 = ambient dust, 1 = mid star, 2 = soft beacon
    wobbleSpeed: number;
    wobbleVal: number;
}

interface Shockwave {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    alpha: number;
    strength: number;
}

interface InteractiveParticleSimulationProps {
    count?: number;
    interactive?: boolean;
    showConnections?: boolean;
    showTriangles?: boolean;
    showCornerWebs?: boolean;
    burstOnLoad?: boolean;
    fullScreen?: boolean;
    className?: string;
    speedMultiplier?: number;
    connectionDistance?: number;
}

export function InteractiveParticleSimulation({
    count = 85,
    interactive = true,
    showConnections = true,
    showTriangles = false,
    showCornerWebs = false,
    burstOnLoad = false,
    fullScreen = true,
    className = "fixed inset-0 w-full h-full pointer-events-none z-0",
    speedMultiplier = 0.7,
    connectionDistance = 120
}: InteractiveParticleSimulationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const prefersReduced = useReducedMotion();
    const lowPower = useIsLowPower();

    const mouseRef = useRef<{
        x: number;
        y: number;
        active: boolean;
        radius: number;
        lastX: number;
        lastY: number;
        vx: number;
        vy: number;
    }>({
        x: -9999,
        y: -9999,
        active: false,
        radius: 140,
        lastX: -9999,
        lastY: -9999,
        vx: 0,
        vy: 0
    });

    const shockwavesRef = useRef<Shockwave[]>([]);
    const isDarkModeRef = useRef(true);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const checkTheme = () => {
            isDarkModeRef.current = document.documentElement.classList.contains("dark") || 
                                    !document.documentElement.classList.contains("light");
        };
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    const initSimulation = useCallback(() => {
        if (prefersReduced || lowPower) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = fullScreen ? window.innerWidth : (canvas.offsetWidth || window.innerWidth);
        let height = fullScreen ? window.innerHeight : (canvas.offsetHeight || window.innerHeight);

        const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        // Adjust particle density for mobile devices
        const isMobile = width < 768;
        const actualCount = isMobile ? Math.floor(count * 0.5) : count;

        // Elegant, muted starlight palette — high readability, non-intrusive
        const colorsDark = [
            "rgba(255, 255, 255, 0.45)",   // Soft Starlight White
            "rgba(148, 163, 184, 0.35)",   // Muted Slate Star
            "rgba(203, 213, 225, 0.30)",   // Subtle Silver
            "rgba(110, 231, 183, 0.25)",   // Whispering Mint Tint
            "rgba(147, 197, 253, 0.25)"    // Whispering Azure Tint
        ];

        const colorsLight = [
            "rgba(100, 116, 139, 0.25)",   // Muted Slate
            "rgba(148, 163, 184, 0.20)",   // Subtle Slate Dust
            "rgba(16, 185, 129, 0.20)",    // Soft Emerald Accent
            "rgba(37, 99, 235, 0.18)"      // Soft Academic Blue Accent
        ];

        const particles: Particle[] = [];

        // Particles are evenly distributed across the entire screen — NO clumping in the center
        for (let i = 0; i < actualCount; i++) {
            const layer = Math.random() < 0.2 ? 2 : Math.random() < 0.6 ? 1 : 0;
            const baseRadius = layer === 2 
                ? (1.5 + Math.random() * 0.8) 
                : layer === 1 
                ? (1.0 + Math.random() * 0.5) 
                : (0.6 + Math.random() * 0.4);

            // Muted, gentle opacity for zero text interference
            const maxAlpha = layer === 2 
                ? (0.28 + Math.random() * 0.08) 
                : layer === 1 
                ? (0.18 + Math.random() * 0.08) 
                : (0.08 + Math.random() * 0.06);

            // Uniform screen distribution across width and height
            const startX = Math.random() * width;
            const startY = Math.random() * height;
            
            // Calm, ambient floating drift
            const baseVx = (Math.random() - 0.5) * 0.22 * speedMultiplier;
            const baseVy = (-0.12 - Math.random() * 0.20) * speedMultiplier;

            particles.push({
                x: startX,
                y: startY,
                vx: baseVx,
                vy: baseVy,
                baseVx,
                baseVy,
                radius: baseRadius,
                baseRadius,
                alpha: maxAlpha * (0.6 + Math.random() * 0.4),
                maxAlpha,
                color: colorsDark[Math.floor(Math.random() * colorsDark.length)],
                pulseSpeed: 0.01 + Math.random() * 0.02,
                pulseVal: Math.random() * Math.PI * 2,
                layer,
                wobbleSpeed: 0.008 + Math.random() * 0.015,
                wobbleVal: Math.random() * Math.PI * 2
            });
        }

        let animationFrameId: number;
        let lastTimestamp = performance.now();

        const render = (now: number) => {
            const dt = Math.min((now - lastTimestamp) / 1000, 0.08);
            lastTimestamp = now;

            ctx.clearRect(0, 0, width, height);

            const isDark = isDarkModeRef.current;
            const colorPalette = isDark ? colorsDark : colorsLight;
            const mouse = mouseRef.current;

            // 1. Process & Render Shockwaves (Subtle ripples)
            const shockwaves = shockwavesRef.current;
            for (let sIdx = shockwaves.length - 1; sIdx >= 0; sIdx--) {
                const sw = shockwaves[sIdx];
                sw.radius += (sw.maxRadius - sw.radius) * 0.06;
                sw.alpha *= 0.94;

                if (sw.alpha > 0.01) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = isDark
                        ? `rgba(255, 255, 255, ${sw.alpha * 0.15})`
                        : `rgba(100, 116, 139, ${sw.alpha * 0.12})`;
                    ctx.lineWidth = 1.0;
                    ctx.stroke();
                    ctx.restore();
                } else {
                    shockwaves.splice(sIdx, 1);
                }
            }

            const maxDistSq = connectionDistance * connectionDistance;

            // 2. Draw Subtle Filament Connections between nearby particles
            if (showConnections) {
                for (let i = 0; i < particles.length; i++) {
                    const p1 = particles[i];
                    if (p1.layer === 0) continue; // Skip ambient dust

                    for (let j = i + 1; j < particles.length; j++) {
                        const p2 = particles[j];
                        if (p2.layer === 0) continue;

                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < maxDistSq) {
                            const dist = Math.sqrt(distSq);
                            const proximityFactor = 1 - dist / connectionDistance;
                            
                            const lineAlpha = proximityFactor * (isDark ? 0.07 : 0.05) * Math.min(p1.alpha, p2.alpha);

                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.strokeStyle = isDark 
                                ? `rgba(255, 255, 255, ${lineAlpha})` 
                                : `rgba(100, 116, 139, ${lineAlpha})`;
                            ctx.lineWidth = 0.6;
                            ctx.stroke();
                        }
                    }

                    // Gentle interactive filament to mouse cursor
                    if (interactive && mouse.active) {
                        const mdx = mouse.x - p1.x;
                        const mdy = mouse.y - p1.y;
                        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

                        if (mDist < mouse.radius && mDist > 0) {
                            const mouseProximity = 1 - mDist / mouse.radius;
                            const stringAlpha = mouseProximity * (isDark ? 0.12 : 0.08) * p1.alpha;

                            ctx.beginPath();
                            ctx.moveTo(mouse.x, mouse.y);
                            ctx.lineTo(p1.x, p1.y);
                            ctx.strokeStyle = isDark 
                                ? `rgba(255, 255, 255, ${stringAlpha})` 
                                : `rgba(100, 116, 139, ${stringAlpha})`;
                            ctx.lineWidth = 0.6;
                            ctx.stroke();
                        }
                    }
                }
            }

            // 3. Update & Draw Subtle Starlight Floating Particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Gentle pulsation
                p.pulseVal += p.pulseSpeed;
                p.wobbleVal += p.wobbleSpeed;
                const pulse = Math.sin(p.pulseVal);
                const wobble = Math.sin(p.wobbleVal);
                
                p.radius = p.baseRadius + pulse * 0.2;

                // Natural floating drift with gentle wave
                p.vx += (p.baseVx + wobble * 0.08 - p.vx) * 0.03;
                p.vy += (p.baseVy - p.vy) * 0.03;

                // Subtle Mouse Repulsion
                if (interactive && mouse.active) {
                    const mdx = mouse.x - p.x;
                    const mdy = mouse.y - p.y;
                    const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

                    if (mDist < mouse.radius && mDist > 0) {
                        const force = (1 - mDist / mouse.radius);
                        const angle = Math.atan2(mdy, mdx);
                        const pushStrength = force * 2.0;
                        p.x -= Math.cos(angle) * pushStrength;
                        p.y -= Math.sin(angle) * pushStrength;
                    }
                }

                // Apply velocity
                p.x += p.vx * dt * 60;
                p.y += p.vy * dt * 60;

                // Seamless Screen Boundary Wrap
                if (p.x < -10) p.x = width + 10;
                if (p.x > width + 10) p.x = -10;
                if (p.y < -10) {
                    p.y = height + 10;
                    p.x = Math.random() * width;
                }
                if (p.y > height + 10) p.y = -10;

                // Draw Particle Core
                const activeColor = colorPalette[i % colorPalette.length];
                
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = activeColor;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.6, p.radius), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        const handleResize = () => {
            if (!canvas) return;
            width = fullScreen ? window.innerWidth : (canvas.offsetWidth || window.innerWidth);
            height = fullScreen ? window.innerHeight : (canvas.offsetHeight || window.innerHeight);
            const curDpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
            canvas.width = Math.floor(width * curDpr);
            canvas.height = Math.floor(height * curDpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(curDpr, curDpr);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const m = mouseRef.current;
            const currentX = e.clientX;
            const currentY = e.clientY;

            if (m.lastX !== -9999) {
                m.vx = currentX - m.lastX;
                m.vy = currentY - m.lastY;
            }

            m.x = currentX;
            m.y = currentY;
            m.lastX = currentX;
            m.lastY = currentY;
            m.active = true;
        };

        const handleMouseLeave = () => {
            mouseRef.current.active = false;
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (shockwavesRef.current.length < 3) {
                shockwavesRef.current.push({
                    x: e.clientX,
                    y: e.clientY,
                    radius: 8,
                    maxRadius: 120,
                    alpha: 0.6,
                    strength: 1.2
                });
            }
        };

        window.addEventListener("resize", handleResize, { passive: true });
        if (interactive) {
            window.addEventListener("mousemove", handleMouseMove, { passive: true });
            document.addEventListener("mouseleave", handleMouseLeave);
            window.addEventListener("mousedown", handleMouseDown, { passive: true });
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);
            if (interactive) {
                window.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseleave", handleMouseLeave);
                window.removeEventListener("mousedown", handleMouseDown);
            }
        };
    }, [count, interactive, showConnections, showTriangles, showCornerWebs, burstOnLoad, fullScreen, speedMultiplier, connectionDistance, prefersReduced, lowPower]);

    useEffect(() => {
        const cleanup = initSimulation();
        return () => {
            if (cleanup) cleanup();
        };
    }, [initSimulation]);

    if (prefersReduced || lowPower) return null;

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ willChange: "transform", touchAction: "none" }}
        />
    );
}

export default InteractiveParticleSimulation;
