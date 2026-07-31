// Shared futuristic animation components for public pages — performance-optimised build
"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { useIsLowPower } from "@/hooks/use-network-quality";

// ─── CRT Scanline Overlay ─────────────────────────────────────────────────────
// Pure CSS – no JS animation, no repaints. Removed on slow connections.
export function ScanLines() {
    const lowPower = useIsLowPower();
    if (lowPower) return null;
    return (
        <div
            className="fixed inset-0 z-[50] pointer-events-none"
            style={{
                background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)",
            }}
        />
    );
}

// ─── Custom Cursor ─────────────────────────────────────────────────────────────
export function CustomCursor() {
    const prefersReduced = useReducedMotion();
    const lowPower = useIsLowPower();
    const mouseX = useMotionValue(-100);
    const mouseY = useMotionValue(-100);
    // Tighter spring = less work per frame
    const cursorX = useSpring(mouseX, { stiffness: 800, damping: 50 });
    const cursorY = useSpring(mouseY, { stiffness: 800, damping: 50 });
    const trailX = useSpring(mouseX, { stiffness: 150, damping: 30 });
    const trailY = useSpring(mouseY, { stiffness: 150, damping: 30 });

    useEffect(() => {
        if (prefersReduced || lowPower) return;
        const move = (e: MouseEvent) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
        window.addEventListener("mousemove", move, { passive: true });
        return () => window.removeEventListener("mousemove", move);
    }, [mouseX, mouseY, prefersReduced, lowPower]);

    if (prefersReduced || lowPower) return null;
    return (
        <>
            <motion.div style={{ x: cursorX, y: cursorY }} className="fixed top-0 left-0 z-[900] pointer-events-none w-2 h-2 -ml-1 -mt-1 bg-white rounded-full mix-blend-difference will-change-transform" />
            <motion.div style={{ x: trailX, y: trailY }} className="fixed top-0 left-0 z-[899] pointer-events-none w-7 h-7 -ml-[14px] -mt-[14px] border border-zinc-300 dark:border-white/20 rounded-full mix-blend-difference will-change-transform" />
        </>
    );
}

// ─── Animated Grid Background ─────────────────────────────────────────────────
// Static div — no JS animation needed
export function AnimatedGrid() {
    return (
        <div
            className="fixed inset-0 z-0 pointer-events-none"
            style={{
                backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
            }}
        />
    );
}

// ─── 3D Tilt Card ─────────────────────────────────────────────────────────────
export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const rotateX = useMotionValue(0);
    const rotateY = useMotionValue(0);
    const springX = useSpring(rotateX, { stiffness: 180, damping: 22 });
    const springY = useSpring(rotateY, { stiffness: 180, damping: 22 });

    const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        rotateY.set(((e.clientX - (rect.left + rect.width / 2)) / rect.width) * 8);
        rotateX.set(((e.clientY - (rect.top + rect.height / 2)) / rect.height) * -8);
    }, [rotateX, rotateY]);

    const handleLeave = useCallback(() => { rotateX.set(0); rotateY.set(0); }, [rotateX, rotateY]);

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{ rotateX: springX, rotateY: springY, transformPerspective: 900 }}
            className={`will-change-transform ${className ?? ""}`}
        >
            {children}
        </motion.div>
    );
}

// ─── Scramble Text Hook ────────────────────────────────────────────────────────
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%<>/\\[]{}";
export function useScramble(target: string, delay = 0) {
    const [display, setDisplay] = useState("");
    useEffect(() => {
        let frame: ReturnType<typeof setInterval>;
        let step = 0;
        const totalSteps = target.replace(/\s/g, "").length * 4;
        const to = setTimeout(() => {
            frame = setInterval(() => {
                step++;
                setDisplay(target.split("").map((char, i) => {
                    if (char === " " || char === "\n") return char;
                    return step > (i / target.length) * totalSteps * 0.8 ? char : CHARS[Math.floor(Math.random() * CHARS.length)];
                }).join(""));
                if (step >= totalSteps) clearInterval(frame);
            }, 40); // 25fps instead of 33fps — smoother on budget hardware
        }, delay);
        return () => { clearTimeout(to); clearInterval(frame); };
    }, [target, delay]);
    return display;
}

// ─── Particle Field — canvas based ───────────────────────────────────────────
export function ParticleField({ count = 30 }: { count?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const prefersReduced = useReducedMotion();
    const lowPower = useIsLowPower();

    useEffect(() => {
        if (prefersReduced || lowPower) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio, 2);
        const resize = () => {
            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.scale(dpr, dpr);
        };
        resize();
        window.addEventListener("resize", resize, { passive: true });

        const particles = Array.from({ length: count }, () => ({
            x: Math.random() * canvas.offsetWidth,
            y: Math.random() * canvas.offsetHeight,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.3 - Math.random() * 0.5,
            r: 0.5 + Math.random() * 1.2,
            opacity: 0.05 + Math.random() * 0.25,
        }));

        let raf: number;
        const draw = () => {
            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            ctx.clearRect(0, 0, w, h);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
                if (p.x < 0 || p.x > w) p.vx *= -1;
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    }, [count, prefersReduced, lowPower]);

    if (prefersReduced || lowPower) return null;
    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ─── Matrix Rain — full canvas, no DOM schools at all ──────────────────────────
const MATRIX_CHARS = "ルアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘ01";
export function MatrixRain({ cols = 12 }: { cols?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const prefersReduced = useReducedMotion();
    const lowPower = useIsLowPower();

    useEffect(() => {
        if (prefersReduced || lowPower) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const fontSize = 10;
        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener("resize", resize, { passive: true });

        const colWidth = canvas.offsetWidth / cols;
        const drops = Array.from({ length: cols }, () => ({
            y: Math.random() * -canvas.offsetHeight,
            speed: 1.2 + Math.random() * 1.8,
            opacity: 0.05 + Math.random() * 0.1,
        }));

        let raf: number;
        let lastTime = 0;
        const FPS = 18; // capped framerate
        const interval = 1000 / FPS;

        const draw = (timestamp: number) => {
            raf = requestAnimationFrame(draw);
            if (timestamp - lastTime < interval) return;
            lastTime = timestamp;

            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            ctx.clearRect(0, 0, w, h);
            ctx.font = `${fontSize}px monospace`;

            drops.forEach((d, i) => {
                d.y += d.speed;
                if (d.y > h) d.y = Math.random() * -h * 0.5;
                const numChars = Math.ceil(h / fontSize);
                for (let j = 0; j < numChars; j++) {
                    const alpha = d.opacity * (1 - j / numChars);
                    if (alpha < 0.005) continue;
                    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                    const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
                    ctx.fillText(char, i * colWidth + colWidth / 2 - fontSize / 2, d.y - j * fontSize);
                }
            });
        };
        raf = requestAnimationFrame(draw);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    }, [cols, prefersReduced, lowPower]);

    if (prefersReduced || lowPower) return null;
    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ─── Neural Web — canvas, throttled to 24fps ─────────────────────────────────
interface NetNode { x: number; y: number; vx: number; vy: number; }
export function NeuralWeb({ nodeCount = 16 }: { nodeCount?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const schools = useRef<NetNode[]>([]);
    const prefersReduced = useReducedMotion();
    const lowPower = useIsLowPower();

    useEffect(() => {
        if (prefersReduced || lowPower) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener("resize", resize, { passive: true });

        schools.current = Array.from({ length: nodeCount }, () => ({
            x: Math.random() * canvas.offsetWidth,
            y: Math.random() * canvas.offsetHeight,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
        }));

        let raf: number;
        let lastTime = 0;
        const FPS = 24;
        const interval = 1000 / FPS;

        const draw = (timestamp: number) => {
            raf = requestAnimationFrame(draw);
            if (timestamp - lastTime < interval) return;
            lastTime = timestamp;

            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            ctx.clearRect(0, 0, w, h);

            const ns = schools.current;
            for (let i = 0; i < ns.length; i++) {
                const n = ns[i];
                n.x += n.vx; n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;
            }

            const DIST = 140;
            for (let i = 0; i < ns.length; i++) {
                for (let j = i + 1; j < ns.length; j++) {
                    const dx = ns[i].x - ns[j].x;
                    const dy = ns[i].y - ns[j].y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < DIST * DIST) {
                        const alpha = (1 - Math.sqrt(distSq) / DIST) * 0.15;
                        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(ns[i].x, ns[i].y);
                        ctx.lineTo(ns[j].x, ns[j].y);
                        ctx.stroke();
                    }
                }
                ctx.fillStyle = "rgba(255,255,255,0.25)";
                ctx.beginPath();
                ctx.arc(ns[i].x, ns[i].y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        };
        raf = requestAnimationFrame(draw);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    }, [nodeCount, prefersReduced, lowPower]);

    if (prefersReduced || lowPower) return null;
    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ─── Magnetic Button ──────────────────────────────────────────────────────────
export function MagneticButton({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, { stiffness: 250, damping: 22 });
    const springY = useSpring(y, { stiffness: 250, damping: 22 });

    const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - (rect.left + rect.width / 2)) * 0.3);
        y.set((e.clientY - (rect.top + rect.height / 2)) * 0.3);
    }, [x, y]);

    const handleLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

    return (
        <motion.div ref={ref} style={{ x: springX, y: springY }} onMouseMove={handleMove} onMouseLeave={handleLeave} onClick={onClick} className={`will-change-transform ${className ?? ""}`}>
            {children}
        </motion.div>
    );
}

// ─── Hex Grid Background — pure SVG data URI, zero JS ─────────────────────────
export function HexGrid() {
    return (
        <div
            className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpolygon points='28,0 56,15 56,45 28,60 0,45 0,15' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpolygon points='28,60 56,75 56,105 28,120 0,105 0,75' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
            }}
        />
    );
}

// ─── Glitch Overlay — debounced, off on low power ────────────────────────────
export function GlitchOverlay() {
    const [active, setActive] = useState(false);
    const prefersReduced = useReducedMotion();
    const lowPower = useIsLowPower();

    useEffect(() => {
        if (prefersReduced || lowPower) return;
        let timeoutId: ReturnType<typeof setTimeout>;
        const schedule = () => {
            timeoutId = setTimeout(() => {
                if (Math.random() < 0.12) {
                    setActive(true);
                    setTimeout(() => { setActive(false); schedule(); }, 60 + Math.random() * 100);
                } else {
                    schedule();
                }
            }, 3000 + Math.random() * 6000);
        };
        schedule();
        return () => clearTimeout(timeoutId);
    }, [prefersReduced, lowPower]);

    if (!active || prefersReduced || lowPower) return null;
    return (
        <div
            className="fixed inset-0 z-[52] pointer-events-none"
            style={{
                background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 4px)",
                transform: `translateX(${(Math.random() - 0.5) * 4}px)`,
            }}
        />
    );
}

// ─── Counter ──────────────────────────────────────────────────────────────────
export function Counter({ from = 0, to, suffix = "", duration = 1.8 }: { from?: number; to: number; suffix?: string; duration?: number }) {
    const [val, setVal] = useState(from);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                const startTime = performance.now();
                const step = (now: number) => {
                    const t = Math.min((now - startTime) / (duration * 1000), 1);
                    setVal(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
                    if (t < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            }
        }, { threshold: 0.5 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [from, to, duration]);

    return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Animated Scan Bar ────────────────────────────────────────────────────────
export function ScanBar() {
    return (
        <div className="h-px bg-zinc-100 dark:bg-zinc-900 w-full overflow-hidden relative">
            <motion.div animate={{ x: ["-100%", "500%"] }} transition={{ repeat: Infinity, duration: 2.3, ease: "easeInOut", repeatDelay: 1 }} className="h-full bg-gradient-to-r from-transparent via-white to-transparent w-1/4 will-change-transform" />
        </div>
    );
}

// ─── Glitch Text — only animates when visible ─────────────────────────────────
export function GlitchText({ children, className }: { children: React.ReactNode; className?: string }) {
    const prefersReduced = useReducedMotion();
    if (prefersReduced) return <span className={className}>{children}</span>;
    return (
        <motion.span className={className} animate={{ x: [0, -2, 2, -1, 0] }} transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 9 }}>
            {children}
        </motion.span>
    );
}

// ─── Section Reveal ──────────────────────────────────────────────────────────
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    const prefersReduced = useReducedMotion();
    return (
        <motion.div
            className={className}
            initial={prefersReduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}

// ─── Typewriter ──────────────────────────────────────────────────────────────
export function Typewriter({ lines, className }: { lines: string[]; className?: string }) {
    const [lineIdx, setLineIdx] = useState(0);
    const [charIdx, setCharIdx] = useState(0);
    const [displayed, setDisplayed] = useState("");

    useEffect(() => {
        if (lineIdx >= lines.length) return;
        const target = lines[lineIdx];
        const t = charIdx < target.length
            ? setTimeout(() => { setDisplayed(p => p + target[charIdx]); setCharIdx(c => c + 1); }, 22 + Math.random() * 28)
            : setTimeout(() => { setDisplayed(p => p + "\n"); setLineIdx(l => l + 1); setCharIdx(0); }, 280);
        return () => clearTimeout(t);
    }, [lineIdx, charIdx, lines]);

    return (
        <div className={className}>
            {displayed.split("\n").map((line, i) => (
                <div key={i} className="text-[10px] font-mono text-zinc-600 dark:text-zinc-500 leading-relaxed">
                    {line}
                    {i === displayed.split("\n").length - 1 && lineIdx < lines.length && (
                        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} className="inline-block w-1.5 h-3 bg-white ml-0.5 align-middle" />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Orbit Ring ───────────────────────────────────────────────────────────────
export function OrbitRing({ nodeCount = 5, radius = 60, duration = 8 }: { nodeCount?: number; radius?: number; duration?: number }) {
    const prefersReduced = useReducedMotion();
    return (
        <div className="relative pointer-events-none" style={{ width: radius * 2 + 32, height: radius * 2 + 32 }}>
            <div className="absolute inset-4 border border-zinc-200 dark:border-white/5 rounded-full" />
            {Array.from({ length: nodeCount }, (_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-white rounded-full will-change-transform"
                    style={{ top: "50%", left: "50%", marginTop: -3, marginLeft: -3 }}
                    animate={prefersReduced ? {} : { rotate: 360 }}
                    transition={{ duration: duration + i * 1.5, repeat: Infinity, ease: "linear" }}
                >
                    <div style={{ transform: `translateX(${radius}px)` }} className="w-1.5 h-1.5 bg-white rounded-full opacity-40" />
                </motion.div>
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 border border-white/15 rounded-full" />
            </div>
        </div>
    );
}

// ─── Page Shared Nav ──────────────────────────────────────────────────────────
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function PageNav() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-300 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-4">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <motion.div whileHover={{ scale: 1.12, rotate: 5 }} className="w-6 h-6 bg-white flex items-center justify-center">
                        <span className="text-black font-black text-xs">L</span>
                    </motion.div>
                    <span className="font-bold text-lg tracking-tighter text-zinc-900 dark:text-white">lucy_os</span>
                </Link>
                <Link href="/">
                    <Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group">
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        back_to_home
                    </Button>
                </Link>
            </div>
        </nav>
    );
}

// ─── Page Shared Footer ────────────────────────────────────────────────────────
export function PageFooter({ id, links }: { id: string; links: { href: string; label: string }[] }) {
    return (
        <footer className="border-t border-zinc-200 dark:border-white/5 py-12 px-6 text-[10px] uppercase tracking-[0.2em] text-zinc-700">
            <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                <p>© 2026 LUCY_SYS // {id}</p>
                <div className="flex items-center gap-8 flex-wrap justify-center md:justify-end">
                    {links.map(l => <Link key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</Link>)}
                    <Link href="/community" className="hover:text-white transition-colors text-zinc-600 dark:text-zinc-400 hover:text-white font-bold">community</Link>
                    <Link href="https://discord.gg/Kbm4XhzfMJ" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-zinc-600 dark:text-zinc-400 hover:text-white font-bold">discord</Link>
                    <Link href="https://t.me/+ElIFqzvGBlYzMDBk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-zinc-600 dark:text-zinc-400 hover:text-white font-bold">telegram</Link>
                    <Link href="https://www.youtube.com/@LucyAcademics" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-zinc-600 dark:text-zinc-400 hover:text-white font-bold">youtube</Link>
                </div>
            </div>
        </footer>
    );
}
