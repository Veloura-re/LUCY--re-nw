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
    layer: number;
    wobbleSpeed: number;
    wobbleVal: number;
    side: "left" | "right";
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
    count = 48,
    interactive = true,
    showConnections = true,
    showTriangles = false,
    showCornerWebs = true,
    burstOnLoad = false,
    fullScreen = true,
    className = "fixed inset-0 w-full h-full pointer-events-none z-0 hidden lg:block",
    speedMultiplier = 0.55,
    connectionDistance = 110
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

        // Strictly PC / Desktop only (Screen width >= 1024px)
        if (width < 1024) {
            ctx.clearRect(0, 0, width, height);
            return;
        }

        const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        // Richer, luminous green and emerald tones with starlight accents
        const colorsDark = [
            "rgba(52, 211, 153, 0.75)",   // Vibrant Emerald Mint
            "rgba(16, 185, 129, 0.80)",   // Core Lucy Emerald
            "rgba(110, 231, 183, 0.65)",  // Soft Light Mint
            "rgba(5, 150, 105, 0.70)",    // Deep Emerald Green
            "rgba(167, 243, 208, 0.60)",  // Dewdrop Jade
            "rgba(255, 255, 255, 0.50)"   // Starlight Highlight
        ];

        const colorsLight = [
            "rgba(16, 185, 129, 0.75)",   // Core Lucy Emerald
            "rgba(5, 150, 105, 0.70)",    // Deep Forest Green
            "rgba(52, 211, 153, 0.60)",   // Emerald Mint
            "rgba(167, 243, 208, 0.50)"   // Soft Mint
        ];

        // Refined side margin for desktop (outer 16% on left and right)
        const sideMargin = Math.min(220, width * 0.16);
        const particles: Particle[] = [];

        for (let i = 0; i < count; i++) {
            const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
            const layer = Math.random() < 0.3 ? 2 : 1;
            const baseRadius = layer === 2 ? 1.5 + Math.random() * 0.6 : 0.8 + Math.random() * 0.5;
            const maxAlpha = layer === 2 ? 0.55 + Math.random() * 0.20 : 0.30 + Math.random() * 0.15;

            const startX = side === "left" 
                ? Math.random() * sideMargin 
                : (width - sideMargin) + Math.random() * sideMargin;
            const startY = Math.random() * height;

            const baseVx = (side === "left" ? (Math.random() * 0.14 - 0.05) : (Math.random() * -0.14 + 0.05)) * speedMultiplier;
            const baseVy = (-0.12 - Math.random() * 0.18) * speedMultiplier;

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
                pulseSpeed: 0.012 + Math.random() * 0.02,
                pulseVal: Math.random() * Math.PI * 2,
                layer,
                wobbleSpeed: 0.009 + Math.random() * 0.014,
                wobbleVal: Math.random() * Math.PI * 2,
                side
            });
        }

        let animationFrameId: number;
        let lastTimestamp = performance.now();

        // ─── Subtle Green-Tinted Micro Corner Web Drawing ───────────────────
        const drawMicroWeb = (
            originX: number, 
            originY: number, 
            maxRadius: number, 
            startAngle: number, 
            endAngle: number, 
            isDark: boolean, 
            now: number
        ) => {
            const spokesCount = 4;
            const ringsCount = 3;
            const spokeAngles: number[] = [];
            const mouse = mouseRef.current;

            let webVibration = 0;
            if (mouse.active) {
                const mdx = mouse.x - originX;
                const mdy = mouse.y - originY;
                const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mDist < maxRadius + 45) {
                    webVibration = (1 - mDist / (maxRadius + 45)) * 4.5;
                }
            }

            // Radial Spokes (Green Tinted Silk)
            for (let s = 0; s <= spokesCount; s++) {
                const angle = startAngle + (s / spokesCount) * (endAngle - startAngle);
                spokeAngles.push(angle);
                const endX = originX + Math.cos(angle) * maxRadius;
                const endY = originY + Math.sin(angle) * maxRadius;

                ctx.beginPath();
                ctx.moveTo(originX, originY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = isDark
                    ? "rgba(52, 211, 153, 0.22)"
                    : "rgba(16, 185, 129, 0.25)";
                ctx.lineWidth = 0.65;
                ctx.stroke();
            }

            // Concentric Green Silk Arcs
            for (let r = 1; r <= ringsCount; r++) {
                const ringDist = (r / ringsCount) * maxRadius;
                for (let s = 0; s < spokesCount; s++) {
                    const a1 = spokeAngles[s];
                    const a2 = spokeAngles[s + 1];

                    const p1x = originX + Math.cos(a1) * ringDist;
                    const p1y = originY + Math.sin(a1) * ringDist;
                    const p2x = originX + Math.cos(a2) * ringDist;
                    const p2y = originY + Math.sin(a2) * ringDist;

                    const midA = (a1 + a2) / 2;
                    const sagRadius = ringDist * 0.90 + Math.sin(now * 0.0025 + r) * (1.2 + webVibration);
                    const midX = originX + Math.cos(midA) * sagRadius;
                    const midY = originY + Math.sin(midA) * sagRadius;

                    ctx.beginPath();
                    ctx.moveTo(p1x, p1y);
                    ctx.quadraticCurveTo(midX, midY, p2x, p2y);
                    ctx.strokeStyle = isDark
                        ? `rgba(52, 211, 153, ${0.14 + (r / ringsCount) * 0.14})`
                        : `rgba(16, 185, 129, ${0.15 + (r / ringsCount) * 0.16})`;
                    ctx.lineWidth = 0.60;
                    ctx.stroke();

                    // Pinpoint emerald dewdrop on outer vertex
                    if (r === ringsCount) {
                        ctx.beginPath();
                        ctx.arc(p1x, p1y, 1.1, 0, Math.PI * 2);
                        ctx.fillStyle = isDark ? "rgba(167, 243, 208, 0.75)" : "rgba(16, 185, 129, 0.75)";
                        ctx.fill();
                    }
                }
            }
        };

        const render = (now: number) => {
            if (width < 1024) return;
            const dt = Math.min((now - lastTimestamp) / 1000, 0.08);
            lastTimestamp = now;

            ctx.clearRect(0, 0, width, height);

            const isDark = isDarkModeRef.current;
            const colorPalette = isDark ? colorsDark : colorsLight;
            const mouse = mouseRef.current;

            // ─── 1. Minimal Green-Tinted Micro Corner Webs (Tiny: 85px) ──────
            if (showCornerWebs) {
                const microSize = Math.min(90, sideMargin * 0.75);
                drawMicroWeb(0, 0, microSize, 0, Math.PI / 2, isDark, now); // Top-Left
                drawMicroWeb(width, 0, microSize, Math.PI / 2, Math.PI, isDark, now); // Top-Right
                drawMicroWeb(0, height, microSize, -Math.PI / 2, 0, isDark, now); // Bottom-Left
                drawMicroWeb(width, height, microSize, Math.PI, (3 * Math.PI) / 2, isDark, now); // Bottom-Right
            }

            // ─── 2. Subtle Emerald Shockwaves ─────────────────────────────────
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
                        ? `rgba(52, 211, 153, ${sw.alpha * 0.25})`
                        : `rgba(16, 185, 129, ${sw.alpha * 0.20})`;
                    ctx.lineWidth = 0.9;
                    ctx.stroke();
                    ctx.restore();
                } else {
                    shockwaves.splice(sIdx, 1);
                }
            }

            const maxDistSq = connectionDistance * connectionDistance;

            // ─── 3. Luminous Emerald Filament Connections on Side Margins ─────
            if (showConnections) {
                for (let i = 0; i < particles.length; i++) {
                    const p1 = particles[i];
                    for (let j = i + 1; j < particles.length; j++) {
                        const p2 = particles[j];
                        if (p1.side !== p2.side) continue;

                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < maxDistSq) {
                            const dist = Math.sqrt(distSq);
                            const proximityFactor = 1 - dist / connectionDistance;
                            const lineAlpha = proximityFactor * (isDark ? 0.18 : 0.14) * Math.min(p1.alpha, p2.alpha);

                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.strokeStyle = isDark 
                                ? `rgba(52, 211, 153, ${lineAlpha})` 
                                : `rgba(16, 185, 129, ${lineAlpha})`;
                            ctx.lineWidth = 0.6;
                            ctx.stroke();
                        }
                    }

                    // Interactive green string to mouse when hovering nearby in side margin
                    if (interactive && mouse.active) {
                        const mdx = mouse.x - p1.x;
                        const mdy = mouse.y - p1.y;
                        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

                        if (mDist < mouse.radius && mDist > 0) {
                            const mouseProximity = 1 - mDist / mouse.radius;
                            const stringAlpha = mouseProximity * (isDark ? 0.28 : 0.20) * p1.alpha;

                            ctx.beginPath();
                            ctx.moveTo(mouse.x, mouse.y);
                            ctx.lineTo(p1.x, p1.y);
                            ctx.strokeStyle = isDark 
                                ? `rgba(52, 211, 153, ${stringAlpha})` 
                                : `rgba(16, 185, 129, ${stringAlpha})`;
                            ctx.lineWidth = 0.65;
                            ctx.stroke();
                        }
                    }
                }
            }

            // ─── 4. Update & Draw Emerald Particles in Side Margins ───────────
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                p.pulseVal += p.pulseSpeed;
                p.wobbleVal += p.wobbleSpeed;
                const pulse = Math.sin(p.pulseVal);
                const wobble = Math.sin(p.wobbleVal);
                
                p.radius = p.baseRadius + pulse * 0.2;

                p.vx += (p.baseVx + wobble * 0.04 - p.vx) * 0.02;
                p.vy += (p.baseVy - p.vy) * 0.02;

                if (interactive && mouse.active) {
                    const mdx = mouse.x - p.x;
                    const mdy = mouse.y - p.y;
                    const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

                    if (mDist < mouse.radius && mDist > 0) {
                        const force = (1 - mDist / mouse.radius);
                        const angle = Math.atan2(mdy, mdx);
                        const pushStrength = force * 2.2;
                        p.x -= Math.cos(angle) * pushStrength;
                        p.y -= Math.sin(angle) * pushStrength;
                    }
                }

                p.x += p.vx * dt * 60;
                p.y += p.vy * dt * 60;

                // Keep strictly bounded inside flank side margins
                if (p.side === "left") {
                    if (p.x < -5) p.x = 0;
                    if (p.x > sideMargin) {
                        p.vx = -Math.abs(p.vx);
                        p.x = sideMargin;
                    }
                } else {
                    if (p.x > width + 5) p.x = width;
                    if (p.x < width - sideMargin) {
                        p.vx = Math.abs(p.vx);
                        p.x = width - sideMargin;
                    }
                }

                // Vertical seamless wrap
                if (p.y < -10) {
                    p.y = height + 10;
                    p.x = p.side === "left" 
                        ? Math.random() * sideMargin 
                        : (width - sideMargin) + Math.random() * sideMargin;
                }
                if (p.y > height + 10) p.y = -10;

                const activeColor = colorPalette[i % colorPalette.length];
                ctx.save();
                ctx.globalAlpha = p.alpha;

                // Subtle emerald corona glow on larger particles
                if (p.layer === 2 && isDark) {
                    const haloRadius = p.radius * 2.8;
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloRadius);
                    grad.addColorStop(0, "rgba(52, 211, 153, 0.40)");
                    grad.addColorStop(1, "rgba(52, 211, 153, 0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, haloRadius, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.fillStyle = activeColor;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.7, p.radius), 0, Math.PI * 2);
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
            if (width < 1024) {
                const c = canvas.getContext("2d");
                if (c) c.clearRect(0, 0, width, height);
                return;
            }
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
            if (shockwavesRef.current.length < 2) {
                shockwavesRef.current.push({
                    x: e.clientX,
                    y: e.clientY,
                    radius: 5,
                    maxRadius: 90,
                    alpha: 0.5,
                    strength: 1.0
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
    }, [count, interactive, showConnections, showCornerWebs, fullScreen, speedMultiplier, connectionDistance, prefersReduced, lowPower]);

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
