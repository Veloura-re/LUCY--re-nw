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
    layer: number; // 0 = ambient dust, 1 = mid dewdrop, 2 = glowing hero hub
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
    count = 140,
    interactive = true,
    showConnections = true,
    showTriangles = true,
    showCornerWebs = true,
    burstOnLoad = true,
    fullScreen = true,
    className = "fixed inset-0 w-full h-full pointer-events-none z-0",
    speedMultiplier = 1,
    connectionDistance = 150
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
        radius: 190,
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

        let width = fullScreen ? window.innerWidth : canvas.offsetWidth;
        let height = fullScreen ? window.innerHeight : canvas.offsetHeight;

        const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // Adjust particle density for mobile devices vs high-res screens
        const isMobile = width < 768;
        const actualCount = isMobile ? Math.floor(count * 0.55) : count;

        const colorsDark = [
            "#3BD68D", // Lucy Vibrant Brand Emerald
            "#10B981", // Emerald 500
            "#34D399", // Emerald Light
            "#06B6D4", // Quantum Cyan
            "#A7F3D0", // Starlight Mint
            "#FFFFFF"  // Pure Dewdrop White
        ];

        const colorsLight = [
            "#059669", // Deep Emerald
            "#10B981", // Emerald 500
            "#0D9488", // Quantum Teal
            "#047857", // Forest Core
            "#2563EB"  // Academic Blue
        ];

        const particles: Particle[] = [];

        for (let i = 0; i < actualCount; i++) {
            const layer = Math.random() < 0.25 ? 2 : Math.random() < 0.6 ? 1 : 0;
            const baseRadius = layer === 2 
                ? (2.2 + Math.random() * 1.6) 
                : layer === 1 
                ? (1.3 + Math.random() * 1.0) 
                : (0.7 + Math.random() * 0.7);

            const maxAlpha = layer === 2 
                ? (0.9 + Math.random() * 0.1) 
                : layer === 1 
                ? (0.65 + Math.random() * 0.25) 
                : (0.35 + Math.random() * 0.2);

            let startX = Math.random() * width;
            let startY = Math.random() * height;
            
            // Antigravity upward drift with subtle horizontal wave
            let baseVx = (Math.random() - 0.5) * 0.38 * speedMultiplier;
            let baseVy = (-0.22 - Math.random() * 0.48) * speedMultiplier;

            let vx = baseVx;
            let vy = baseVy;

            if (burstOnLoad) {
                // Opening big-bang genesis burst expanding smoothly from viewport center
                const cx = width / 2;
                const cy = height / 2;
                const angle = Math.random() * Math.PI * 2;
                const speed = (2.5 + Math.random() * 6.0) * speedMultiplier;
                startX = cx + Math.cos(angle) * (Math.random() * 60);
                startY = cy + Math.sin(angle) * (Math.random() * 60);
                vx = Math.cos(angle) * speed;
                vy = Math.sin(angle) * speed;
            }

            particles.push({
                x: startX,
                y: startY,
                vx,
                vy,
                baseVx,
                baseVy,
                radius: baseRadius,
                baseRadius,
                alpha: burstOnLoad ? 0.05 : maxAlpha * (0.5 + Math.random() * 0.5),
                maxAlpha,
                color: colorsDark[Math.floor(Math.random() * colorsDark.length)],
                pulseSpeed: 0.015 + Math.random() * 0.035,
                pulseVal: Math.random() * Math.PI * 2,
                layer,
                wobbleSpeed: 0.01 + Math.random() * 0.02,
                wobbleVal: Math.random() * Math.PI * 2
            });
        }

        let animationFrameId: number;
        let lastTimestamp = performance.now();
        let burstDecay = burstOnLoad ? 0.965 : 1;

        // Function to draw corner spider web nests
        const drawCornerWeb = (originX: number, originY: number, maxRadius: number, startAngle: number, endAngle: number, isDark: boolean, now: number) => {
            const spokes = 6;
            const rings = 5;
            const spokeAngles: number[] = [];

            // Mouse proximity vibration for corner webs
            let webVibration = 0;
            const mouse = mouseRef.current;
            if (mouse.active) {
                const mdx = mouse.x - originX;
                const mdy = mouse.y - originY;
                const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mDist < maxRadius + 50) {
                    webVibration = (1 - mDist / (maxRadius + 50)) * 6;
                }
            }

            // Draw radial anchor spokes
            for (let s = 0; s <= spokes; s++) {
                const angle = startAngle + (s / spokes) * (endAngle - startAngle);
                spokeAngles.push(angle);
                const endX = originX + Math.cos(angle) * maxRadius;
                const endY = originY + Math.sin(angle) * maxRadius;

                ctx.beginPath();
                ctx.moveTo(originX, originY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = isDark
                    ? "rgba(59, 214, 141, 0.18)"
                    : "rgba(16, 185, 129, 0.22)";
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }

            // Draw concentric curved silk spiral arcs between spokes
            for (let r = 1; r <= rings; r++) {
                const ringDist = (r / rings) * maxRadius;
                for (let s = 0; s < spokes; s++) {
                    const a1 = spokeAngles[s];
                    const a2 = spokeAngles[s + 1];

                    const p1x = originX + Math.cos(a1) * ringDist;
                    const p1y = originY + Math.sin(a1) * ringDist;
                    const p2x = originX + Math.cos(a2) * ringDist;
                    const p2y = originY + Math.sin(a2) * ringDist;

                    // Inward catenary curve sag for organic spider web look
                    const midA = (a1 + a2) / 2;
                    const sagRadius = ringDist * 0.88 + Math.sin(now * 0.003 + r) * webVibration;
                    const midX = originX + Math.cos(midA) * sagRadius;
                    const midY = originY + Math.sin(midA) * sagRadius;

                    ctx.beginPath();
                    ctx.moveTo(p1x, p1y);
                    ctx.quadraticCurveTo(midX, midY, p2x, p2y);
                    ctx.strokeStyle = isDark
                        ? `rgba(59, 214, 141, ${0.12 + (r / rings) * 0.15})`
                        : `rgba(16, 185, 129, ${0.15 + (r / rings) * 0.18})`;
                    ctx.lineWidth = 0.75;
                    ctx.stroke();

                    // Micro dewdrop on vertex
                    if (r % 2 === 0) {
                        ctx.beginPath();
                        ctx.arc(p1x, p1y, 1.2, 0, Math.PI * 2);
                        ctx.fillStyle = isDark ? "rgba(167, 243, 208, 0.6)" : "rgba(5, 150, 105, 0.6)";
                        ctx.fill();
                    }
                }
            }
        };

        const render = (now: number) => {
            const dt = Math.min((now - lastTimestamp) / 1000, 0.08);
            lastTimestamp = now;

            ctx.clearRect(0, 0, width, height);

            const isDark = isDarkModeRef.current;
            const colorPalette = isDark ? colorsDark : colorsLight;
            const mouse = mouseRef.current;

            // 1. Draw Corner Spider Web Nests
            if (showCornerWebs) {
                const cornerSize = Math.min(220, Math.min(width, height) * 0.35);
                drawCornerWeb(0, 0, cornerSize, 0, Math.PI / 2, isDark, now); // Top-Left
                drawCornerWeb(width, 0, cornerSize, Math.PI / 2, Math.PI, isDark, now); // Top-Right
                drawCornerWeb(0, height, cornerSize, -Math.PI / 2, 0, isDark, now); // Bottom-Left
                drawCornerWeb(width, height, cornerSize, Math.PI, (3 * Math.PI) / 2, isDark, now); // Bottom-Right
            }

            // 2. Process & Render Shockwaves (Click / Tap quantum waves)
            const shockwaves = shockwavesRef.current;
            for (let sIdx = shockwaves.length - 1; sIdx >= 0; sIdx--) {
                const sw = shockwaves[sIdx];
                sw.radius += (sw.maxRadius - sw.radius) * 0.08;
                sw.alpha *= 0.94;

                if (sw.alpha > 0.02) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = isDark
                        ? `rgba(59, 214, 141, ${sw.alpha * 0.5})`
                        : `rgba(16, 185, 129, ${sw.alpha * 0.45})`;
                    ctx.lineWidth = 2.0;
                    ctx.stroke();
                    ctx.restore();
                } else {
                    shockwaves.splice(sIdx, 1);
                }
            }

            const maxDistSq = connectionDistance * connectionDistance;
            const triangleMaxDistSq = (connectionDistance * 0.85) * (connectionDistance * 0.85);

            // 3. Draw Triangular Geometric Facets (Spider Web Polygon Mesh)
            if (showTriangles) {
                for (let i = 0; i < particles.length; i++) {
                    const p1 = particles[i];
                    for (let j = i + 1; j < particles.length; j++) {
                        const p2 = particles[j];
                        const d12Sq = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
                        if (d12Sq > triangleMaxDistSq) continue;

                        for (let k = j + 1; k < particles.length; k++) {
                            const p3 = particles[k];
                            const d13Sq = (p1.x - p3.x) ** 2 + (p1.y - p3.y) ** 2;
                            if (d13Sq > triangleMaxDistSq) continue;

                            const d23Sq = (p2.x - p3.x) ** 2 + (p2.y - p3.y) ** 2;
                            if (d23Sq > triangleMaxDistSq) continue;

                            // Calculate triangle opacity based on compactness
                            const avgDist = (Math.sqrt(d12Sq) + Math.sqrt(d13Sq) + Math.sqrt(d23Sq)) / 3;
                            const triangleFactor = 1 - avgDist / (connectionDistance * 0.85);
                            const triAlpha = triangleFactor * (isDark ? 0.055 : 0.04) * Math.min(p1.alpha, p2.alpha, p3.alpha);

                            if (triAlpha > 0.005) {
                                ctx.save();
                                ctx.beginPath();
                                ctx.moveTo(p1.x, p1.y);
                                ctx.lineTo(p2.x, p2.y);
                                ctx.lineTo(p3.x, p3.y);
                                ctx.closePath();
                                ctx.fillStyle = isDark
                                    ? `rgba(59, 214, 141, ${triAlpha})`
                                    : `rgba(16, 185, 129, ${triAlpha * 1.3})`;
                                ctx.fill();
                                ctx.restore();
                            }
                        }
                    }
                }
            }

            // 4. Draw Curved Catenary Spider Silk Strands with Vibration
            if (showConnections) {
                for (let i = 0; i < particles.length; i++) {
                    const p1 = particles[i];
                    for (let j = i + 1; j < particles.length; j++) {
                        const p2 = particles[j];

                        // Skip connection if both are subtle background dust
                        if (p1.layer === 0 && p2.layer === 0) continue;

                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < maxDistSq) {
                            const dist = Math.sqrt(distSq);
                            const proximityFactor = 1 - dist / connectionDistance;
                            
                            // Midpoint with catenary silk sag & interactive pluck vibration
                            const midX = (p1.x + p2.x) / 2;
                            const midY = (p1.y + p2.y) / 2 + proximityFactor * 6; // Natural silk sag

                            let pluckX = 0;
                            let pluckY = 0;
                            let mouseBoost = 1;

                            if (mouse.active) {
                                const mdx = mouse.x - midX;
                                const mdy = mouse.y - midY;
                                const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                                if (mDist < mouse.radius) {
                                    mouseBoost = 1 + (1 - mDist / mouse.radius) * 2.5;
                                    // Pluck silk strand outward
                                    const pluckForce = (1 - mDist / mouse.radius) * 14;
                                    pluckX = (mdx / (mDist || 1)) * pluckForce;
                                    pluckY = (mdy / (mDist || 1)) * pluckForce;
                                }
                            }

                            const lineAlpha = proximityFactor * (isDark ? 0.32 : 0.22) * Math.min(p1.alpha, p2.alpha) * mouseBoost;

                            // Draw Curved Silk Filament
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.quadraticCurveTo(midX + pluckX, midY + pluckY, p2.x, p2.y);
                            ctx.strokeStyle = isDark 
                                ? `rgba(59, 214, 141, ${Math.min(0.8, lineAlpha)})` 
                                : `rgba(16, 185, 129, ${Math.min(0.7, lineAlpha * 1.3)})`;
                            ctx.lineWidth = proximityFactor * (isDark ? 1.0 : 1.2) * (mouseBoost > 1 ? 1.3 : 1);
                            ctx.stroke();
                        }
                    }

                    // Interactive Laser Silk String from Mouse to Nearby Nodes
                    if (interactive && mouse.active) {
                        const mdx = mouse.x - p1.x;
                        const mdy = mouse.y - p1.y;
                        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

                        if (mDist < mouse.radius && mDist > 0) {
                            const mouseProximity = 1 - mDist / mouse.radius;
                            const stringAlpha = mouseProximity * (isDark ? 0.45 : 0.35) * p1.alpha;

                            const curveMidX = (mouse.x + p1.x) / 2;
                            const curveMidY = (mouse.y + p1.y) / 2 + mouseProximity * 8;

                            ctx.beginPath();
                            ctx.moveTo(mouse.x, mouse.y);
                            ctx.quadraticCurveTo(curveMidX, curveMidY, p1.x, p1.y);
                            ctx.strokeStyle = isDark 
                                ? `rgba(6, 182, 212, ${stringAlpha})` 
                                : `rgba(13, 148, 136, ${stringAlpha * 1.2})`;
                            ctx.lineWidth = mouseProximity * 1.4;
                            ctx.stroke();
                        }
                    }
                }
            }

            // 5. Update & Draw Dewdrop Quantum Nodes with Antigravity Physics
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Pulse alpha & radius
                p.pulseVal += p.pulseSpeed;
                p.wobbleVal += p.wobbleSpeed;
                const pulse = Math.sin(p.pulseVal);
                const wobble = Math.sin(p.wobbleVal);
                
                p.radius = p.baseRadius + pulse * 0.4;

                // Gradually ramp up alpha from burst start
                if (p.alpha < p.maxAlpha) {
                    p.alpha = Math.min(p.maxAlpha, p.alpha + 0.025);
                }

                // Initial Big Bang burst deceleration towards ambient antigravity drift
                if (burstOnLoad && burstDecay > 0.05) {
                    p.vx *= burstDecay;
                    p.vy *= burstDecay;
                    if (Math.abs(p.vx) < 0.6 && Math.abs(p.vy) < 0.6) {
                        p.vx = p.baseVx;
                        p.vy = p.baseVy;
                    }
                } else {
                    // Natural antigravity floating velocity + harmonic wobble
                    p.vx += (p.baseVx + wobble * 0.15 - p.vx) * 0.05;
                    p.vy += (p.baseVy - p.vy) * 0.05;
                }

                // Interactive Mouse Physics (Repulsion aura & Velocity impulse)
                if (interactive && mouse.active) {
                    const mdx = mouse.x - p.x;
                    const mdy = mouse.y - p.y;
                    const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

                    if (mDist < mouse.radius && mDist > 0) {
                        const force = (1 - mDist / mouse.radius);
                        const angle = Math.atan2(mdy, mdx);
                        const pushStrength = force * 4.5;
                        p.x -= Math.cos(angle) * pushStrength;
                        p.y -= Math.sin(angle) * pushStrength;

                        // Impart subtle cursor drag inertia
                        p.vx += mouse.vx * 0.04 * force;
                        p.vy += mouse.vy * 0.04 * force;
                    }
                }

                // Shockwave interaction
                for (let sIdx = 0; sIdx < shockwaves.length; sIdx++) {
                    const sw = shockwaves[sIdx];
                    const sdx = p.x - sw.x;
                    const sdy = p.y - sw.y;
                    const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
                    const ringDelta = Math.abs(sDist - sw.radius);
                    if (ringDelta < 40 && sDist > 0) {
                        const swForce = (1 - ringDelta / 40) * sw.strength * (sw.alpha);
                        const angle = Math.atan2(sdy, sdx);
                        p.x += Math.cos(angle) * swForce * 6;
                        p.y += Math.sin(angle) * swForce * 6;
                    }
                }

                // Apply velocity
                p.x += p.vx * dt * 60;
                p.y += p.vy * dt * 60;

                // Screen Boundary Wrap (Infinite Seamless Antigravity Drift)
                if (p.x < -20) p.x = width + 20;
                if (p.x > width + 20) p.x = -20;
                if (p.y < -20) {
                    p.y = height + 20;
                    p.x = Math.random() * width;
                }
                if (p.y > height + 20) p.y = -20;

                // Draw Dewdrop Core & Glowing Corona
                const activeColor = colorPalette[i % colorPalette.length];
                
                ctx.save();
                ctx.globalAlpha = p.alpha;

                // Foreground & Mid-layer nodes render luminous radial halos in dark mode
                if (p.layer >= 1 && isDark) {
                    const haloRadius = p.radius * (p.layer === 2 ? 4.5 : 2.5);
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloRadius);
                    grad.addColorStop(0, "rgba(59, 214, 141, 0.85)");
                    grad.addColorStop(0.4, "rgba(59, 214, 141, 0.25)");
                    grad.addColorStop(1, "rgba(59, 214, 141, 0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, haloRadius, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.layer === 2 && !isDark) {
                    // Soft light-mode halo
                    const haloRadius = p.radius * 3.2;
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloRadius);
                    grad.addColorStop(0, "rgba(16, 185, 129, 0.45)");
                    grad.addColorStop(0.5, "rgba(16, 185, 129, 0.15)");
                    grad.addColorStop(1, "rgba(16, 185, 129, 0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, haloRadius, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Dewdrop Core Node
                ctx.fillStyle = activeColor;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.7, p.radius), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            if (burstOnLoad && burstDecay > 0.05) {
                burstDecay *= 0.988;
            }

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        const handleResize = () => {
            if (!canvas) return;
            width = fullScreen ? window.innerWidth : canvas.offsetWidth;
            height = fullScreen ? window.innerHeight : canvas.offsetHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
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
            if (shockwavesRef.current.length < 5) {
                shockwavesRef.current.push({
                    x: e.clientX,
                    y: e.clientY,
                    radius: 10,
                    maxRadius: 200,
                    alpha: 1.0,
                    strength: 2.0
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
