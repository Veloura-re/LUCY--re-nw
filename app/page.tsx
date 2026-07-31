"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Cpu, Terminal as TerminalIcon, Shield, Command, Database, Search,
  Activity, Network
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { ParticleField } from "@/components/public/animations";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PromoPopup } from "@/components/marketing/promo-popup";





// ─── 3D Tilt Card ─────────────────────────────────────────────────────────────
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 200, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 200, damping: 20 });

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    rotateY.set(dx * 12);
    rotateX.set(-dy * 12);
  }, [rotateX, rotateY]);

  const handleLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Animated Data Bar ─────────────────────────────────────────────────────────
function DataBar({ value, label, delay = 0 }: { value: number; label: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useRef(false);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !inView.current) {
        inView.current = true;
        setTimeout(() => setWidth(value), delay + 200);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, delay]);
  return (
    <div ref={ref} className="space-y-2">
      <div className="flex justify-between text-[9px] uppercase tracking-widest text-slate-500 dark:text-zinc-600 font-bold">
        <span>{label}</span>
        <span className="text-emerald-600 dark:text-white">{value}%</span>
      </div>
      <div className="h-px bg-slate-200 dark:bg-zinc-900 w-full overflow-hidden relative">
        <motion.div
          className="h-full bg-emerald-500 dark:bg-white absolute left-0 top-0"
          initial={{ width: "0%" }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: delay / 1000 }}
        />
        <motion.div
          className="h-full w-4 absolute top-0 bg-gradient-to-r from-transparent to-emerald-500 dark:to-white"
          initial={{ left: "0%" }}
          animate={{ left: `${width - 1}%` }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: delay / 1000 }}
        />
      </div>
    </div>
  );
}

// ─── Boot Sequence ─────────────────────────────────────────────────────────────
function BootSequence({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(false);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const hasBooted = sessionStorage.getItem("lucy_booted");
    if (hasBooted) {
      setDone(true);
      onDone();
      return;
    }

    let startTime = Date.now();
    const duration = 2000;
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setPercent(Math.floor(easeProgress * 100));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        sessionStorage.setItem("lucy_booted", "true");
        setTimeout(() => {
          setDone(true);
          setTimeout(onDone, 600);
        }, 300);
      }
    };
    
    requestAnimationFrame(animate);
  }, [onDone]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[999] bg-white dark:bg-black flex flex-col items-center justify-center font-mono"
        >
          <div className="relative inline-block text-7xl md:text-[12rem] font-bold tracking-tighter text-slate-100 dark:text-zinc-900 select-none uppercase leading-none">
            LUCY
            <div 
              className="absolute bottom-0 left-0 right-0 overflow-hidden"
              style={{ height: `${percent}%` }}
            >
              <div className="absolute bottom-0 left-0 right-0 text-slate-900 dark:text-white text-center flex justify-center whitespace-nowrap">
                LUCY
              </div>
            </div>
          </div>
          <div className="mt-8 text-slate-400 dark:text-zinc-500 text-sm md:text-base tracking-widest font-bold">
            {percent.toString().padStart(3, '0')}%
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Signal Wall Preview ───────────────────────────────────────────────────────
interface WallComment { id: string; callsign: string; message: string; emoji: string; createdAt: string; }
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function SignalWallPreview() {
  const [comments, setComments] = useState<WallComment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/public/comments")
      .then(r => r.ok ? r.json() : { comments: [] })
      .then((d: any) => { setComments((d.comments ?? []).slice(0, 4)); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="py-40 px-6 bg-slate-50 dark:bg-[#050505] border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto space-y-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} className="space-y-2">
            <div className="flex items-center gap-4 text-slate-500 dark:text-zinc-600 font-bold">
              <motion.div animate={{ width: ["48px", "96px", "48px"] }} transition={{ duration: 3.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-800" />
              <span className="text-[10px] uppercase tracking-[0.4em]">signal_wall // live_messages</span>
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.3, repeat: Infinity }} className="w-1.5 h-1.5 bg-emerald-500 dark:bg-white rounded-full" />
            </div>
          </motion.div>
          <Link href="/wall">
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Button variant="outline" className="h-10 px-6 rounded-md dark:rounded-none border-slate-300 dark:border-white/20 text-[10px] uppercase tracking-widest text-slate-700 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all font-bold">
                view_all_signals →
              </Button>
            </motion.div>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <motion.div key={i} animate={{ opacity: [0.05, 0.12, 0.05] }} transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.2 }} className="h-40 border border-slate-200 dark:border-white/5 bg-slate-200 dark:bg-zinc-900/10 rounded-xl dark:rounded-none" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="py-12 text-center">
            <Link href="/wall">
              <motion.div whileHover={{ scale: 1.02 }} className="inline-block px-8 py-6 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-transparent transition-colors cursor-pointer space-y-2 rounded-xl dark:rounded-none shadow-sm dark:shadow-none">
                <div className="text-2xl">🔭</div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest font-bold">be first to signal</div>
              </motion.div>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comments.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4, borderColor: "rgba(100,116,139,0.5)" }}
                className="border border-slate-200 dark:border-white/5 bg-white dark:bg-black p-6 space-y-4 cursor-default transition-all group rounded-xl dark:rounded-none shadow-sm dark:shadow-none dark:hover:border-white/12"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xl">{c.emoji}</span>
                  <motion.div animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.5 }} className="text-[8px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest font-bold">{timeAgo(c.createdAt)}</motion.div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-white transition-colors mb-2">{c.callsign}</div>
                  <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed line-clamp-3">{c.message}</p>
                </div>
                <div className="h-px bg-slate-100 dark:bg-zinc-900 overflow-hidden">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: false }} transition={{ duration: 1, delay: i * 0.08 }} className="h-full bg-slate-300 dark:bg-white/5" />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link href="/wall">
            <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} className="inline-block px-10 py-4 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-all bg-white dark:bg-transparent rounded-md dark:rounded-none shadow-sm dark:shadow-none font-bold">
              leave_your_message →
            </motion.div>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Home() {

  const [booting, setBooting] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBootDone = () => {
    setBooting(false);
  };
  const [scrolled, setScrolled] = useState(false);
  const [time, setTime] = useState("");
  const [liveStats, setLiveStats] = useState({ schools: 0, students: 0, teachers: 0, totalSchools: 0 });
  const [animCounters, setAnimCounters] = useState({ schools: 0, students: 0, teachers: 0, totalSchools: 0 });

  // Mouse cursor effects
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const cursorX = useSpring(mouseX, { stiffness: 500, damping: 35 });
  const cursorY = useSpring(mouseY, { stiffness: 500, damping: 35 });
  const trailX = useSpring(mouseX, { stiffness: 100, damping: 25 });
  const trailY = useSpring(mouseY, { stiffness: 100, damping: 25 });

  const statsRef = useRef<HTMLElement>(null);
  const featureRef = useRef<HTMLElement>(null);
  const deployRef = useRef<HTMLElement>(null);
  const statsVisible = useRef(false);

  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.25], [0, -50]);

  // Using standard framer-motion fade-in that wraps the container
  const heroLine1 = "YOUR SCHOOL'S";
  const heroLine2 = "DIGITAL HOME.";

  useEffect(() => {
    const onMove = (e: MouseEvent) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    window.addEventListener("mousemove", onMove);
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })), 1000);
    setScrolled(window.scrollY > 20);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    fetch("/api/public/stats").then(r => r.json()).then(setLiveStats).catch(() => { });
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("scroll", onScroll); clearInterval(timer); };
  }, [mouseX, mouseY]);

  // Animate counters when stats visible
  useEffect(() => {
    if (liveStats.schools === 0) return;
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !statsVisible.current) {
        statsVisible.current = true;
        const steps = 60;
        let step = 0;
        const iv = setInterval(() => {
          step++;
          const ease = 1 - Math.pow(1 - step / steps, 3);
          setAnimCounters({
            schools: Math.round(liveStats.schools * ease),
            students: Math.round(liveStats.students * ease),
            teachers: Math.round(liveStats.teachers * ease),
            totalSchools: Math.round(liveStats.totalNodes * ease),
          });
          if (step >= steps) clearInterval(iv);
        }, 2000 / steps);
      }
    }, { threshold: 0.3 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [liveStats]);

  const featureCards = [
    { icon: Command, title: "core_control", desc: "direct command abstraction of all institutional variables." },
    { icon: Shield, title: "vault_security", desc: "quantum-resistant silos for high-sensitivity scholar data." },
    { icon: Activity, title: "live_telemetry", desc: "real-time ingestion of attendance and behavioral vectors." },
    { icon: Database, title: "data_sync", desc: "distributed data consistency across the network." },
    { icon: Network, title: "smart_routing", desc: "autonomous scheduling via heuristic temporal mapping." },
    { icon: Search, title: "deep_audit", desc: "cryptographically verifiable logs for all operations." }
  ];

  const marqueeItems = ["EMPOWERING_EDUCATION", "LUCY_OS_v1", "HIGH_PERFORMANCE", "SECURE_STORAGE", "CONNECTED_CAMPUS", "CENTRAL_DASHBOARD", "ACADEMIC_SYSTEM", "SECURE_ACCESS", "STUDENT_PORTAL", "CLOUD_NATIVE"];
  const navLinks: { href: string; label: string; ext?: boolean }[] = [
    { href: "/intelligence", label: "intelligence" },
    { href: "/network", label: "network" },
    { href: "/security", label: "vault" },
    { href: "/docs", label: "docs" },
    { href: "/deck", label: "presentation" },
    { href: "/community", label: "community" },
  ];
  const companyLinks = [
    { href: "/careers", l: "careers" },
    { href: "/partners", l: "partners" },
    { href: "/press", l: "press" },
    { href: "/blog", l: "signal log" },
    { href: "/contact", l: "contact" },
    { href: "/support", l: "support" },
    { href: "/community", l: "community" }
  ];

  const loaded = liveStats.schools > 0;

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-zinc-900 dark:text-white dark:selection:bg-white dark:selection:text-black overflow-x-hidden font-mono lowercase tracking-tight transition-colors duration-300">
      {/* ── Boot Sequence ── */}
      {mounted && booting && <BootSequence onDone={handleBootDone} />}

      {/* ── Custom Cursor ── */}
      <motion.div style={{ x: cursorX, y: cursorY }} className="fixed top-0 left-0 z-[900] pointer-events-none w-2 h-2 -ml-1 -mt-1 bg-emerald-500 dark:bg-white rounded-full mix-blend-multiply dark:mix-blend-difference will-change-transform" />
      <motion.div style={{ x: trailX, y: trailY }} className="fixed top-0 left-0 z-[899] pointer-events-none w-8 h-8 -ml-4 -mt-4 border border-emerald-500/20 dark:border-white/20 rounded-full mix-blend-multiply dark:mix-blend-difference will-change-transform" />

      {/* ── CRT Scanlines ── */}
      <div className="fixed inset-0 z-[50] pointer-events-none dark:opacity-100 opacity-20" style={{
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)"
      }} />
      <motion.div
        className="fixed inset-0 z-[51] pointer-events-none dark:opacity-100 opacity-20"
        animate={{ backgroundPositionY: ["0px", "4px"] }}
        transition={{ duration: 0.1, repeat: Infinity, ease: "linear" }}
        style={{ background: "linear-gradient(transparent 50%, rgba(0,0,0,0.08) 50%)", backgroundSize: "100% 4px" }}
      />

      {/* ── Grid ── */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#00000004_1px,transparent_1px),linear-gradient(to_bottom,#00000004_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none transition-colors duration-300" />
      <motion.div
        className="fixed inset-0 z-0 pointer-events-none hidden dark:block"
        animate={{ backgroundPosition: ["0px 0px", "32px 32px"] }}
        transition={{ duration: 7.8, repeat: Infinity, ease: "linear" }}
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)", backgroundSize: "64px 64px" }}
      />
      <motion.div
        className="fixed inset-0 z-0 pointer-events-none dark:hidden"
        animate={{ backgroundPosition: ["0px 0px", "32px 32px"] }}
        transition={{ duration: 7.8, repeat: Infinity, ease: "linear" }}
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.02) 0%, transparent 70%)", backgroundSize: "64px 64px" }}
      />

      {/* ── Top Ticker ── */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-slate-900 text-zinc-900 dark:text-white dark:bg-white dark:text-black text-[9px] uppercase tracking-widest overflow-hidden py-1.5 transition-colors">
        <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ duration: 24.8, repeat: Infinity, ease: "linear" }} className="flex gap-16 whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="font-bold shrink-0">{item} //</span>
          ))}
        </motion.div>
      </div>

      {/* ── Navbar ── */}
      <nav className={cn("fixed left-0 right-0 z-50 transition-all duration-300 px-6", scrolled ? "top-7 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none" : "top-8 bg-transparent")}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo className="w-8 h-8" />
            <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">lucy_os</span>
          </Link>
          <div className="hidden lg:flex items-center gap-12 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                target={link.ext ? "_blank" : undefined}
                rel={link.ext ? "noopener noreferrer" : undefined}
                className="relative group hover:text-slate-900 dark:hover:text-white transition-colors duration-200 font-bold"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 h-px bg-slate-900 dark:bg-white w-0 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest font-bold">
              <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 h-1 bg-emerald-500 dark:bg-white rounded-full" />
              <span>{time}</span>
            </div>
            
            <ThemeToggle className="scale-90" />

            <Link href="/login">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Button variant="ghost" className="h-9 px-4 text-[11px] uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all rounded-md dark:rounded-none border border-slate-300 dark:border-white/10 hover:border-slate-900 dark:hover:border-white font-bold">
                  access_login
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* ── HERO ── */}
        <section className="min-h-screen flex flex-col justify-center px-6 pt-28 relative overflow-hidden">
          <ParticleField />

          {/* Glowing orb background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none hidden dark:block">
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.03, 0.08, 0.03] }}
              transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full rounded-full bg-white blur-3xl"
            />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none dark:hidden">
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.03, 0.08, 0.03] }}
              transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full rounded-full bg-slate-900 blur-3xl"
            />
          </div>

          <motion.div style={{ opacity: heroOpacity, y: heroY }} className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-end relative z-10">
            <div className="lg:col-span-8 space-y-10">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="flex items-center gap-4 text-slate-500 dark:text-zinc-500 font-bold">
                <motion.div animate={{ width: ["12px", "48px", "12px"] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                <span className="text-[10px] uppercase tracking-[0.4em]">system_v1.0_stable</span>
                <motion.div animate={{ opacity: [1, 0, 1], scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} className="w-1.5 h-1.5 bg-emerald-500 dark:bg-white rounded-full" />
              </motion.div>

              {/* Fade-in hero title */}
              <motion.div 
                initial={{ opacity: 0, rotateX: 45, y: 40 }} 
                animate={{ opacity: 1, rotateX: 0, y: 0 }} 
                transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <h1 className="text-[11vw] lg:text-[8.5rem] font-bold leading-[0.85] tracking-tighter uppercase perspective-[1000px]">
                  <motion.div 
                    whileHover={{ 
                        rotateY: 15, 
                        rotateX: -15, 
                        translateZ: 100,
                        textShadow: "0 20px 50px rgba(0,0,0,0.1)"
                    }}
                    transition={{ type: "spring", stiffness: 150, damping: 15 }}
                    className="text-slate-900 dark:text-white cursor-default transition-all duration-300 transform-gpu dark:hover:drop-shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
                  >
                    {heroLine1 || "YOUR SCHOOL'S"}
                  </motion.div>
                  <motion.div 
                    whileHover={{ 
                        rotateY: -15, 
                        rotateX: 15, 
                        translateZ: 100,
                        textShadow: "0 20px 50px rgba(0,0,0,0.05)"
                    }}
                    transition={{ type: "spring", stiffness: 150, damping: 15 }}
                    className="text-slate-400 dark:text-zinc-800 cursor-default transition-all duration-300 transform-gpu dark:hover:drop-shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:drop-shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
                  >
                    {heroLine2 || "DIGITAL HOME."}
                  </motion.div>
                </h1>
              </motion.div>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.4 }} className="text-slate-500 dark:text-zinc-500 max-w-xl text-lg lowercase leading-relaxed font-medium">
                a simple place you can call your own. drop the messy spreadsheets and build a digital home that's yours.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.3 }} className="flex flex-wrap gap-4">
                <Link href="/register">
                  <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                    <Button className="h-12 px-8 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-md dark:rounded-none text-[11px] uppercase tracking-widest font-bold relative overflow-hidden group shadow-md dark:shadow-none transition-colors">
                      <span className="relative z-10">get_started</span>
                      <motion.div className="absolute inset-0 bg-slate-700 dark:bg-zinc-200 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/docs">
                  <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                    <Button variant="ghost" className="h-12 px-8 rounded-md dark:rounded-none border border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/40 hover:bg-slate-100 dark:hover:bg-white/5 text-[11px] uppercase tracking-widest transition-all font-bold">
                      read_docs
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/deck">
                  <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                    <Button variant="ghost" className="h-12 px-8 rounded-md dark:rounded-none border border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/40 hover:bg-slate-100 dark:hover:bg-white/5 text-[11px] uppercase tracking-widest transition-all font-bold">
                      view_presentation
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/community">
                  <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                    <Button variant="ghost" className="h-12 px-8 rounded-md dark:rounded-none border border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/40 hover:bg-slate-100 dark:hover:bg-white/5 text-[11px] uppercase tracking-widest transition-all gap-2 font-bold">
                      join_community
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </div>

            {/* Status Panel */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.6 }} className="lg:col-span-4 space-y-4 pb-4">
              <TiltCard className="p-8 border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-zinc-950/60 backdrop-blur-sm space-y-6 cursor-default rounded-xl dark:rounded-none shadow-sm dark:shadow-none">
                <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest font-bold">
                  <span>system_status</span>
                  <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.3 }} className="text-emerald-600 dark:text-white font-bold">● active</motion.span>
                </div>

                {/* Scanning bar */}
                <div className="space-y-1">
                  <div className="h-px bg-slate-200 dark:bg-zinc-900 w-full overflow-hidden relative">
                    <motion.div animate={{ x: ["-100%", "500%"] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", repeatDelay: 0.3 }} className="h-full bg-gradient-to-r from-transparent via-emerald-500 dark:via-white to-transparent w-1/4" />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 dark:text-zinc-700 uppercase font-bold">
                    <span>signal_strength: max</span>
                    <span>enc: aes-256</span>
                  </div>
                </div>

                {/* Dashboard logs */}
                <div className="bg-slate-100/60 dark:bg-black/60 p-4 font-mono text-[9px] text-slate-600 dark:text-zinc-600 space-y-1 border border-slate-200 dark:border-white/5 rounded-md dark:rounded-none font-medium">
                  {[
                    { text: "> system :: all_systems_go", delay: 0.2 },
                    { text: "> vault :: encrypted_active", delay: 0.5 },
                    { text: "> smart_engine :: nominal", delay: 0.8 },
                  ].map((line, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: line.delay + 1 }}>
                      {line.text}
                    </motion.div>
                  ))}
                  <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.7, delay: 1.5 }} className="inline-block text-slate-900 dark:text-white font-bold">_ awaiting_command_</motion.span>
                </div>

                <Link href="/register" className="block">
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 h-12 rounded-md dark:rounded-none text-xs uppercase tracking-widest font-bold shadow-sm dark:shadow-none transition-colors">
                      get_started
                    </Button>
                  </motion.div>
                </Link>
              </TiltCard>

              <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest font-bold">
                {[
                  { val: loaded ? liveStats.schools.toString() : "…", label: "institutions" },
                  { val: loaded ? liveStats.students.toLocaleString() : "…", label: "scholars" }
                ].map((s, i) => (
                  <motion.div key={i} whileHover={{ borderColor: "rgba(100,116,139,0.3)", y: -3 }} className="p-4 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-900/10 flex flex-col gap-2 cursor-default transition-all rounded-xl dark:rounded-none shadow-sm dark:shadow-none dark:hover:border-white/15">
                    <motion.span key={s.val} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-900 dark:text-white text-xl font-bold">{s.val}</motion.span>
                    <span>{s.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Scroll hint */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.3, repeat: Infinity }} className="w-px h-12 bg-gradient-to-b from-slate-400 dark:from-zinc-800 to-transparent" />
            <span className="text-[8px] text-slate-500 dark:text-zinc-700 uppercase tracking-widest font-bold">scroll_to_explore</span>
          </motion.div>
        </section>

        {/* ── Horizontal Data-Stream Divider ── */}
        <div className="relative py-6 overflow-hidden border-y border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#050505] transition-colors duration-300">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ x: [i % 2 === 0 ? "0%" : "-50%", i % 2 === 0 ? "-50%" : "0%"] }}
              transition={{ duration: 14.8 + i * 5, repeat: Infinity, ease: "linear" }}
              className="whitespace-nowrap flex gap-12 text-[9px] uppercase tracking-[0.3em] text-slate-300 dark:text-zinc-800 font-bold mb-1"
            >
              {Array(20).fill(null).map((_, j) => {
                const pseudoRandomDec = (((i + 1) * 11) + ((j + 1) * 17)) % 0xFFFF;
                return (
                  <span key={j}>0×{(pseudoRandomDec | 0).toString(16).toUpperCase().padStart(4, "0")} // LUCY_SYS //</span>
                )
              })}
            </motion.div>
          ))}
        </div>

        {/* ── Stats Bar ── */}
        <section ref={statsRef} className="py-24 px-6 bg-slate-50 dark:bg-[#050505] transition-colors duration-300">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 dark:bg-white/5 overflow-hidden border border-slate-200 dark:border-white/5 rounded-xl dark:rounded-none">
              {[
                { label: "institutions", val: loaded ? animCounters.schools.toLocaleString() : "—", unit: " schools" },
                { label: "enrolled_students", val: loaded ? animCounters.students.toLocaleString() : "—", unit: " students" },
                { label: "faculty_roster", val: loaded ? animCounters.teachers.toLocaleString() : "—", unit: " teachers" },
                { label: "active_schools", val: loaded ? animCounters.totalSchools.toLocaleString() : "—", unit: " active" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                  whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                  className="bg-white dark:bg-black p-12 space-y-4 cursor-default group dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="text-[9px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest font-bold">{stat.label}</div>
                  <motion.div key={stat.val} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="text-4xl font-bold tracking-tighter text-slate-900 dark:text-white">
                    {stat.val}<span className="text-slate-500 dark:text-zinc-500 text-xl font-medium ml-1">{loaded ? stat.unit : ""}</span>
                  </motion.div>
                  {/* Animated underline progress bar */}
                  <div className="h-px bg-slate-100 dark:bg-zinc-900 w-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "100%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.8, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-slate-300 dark:bg-white/20"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features List ── */}
        <section ref={featureRef} id="features" className="py-40 px-6 bg-white dark:bg-black transition-colors duration-300">
          <div className="max-w-[1400px] mx-auto space-y-16">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="flex items-center gap-4 text-slate-500 dark:text-zinc-600 font-bold">
              <motion.div animate={{ width: ["48px", "96px", "48px"] }} transition={{ duration: 3.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-800" />
              <span className="text-[10px] uppercase tracking-[0.4em]">core_features</span>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[1px] bg-slate-200 dark:bg-white/10 overflow-hidden border border-slate-200 dark:border-white/10 rounded-xl dark:rounded-none">
              {featureCards.map((f, i) => (
                <TiltCard key={i}>
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    className="bg-slate-50 dark:bg-black p-12 space-y-8 group cursor-default h-full relative overflow-hidden"
                  >
                    {/* Hover radial glow */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 pointer-events-none hidden dark:block"
                      style={{ background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
                    />
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 pointer-events-none dark:hidden"
                      style={{ background: "radial-gradient(circle at 30% 30%, rgba(0,0,0,0.03) 0%, transparent 70%)" }}
                    />
                    <motion.div
                      whileHover={{ rotate: 12, scale: 1.2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="relative z-10"
                    >
                      <f.icon className="w-6 h-6 text-slate-400 dark:text-zinc-600 group-hover:text-emerald-500 dark:group-hover:text-white transition-colors duration-300" />
                    </motion.div>
                    <div className="space-y-4 relative z-10">
                      <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-white transition-colors">{f.title}</h3>
                      <p className="text-slate-500 dark:text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                    <div className="pt-4 flex justify-between items-center relative z-10">
                      <div className="text-[10px] text-slate-400 dark:text-zinc-800 uppercase tracking-widest font-bold group-hover:text-emerald-500 dark:group-hover:text-zinc-500 transition-colors">0x0{i + 1}</div>
                      <motion.div
                        className="w-1.5 h-1.5 bg-slate-300 dark:bg-zinc-800 group-hover:bg-emerald-500 dark:group-hover:bg-white transition-colors"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }}
                      />
                    </div>
                  </motion.div>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── System Vitals ── */}
        <section className="py-24 px-6 bg-slate-50 dark:bg-[#050505] border-y border-slate-200 dark:border-white/5 transition-colors duration-300">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="space-y-8">
              <div className="text-[10px] uppercase tracking-[0.4em] text-slate-500 dark:text-zinc-600 font-bold">system_vitals</div>
              <h2 className="text-4xl font-bold uppercase tracking-tighter text-slate-900 dark:text-white">Platform Performance</h2>
              <div className="space-y-8">
                <DataBar value={99} label="auth_success_rate" delay={0} />
                <DataBar value={94} label="attendance_sync_accuracy" delay={200} />
                <DataBar value={100} label="vault_encryption_coverage" delay={400} />
                <DataBar value={97} label="ai_response_satisfaction" delay={600} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }} className="space-y-6">
              <div className="text-[10px] uppercase tracking-[0.4em] text-slate-500 dark:text-zinc-600 font-bold">smart_activity_log</div>
              <div className="border border-slate-200 dark:border-white/5 bg-white dark:bg-black p-6 font-mono text-[10px] space-y-2 rounded-xl dark:rounded-none shadow-sm dark:shadow-none">
                {[
                  { ts: "08:24:11", msg: "attendance sync completed — 3 classes", col: "text-emerald-600 dark:text-zinc-500 font-bold" },
                  { ts: "08:23:47", msg: "parent alert dispatched — 2 absences", col: "text-slate-600 dark:text-zinc-600" },
                  { ts: "08:22:30", msg: "exam locked by teacher_07", col: "text-slate-600 dark:text-zinc-600" },
                  { ts: "08:21:15", msg: "new scholar enrolled — school_id: 4f2a", col: "text-slate-600 dark:text-zinc-600" },
                  { ts: "08:20:02", msg: "vault backup completed — 0 errors", col: "text-slate-400 dark:text-zinc-700" },
                  { ts: "08:19:44", msg: "ai session started — persona: core", col: "text-slate-400 dark:text-zinc-700" },
                ].map((log, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex gap-4">
                    <span className="text-slate-400 dark:text-zinc-800 shrink-0 font-bold">{log.ts}</span>
                    <span className={log.col}>{log.msg}</span>
                  </motion.div>
                ))}
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.3 }} className="text-slate-400 dark:text-zinc-700 font-bold">
                  _ fetching_latest_
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Big Marquee ── */}
        <section className="py-12 border-y border-slate-200 dark:border-white/5 bg-white dark:bg-black overflow-hidden transition-colors duration-300">
          <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ repeat: Infinity, duration: 27.8, ease: "linear" }} className="flex gap-16 whitespace-nowrap">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="text-[4rem] md:text-[6rem] font-bold text-slate-100 dark:text-zinc-900 uppercase tracking-tighter shrink-0 hover:text-slate-200 dark:hover:text-zinc-700 transition-colors cursor-default">{item}</span>
            ))}
          </motion.div>
        </section>

        {/* ── Deployment Section ── */}
        <section ref={deployRef} className="py-40 px-6 bg-white dark:bg-black transition-colors duration-300">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="space-y-12">
              <div className="flex items-center gap-4 text-slate-500 dark:text-zinc-600 font-bold">
                <motion.div animate={{ width: ["48px", "96px", "48px"] }} transition={{ duration: 3.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-800" />
                <span className="text-[10px] uppercase tracking-[0.4em]">infrastructure</span>
              </div>
              <h2 className="text-5xl lg:text-7xl font-bold uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
                distributed <br /><span className="text-slate-400 dark:text-zinc-800">architecture.</span>
              </h2>
              <p className="text-slate-500 dark:text-zinc-500 text-lg leading-relaxed max-w-md font-medium">
                deploy isolated instances locally or through our cloud server. complete data sovereignty over your academic system.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/network">
                  <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" className="h-12 px-8 rounded-md dark:rounded-none border-slate-300 dark:border-white/20 text-[11px] uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all font-bold shadow-sm dark:shadow-none">
                      explore_schools
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </motion.div>

            {/* Animated Orbit */}
            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }} className="relative aspect-square border border-slate-200 dark:border-white/10 overflow-hidden flex items-center justify-center rounded-2xl dark:rounded-none bg-slate-50 dark:bg-transparent" style={{ background: "linear-gradient(135deg, rgba(100,116,139,0.05) 0%, transparent 100%)" }}>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000004_1px,transparent_1px),linear-gradient(to_bottom,#00000004_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:20px_20px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-black/80 via-transparent to-white/80 dark:to-black/80" />

              {/* Pulsing core */}
              <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ duration: 2.8, repeat: Infinity }} className="absolute w-24 h-24 bg-emerald-500 dark:bg-white/10 rounded-full blur-xl" />

              {/* Outer orbit */}
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 27.8, repeat: Infinity, ease: "linear" }} className="absolute w-[72%] h-[72%] border border-slate-300 dark:border-white/10 rounded-full">
                {[0, 90, 180, 270].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2.5 h-2.5 bg-slate-400 dark:bg-white"
                    style={{
                      top: i === 0 ? "-5px" : i === 2 ? "calc(100% - 5px)" : "calc(50% - 5px)",
                      left: i === 1 ? "calc(100% - 5px)" : i === 3 ? "-5px" : "calc(50% - 5px)",
                    }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.5, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.5 }}
                  />
                ))}
              </motion.div>

              {/* Inner orbit */}
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 17.8, repeat: Infinity, ease: "linear" }} className="absolute w-[42%] h-[42%] border border-slate-200 dark:border-white/5 rounded-full">
                <motion.div animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.4, 1] }} transition={{ duration: 1.3, repeat: Infinity }} className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-300 dark:bg-zinc-600 rounded-full" />
              </motion.div>

              <Cpu className="w-8 h-8 text-slate-900 dark:text-white opacity-20 dark:opacity-10 relative z-10" />

              {["server_01", "server_02", "server_03", "server_04"].map((n, i) => (
                <motion.div key={i} animate={{ opacity: [0.15, 0.8, 0.15] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.6 }} className={`absolute text-[8px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest font-bold ${i === 0 ? "top-4 left-4" : i === 1 ? "top-4 right-4" : i === 2 ? "bottom-4 left-4" : "bottom-4 right-4"}`}>
                  {n}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-40 px-6 bg-slate-50 dark:bg-[#050505] border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
          <div className="max-w-[1400px] mx-auto space-y-20">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} transition={{ duration: 0.4 }} className="flex items-center gap-4 text-slate-500 dark:text-zinc-600 font-bold">
              <motion.div animate={{ width: ["48px", "96px", "48px"] }} transition={{ duration: 3.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-800" />
              <span className="text-[10px] uppercase tracking-[0.4em]">deployment_sequence // how_it_works</span>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-slate-200 dark:bg-white/10 border border-slate-200 dark:border-white/10 overflow-hidden rounded-xl dark:rounded-none">
              {[
                { step: "01", title: "Create Account", desc: "Register your institution in under 5 minutes. Choose your plan, verify your domain, and initialize the system.", icon: "⬡" },
                { step: "02", title: "Import Data", desc: "Upload existing student rosters, faculty records, and timetables via CSV or invite users directly by email.", icon: "⬡" },
                { step: "03", title: "Assign Roles", desc: "Grant Director, Teacher, Student, and Parent access. Role-based permissions enforce data isolation automatically.", icon: "⬡" },
                { step: "04", title: "Go Live", desc: "The system activates. Attendance flows, AI responds, alerts dispatch. Real-time institutional intelligence begins.", icon: "⬡" },
              ].map((s, i) => (
                <TiltCard key={i}>
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                    className="bg-white dark:bg-black p-12 space-y-8 group cursor-default h-full relative overflow-hidden"
                  >
                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />
                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 30% 20%, rgba(0,0,0,0.02) 0%, transparent 70%)" }} />
                    <div className="flex justify-between items-start relative z-10">
                      <motion.div
                        animate={{ rotate: [0, 60, 120, 180, 240, 300, 360] }}
                        transition={{ duration: 7.8, repeat: Infinity, ease: "linear" }}
                        className="text-slate-200 dark:text-zinc-800 text-3xl font-bold group-hover:text-slate-300 dark:group-hover:text-zinc-700 transition-colors"
                      >
                        {s.icon}
                      </motion.div>
                      <motion.span animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.4 }} className="text-[8px] text-slate-400 dark:text-zinc-800 font-bold">{s.step}</motion.span>
                    </div>
                    <div className="space-y-3 relative z-10">
                      <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-white transition-colors">{s.title}</h3>
                      <p className="text-slate-500 dark:text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
                    </div>
                    {i < 3 && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:block">
                        <motion.div animate={{ opacity: [0.1, 0.5, 0.1] }} transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.3 }} className="w-px h-8 bg-slate-300 dark:bg-white/20" />
                      </div>
                    )}
                  </motion.div>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── Role Grid ── */}
        <section className="py-40 px-6 bg-white dark:bg-black transition-colors duration-300">
          <div className="max-w-[1400px] mx-auto space-y-20">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} className="flex items-center gap-4 text-slate-500 dark:text-zinc-600 font-bold">
              <motion.div animate={{ width: ["48px", "96px", "48px"] }} transition={{ duration: 3.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-800" />
              <span className="text-[10px] uppercase tracking-[0.4em]">user_roles // who_uses_lucy</span>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { role: "Director", id: "ROLE_01", desc: "Full institutional command. View all metrics, manage staff, and oversee every dimension of the school in one dashboard.", perks: ["full analytics", "staff management", "parent portal control", "audit logs", "ai console"] },
                { role: "Teacher", id: "ROLE_02", desc: "Take attendance, grade work, message parents, and access AI assistance — all from a streamlined teacher interface.", perks: ["attendance capture", "grade book", "exam locking", "ai subject assistant", "class analytics"] },
                { role: "Student", id: "ROLE_03", desc: "View personal record, track grades, communicate with teachers, and access AI-powered academic support instantly.", perks: ["grade tracking", "ai tutor access", "timetable view", "attendance history", "direct messaging"] },
                { role: "Parent", id: "ROLE_04", desc: "Real-time visibility into your child's academic performance, attendance, and teacher communications — with instant alerts.", perks: ["absence alerts", "grade reports", "teacher contact", "progress tracking", "event notifications"] },
              ].map((r, i) => (
                <TiltCard key={i} className="h-full">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ delay: i * 0.1 }}
                    className="border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black p-10 space-y-6 group cursor-default h-full relative overflow-hidden rounded-xl dark:rounded-none shadow-sm dark:shadow-none"
                  >
                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%)" }} />
                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 50% 0%, rgba(0,0,0,0.02) 0%, transparent 70%)" }} />
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <div className="text-[9px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest mb-1 font-bold">{r.id}</div>
                        <h3 className="text-2xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">{r.role}</h3>
                      </div>
                      <motion.div animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 2.3, repeat: Infinity, delay: i * 0.5 }} className="w-1.5 h-1.5 bg-emerald-500 dark:bg-white rounded-full" />
                    </div>
                    <p className="text-slate-500 dark:text-zinc-500 text-xs leading-relaxed relative z-10 font-medium">{r.desc}</p>
                    <div className="space-y-2 relative z-10">
                      {r.perks.map((p, j) => (
                        <motion.div key={j} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }} transition={{ delay: j * 0.05 }} className="flex gap-3 text-xs text-slate-500 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-400 transition-colors font-medium">
                          <span className="text-slate-900 dark:text-white shrink-0 font-bold">+</span>{p}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-40 px-6 bg-slate-50 dark:bg-[#050505] border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
          <div className="max-w-[1400px] mx-auto space-y-20">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} className="flex items-center gap-4 text-slate-500 dark:text-zinc-600 font-bold">
              <motion.div animate={{ width: ["48px", "96px", "48px"] }} transition={{ duration: 3.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-800" />
              <span className="text-[10px] uppercase tracking-[0.4em]">signal_feed // operator_reports</span>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { quote: "We went from 3 admin staff manually tracking attendance spreadsheets to zero. The system does it, alerts parents, and logs everything. Took us 3 days to deploy.", author: "T. Mokoena", role: "School Director, Western Cape", id: "OP_01" },
                { quote: "The AI actually understands the curriculum. My students get real answers to maths problems, not generic LLM responses. It knows the subject.", author: "L. Dlamini", role: "Grade 10 Teacher, Johannesburg", id: "OP_02" },
                { quote: "As a parent I get a notification the second my child is marked absent. Before LUCY, I'd find out at 6pm when they got home. That peace of mind is priceless.", author: "N. Osei", role: "Parent, Accra Campus", id: "OP_03" },
              ].map((t, i) => (
                <TiltCard key={i} className="h-full">
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ delay: i * 0.1 }}
                    className="p-10 border border-slate-200 dark:border-white/5 bg-white dark:bg-black space-y-8 h-full group cursor-default relative overflow-hidden rounded-xl dark:rounded-none shadow-sm dark:shadow-none"
                  >
                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />
                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 20% 30%, rgba(0,0,0,0.02) 0%, transparent 70%)" }} />
                    <div className="text-slate-200 dark:text-zinc-800 text-4xl font-bold leading-none select-none relative z-10">&ldquo;</div>
                    <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed relative z-10 font-medium">{t.quote}</p>
                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-1 relative z-10">
                      <div className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">{t.author}</div>
                      <div className="text-[9px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest font-bold">{t.role}</div>
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-zinc-900 overflow-hidden relative z-10 mt-6">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: false }} transition={{ duration: 1.3, delay: i * 0.1 }} className="h-full bg-slate-300 dark:bg-white/10" />
                    </div>
                  </motion.div>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing Teaser ── */}
        <section className="py-40 px-6 bg-white dark:bg-black border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
          <div className="max-w-[1400px] mx-auto space-y-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }} className="space-y-4">
                <div className="flex items-center gap-4 text-slate-500 dark:text-zinc-600 font-bold">
                  <motion.div animate={{ width: ["48px", "96px", "48px"] }} transition={{ duration: 3.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-800" />
                  <span className="text-[10px] uppercase tracking-[0.4em]">pricing_plans // coming_soon</span>
                </div>
                <h2 className="text-5xl font-bold uppercase tracking-tighter leading-none text-slate-900 dark:text-white">simple<br /><span className="text-slate-400 dark:text-zinc-800">pricing.</span></h2>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false }}>
                <Link href="/pricing">
                  <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                    <Button variant="outline" className="h-12 px-8 rounded-md dark:rounded-none border-slate-300 dark:border-white/20 text-[11px] uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all font-bold shadow-sm dark:shadow-none">
                      view_pricing
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { tier: "Pilot Plan", price: "Free", period: "up to 3 months", desc: "Full access for a single institution during your evaluation period. No credit card required.", features: ["1 institution", "up to 500 students", "all core features", "email support"], highlight: false },
                { tier: "Core Platform", price: "$149", period: "/ month", desc: "Production-grade deployment for full-scale institutional management and AI assistance.", features: ["unlimited students", "all roles + ai", "parent portal", "priority support", "99.9% uptime SLA"], highlight: true },
                { tier: "Enterprise", price: "Custom", period: "per institution", desc: "Multi-school networks, custom integrations, on-premise deployment, and dedicated account management.", features: ["unlimited schools", "custom integrations", "on-premise option", "dedicated manager", "99.99% SLA"], highlight: false },
              ].map((p, i) => (
                <TiltCard key={i} className="h-full">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative p-10 border h-full space-y-8 group cursor-default overflow-hidden transition-all duration-300 rounded-2xl dark:rounded-none ${p.highlight ? "border-emerald-500/30 dark:border-white/30 bg-emerald-50/50 dark:bg-zinc-950/60 shadow-lg shadow-emerald-500/5 dark:shadow-white/[0.01]" : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/30 hover:border-slate-300 dark:hover:border-white/20 shadow-sm dark:shadow-none"}`}
                  >
                    {p.highlight && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 dark:via-white/20 to-transparent" />}
                    
                    {/* Glowing radial pulse behind card for discount burst */}
                    {p.tier === "Core Platform" && (
                      <motion.div 
                        animate={{ opacity: [0.15, 0.35, 0.15] }} 
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} 
                        className="absolute inset-0 pointer-events-none hidden dark:block" 
                        style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)" }} 
                      />
                    )}
                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none hidden dark:block" style={{ background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%)" }} />
                    <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 pointer-events-none dark:hidden" style={{ background: "radial-gradient(circle at 50% 0%, rgba(0,0,0,0.03) 0%, transparent 70%)" }} />
                    
                    {/* Pulsing discount burst badge */}
                    {p.tier === "Core Platform" && (
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.08, 1],
                          boxShadow: ["0 0 0px rgba(0,0,0,0)", "0 0 10px rgba(16,185,129,0.2)", "0 0 0px rgba(0,0,0,0)"]
                        }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute top-4 right-4 bg-emerald-500 text-white dark:bg-white dark:text-black px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest border border-emerald-500 dark:border-white rounded-sm dark:rounded-none"
                      >
                        40%_discount
                      </motion.div>
                    )}

                    <div className="space-y-2 relative z-10">
                      <div className="text-[9px] text-slate-400 dark:text-zinc-400 uppercase tracking-widest font-bold">{p.highlight ? "recommended_plan" : `tier_${String(i + 1).padStart(2, "0")}`}</div>
                      <h3 className="text-2xl font-bold uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-zinc-300 transition-colors font-orbitron">{p.tier}</h3>
                    </div>
                    
                    <div className="flex items-end gap-2 relative z-10">
                      {p.tier === "Core Platform" ? (
                        <>
                          <span className="text-4xl font-bold text-slate-900 dark:text-white font-orbitron">{p.price}</span>
                          <span className="text-sm line-through text-slate-400 dark:text-zinc-500 mb-1">$250</span>
                        </>
                      ) : (
                        <span className="text-4xl font-bold text-slate-900 dark:text-white font-orbitron">{p.price}</span>
                      )}
                      <span className="text-slate-500 dark:text-zinc-400 text-xs mb-1.5 font-bold">{p.period}</span>
                    </div>
                    
                    <p className="text-slate-600 dark:text-zinc-300 text-xs leading-relaxed relative z-10 font-medium">{p.desc}</p>
                    
                    <div className="space-y-2 relative z-10 flex-1">
                      {p.features.map((f, j) => (
                        <motion.div key={j} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }} transition={{ delay: j * 0.05 }} className="flex gap-3 text-xs text-slate-600 dark:text-zinc-300 font-medium">
                          <span className="text-slate-400 dark:text-zinc-400 font-bold shrink-0">+</span>{f}
                        </motion.div>
                      ))}
                    </div>
                    
                    <div className="pt-6 relative z-10">
                      <Link href="/pricing" className="w-full">
                        <div className={`w-full h-11 border flex items-center justify-center text-[9px] uppercase tracking-[0.3em] font-bold transition-all duration-300 rounded-md dark:rounded-none ${p.highlight ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500 hover:text-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white dark:hover:text-black" : "border-slate-300 bg-white hover:bg-slate-900 hover:text-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:text-black dark:hover:bg-white"}`}>
                          price
                        </div>
                      </Link>
                    </div>
                  </motion.div>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── Signal Wall Preview ── */}
        <SignalWallPreview />

        {/* ── CTA ── */}
        <section className="py-40 px-6 border-t border-slate-200 dark:border-white/5 overflow-hidden relative bg-white dark:bg-black transition-colors duration-300">
          {[160, 80, 40].map((size, i) => (
            <motion.div key={i} animate={{ rotate: i % 2 === 0 ? 360 : -360 }} transition={{ duration: 59.8 + i * 20, repeat: Infinity, ease: "linear" }} className={`absolute -right-${size / 4} -bottom-${size / 4} border border-slate-200 dark:border-white/5 rounded-full pointer-events-none hidden dark:block`} style={{ width: size * 2, height: size * 2, right: -(size), bottom: -(size) }} />
          ))}
          <div className="max-w-3xl mx-auto text-center space-y-10 relative z-10">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.3 }} className="inline-block p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl dark:rounded-none shadow-sm dark:shadow-none text-slate-500 dark:text-white">
              <TerminalIcon className="w-6 h-6" />
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="text-4xl lg:text-6xl font-bold uppercase tracking-tighter text-slate-900 dark:text-white">
              initiate_connection
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-slate-500 dark:text-zinc-500 text-lg max-w-lg mx-auto leading-relaxed font-medium">
              your school account awaits setup. the lucy platform is standing by.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register">
                <motion.div whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}>
                  <Button className="h-14 px-12 bg-slate-900 text-white dark:text-black hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 rounded-md dark:rounded-none text-[11px] uppercase tracking-[0.2em] font-bold shadow-md dark:shadow-none transition-colors">
                    system_boot
                  </Button>
                </motion.div>
              </Link>
              <Link href="/contact">
                <motion.div whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="outline" className="h-14 px-12 rounded-md dark:rounded-none border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-[11px] uppercase tracking-[0.2em] hover:border-slate-400 hover:bg-slate-50 dark:hover:border-zinc-200 dark:border-white/50 dark:hover:bg-white/5 transition-all font-bold shadow-sm dark:shadow-none">
                    contact_us
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-slate-50 dark:bg-black border-t border-slate-200 dark:border-white/5 py-24 px-6 text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-600 transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white"><Cpu className="w-4 h-4" /><span className="font-bold tracking-tighter">lucy_os</span></div>
            <p className="leading-relaxed font-bold">distributed intelligence for institutional coordination.</p>
          </div>
          <div className="space-y-4">
            <div className="text-slate-900 dark:text-white font-bold">platform</div>
            <ul className="space-y-2 font-bold">
              {[{ href: "/about", l: "about" }, { href: "/features", l: "features" }, { href: "/pricing", l: "pricing" }, { href: "/security", l: "vault" }, { href: "/demo", l: "demo" }, { href: "/schools", l: "for schools" }].map(i => (
                <li key={i.href}><Link href={i.href} className="hover:text-slate-900 dark:hover:text-white transition-colors">{i.l}</Link></li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="text-slate-900 dark:text-white font-bold">schools</div>
            <ul className="space-y-2 font-bold">
              {[{ href: "/intelligence", l: "intelligence" }, { href: "/network", l: "network" }, { href: "/docs", l: "docs" }, { href: "/status", l: "status" }, { href: "/changelog", l: "changelog" }, { href: "/roadmap", l: "roadmap" }].map(i => (
                <li key={i.href}><Link href={i.href} className="hover:text-slate-900 dark:hover:text-white transition-colors">{i.l}</Link></li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="text-slate-900 dark:text-white font-bold">company</div>
            <ul className="space-y-2 font-bold">
              {companyLinks.map(i => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    className="hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {i.l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="text-slate-900 dark:text-white font-bold">legal</div>
            <ul className="space-y-2 font-bold">
              {[{ href: "/privacy", l: "privacy" }, { href: "/terms", l: "terms" }, { href: "/compliance", l: "compliance" }].map(i => (
                <li key={i.href}><Link href={i.href} className="hover:text-slate-900 dark:hover:text-white transition-colors">{i.l}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto mt-24 pt-12 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] text-slate-400 dark:text-zinc-800 font-bold">
          <p>© 2026 LUCY_SYS // ALL DATA ENCRYPTED</p>
          <motion.p animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 2.8 }}>server_id: lucy-47-x-beta // uptime: nominal</motion.p>
        </div>
      </footer>
      <PromoPopup />
    </div>
  );
}
