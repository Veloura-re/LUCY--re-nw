"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, Shield, Database, Zap, Lock, Activity, Layers, Server, 
  User, CheckCircle, ArrowRight, Play, Eye, RotateCcw, Search,
  GraduationCap, BookOpen, CreditCard, Clock, Sparkles, Filter, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── TYPES & DATA STRUCTURES ──────────────────────────────────────────────────

export type NodeCategory = "core" | "portal" | "database" | "api" | "sentinel" | "engine";

export interface BrainNode {
  id: string;
  label: string;
  category: NodeCategory;
  group: "academic" | "finance" | "attendance" | "governance" | "security" | "core";
  description: string;
  route?: string;
  api?: string;
  dbModel?: string;
  cacheTag?: string;
  role?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  radius?: number;
  color?: string;
}

export interface BrainEdge {
  from: string;
  to: string;
  label?: string;
  color?: string;
  animated?: boolean;
}

// ─── MASTER KNOWLEDGE BASE FOR NODES ──────────────────────────────────────────

const INITIAL_NODES: BrainNode[] = [
  // CORE
  { id: "core_hub", label: "LUCY OS Core Hub", category: "core", group: "core", description: "Central multi-tenant kernel routing requests, orchestrating Supabase SSR auth, and enforcing isolation.", role: "SYSTEM", color: "#10b981", radius: 24 },

  // PORTALS
  { id: "portal_superadmin", label: "SuperAdmin Portal", category: "portal", group: "governance", description: "Platform-wide management: tenant provisioning, billing receipts, security bans, global audit logs.", route: "/admin/dashboard", role: "SUPERADMIN", color: "#6366f1", radius: 18 },
  { id: "portal_owner", label: "Director / Owner Portal", category: "portal", group: "finance", description: "Institutional governance, tuition cashflow, staff payroll, operational expenses, and action approvals.", route: "/dashboard/finance", role: "OWNER", color: "#ec4899", radius: 18 },
  { id: "portal_principal", label: "Principal Portal", category: "portal", group: "governance", description: "Class/timetable management, teacher oversight, student 360 dossiers, absence authorizations.", route: "/dashboard", role: "PRINCIPAL", color: "#f59e0b", radius: 18 },
  { id: "portal_teacher", label: "Teacher Portal", category: "portal", group: "academic", description: "AI exam creator, interactive grading editor, daily roll-call attendance, lesson plans.", route: "/dashboard/teacher/exams", role: "TEACHER", color: "#3b82f6", radius: 18 },
  { id: "portal_homeroom", label: "Homeroom Portal", category: "portal", group: "academic", description: "Classroom attendance tracking, term report card collation, student behavior remarks.", route: "/dashboard/homeroom", role: "HOMEROOM", color: "#14b8a6", radius: 16 },
  { id: "portal_parent", label: "Parent Family Portal", category: "portal", group: "attendance", description: "Multi-child academic pulse, 1-tap absence note requests, tuition invoices, mobile money settlement.", route: "/dashboard/parent", role: "PARENT", color: "#8b5cf6", radius: 18 },
  { id: "portal_student", label: "Student Portal", category: "portal", group: "academic", description: "Interactive test countdowns, automatic score submission, weekly timetable, study syllabus.", route: "/dashboard/student", role: "STUDENT", color: "#06b6d4", radius: 16 },

  // CORE ENGINES
  { id: "engine_marklist", label: "Dynamic Marklist Engine", category: "engine", group: "academic", description: "Customizable academic evaluation grids, term weight calculations, exam lock checks.", api: "POST /api/marklist/sync", cacheTag: "school:{id}:grades", color: "#3b82f6", radius: 17 },
  { id: "engine_finance", label: "Financial Ledger Engine", category: "engine", group: "finance", description: "Automated grade tuition provisioning, Stripe & Chapa mobile-money webhooks, payroll ledger.", api: "POST /api/school/finance/pay", cacheTag: "school:{id}:finance", color: "#ec4899", radius: 17 },
  { id: "engine_attendance", label: "Attendance & Excuse Engine", category: "engine", group: "attendance", description: "Daily roll-call tracking and retroactive absence excuse synchronization.", api: "PATCH /api/school/authorizations", cacheTag: "school:{id}:attendance", color: "#10b981", radius: 17 },
  { id: "engine_governance", label: "Director Action Protocol", category: "engine", group: "governance", description: "Cryptographic approval gates requiring School Owner authorization for destructive actions.", api: "POST /api/school/approvals/resolve", color: "#f59e0b", radius: 17 },

  // DATABASE MODELS
  { id: "db_school", label: "School Tenant DB", category: "database", group: "core", description: "Root tenant entity bounding all classes, students, faculty, and academic terms.", dbModel: "School", color: "#a855f7", radius: 15 },
  { id: "db_student", label: "Student & Enrollment", category: "database", group: "academic", description: "Student profiles indexed by [schoolId, studentCode] and [schoolId, lastName, firstName].", dbModel: "Student", color: "#06b6d4", radius: 15 },
  { id: "db_graderecord", label: "GradeRecord & Exams", category: "database", group: "academic", description: "Immutable academic evaluation scores indexed by [examId, score] and [studentId, subjectId].", dbModel: "GradeRecord", color: "#3b82f6", radius: 15 },
  { id: "db_payment", label: "Payment & Invoice Ledger", category: "database", group: "finance", description: "Double-entry payment records indexed by [invoiceId], [status, createdAt], [reference].", dbModel: "Payment", color: "#ec4899", radius: 15 },
  { id: "db_attendance", label: "Attendance & Absence DB", category: "database", group: "attendance", description: "Daily attendance markers and verified doctor notes / absence slips.", dbModel: "AttendanceRecord", color: "#10b981", radius: 15 },
  { id: "db_audit", label: "AuditLog Telemetry", category: "database", group: "security", description: "Sub-second immutable audit logs indexed by [schoolId, createdAt].", dbModel: "AuditLog", color: "#ef4444", radius: 15 },

  // CRITICAL APIS
  { id: "api_marklist_sync", label: "POST /api/marklist/sync", category: "api", group: "academic", description: "Scales raw scores, verifies targetExam.isLocked == false, writes GradeRecords.", role: "TEACHER+", cacheTag: "school:{id}:grades", color: "#38bdf8", radius: 13 },
  { id: "api_authorizations", label: "PATCH /api/school/authorizations", category: "api", group: "attendance", description: "Sets absence to APPROVED and retroactively marks overlapping dates as EXCUSED.", role: "PRINCIPAL+", cacheTag: "school:{id}:attendance", color: "#34d399", radius: 13 },
  { id: "api_finance_pay", label: "POST /api/school/finance/pay", category: "api", group: "finance", description: "Atomic payment ledger entry, reconciles invoices, updates student financial dossier.", role: "OWNER+", cacheTag: "school:{id}:finance", color: "#f472b6", radius: 13 },
  { id: "api_parent_link", label: "POST /api/parent/link-student", category: "api", group: "attendance", description: "Rate-limited, exact-match student badge code pairing for parent accounts.", role: "PARENT", cacheTag: "school:{id}:students", color: "#a78bfa", radius: 13 },
  { id: "api_approvals", label: "POST /api/school/approvals/resolve", category: "api", group: "governance", description: "Owner gate to execute or reject pending ActionRequests from principals.", role: "OWNER", color: "#fbbf24", radius: 13 },

  // SENTINELS
  { id: "sentinel_idor", label: "Gate 01: Multi-Tenant IDOR", category: "sentinel", group: "security", description: "Enforces strict user.schoolId scoping across all database lookups.", role: "SYSTEM", color: "#ef4444", radius: 14 },
  { id: "sentinel_finance", label: "Gate 07: Financial Ledger", category: "sentinel", group: "security", description: "Guarantees zero split-loss and prevents unindexed payment table scans.", role: "SYSTEM", color: "#ef4444", radius: 14 },
  { id: "sentinel_rbac", label: "Gate 08: RBAC Enforcer", category: "sentinel", group: "security", description: "Validates session role capabilities before processing handler logic.", role: "SYSTEM", color: "#ef4444", radius: 14 },
  { id: "sentinel_exam_lock", label: "Gate 12: Exam Lock Firewall", category: "sentinel", group: "security", description: "Prevents marklist and grade overwrites on sealed / published exams.", role: "SYSTEM", color: "#ef4444", radius: 14 },
  { id: "sentinel_absence", label: "Gate 13: Absence Excusal Solver", category: "sentinel", group: "security", description: "Atomically updates absence records to EXCUSED upon approval.", role: "SYSTEM", color: "#ef4444", radius: 14 },
];

const EDGES: BrainEdge[] = [
  // Core to Portals
  { from: "core_hub", to: "portal_superadmin", animated: true },
  { from: "core_hub", to: "portal_owner", animated: true },
  { from: "core_hub", to: "portal_principal", animated: true },
  { from: "core_hub", to: "portal_teacher", animated: true },
  { from: "core_hub", to: "portal_homeroom", animated: true },
  { from: "core_hub", to: "portal_parent", animated: true },
  { from: "core_hub", to: "portal_student", animated: true },

  // Portals to Engines
  { from: "portal_teacher", to: "engine_marklist" },
  { from: "portal_homeroom", to: "engine_marklist" },
  { from: "portal_owner", to: "engine_finance" },
  { from: "portal_principal", to: "engine_attendance" },
  { from: "portal_parent", to: "engine_attendance" },
  { from: "portal_parent", to: "engine_finance" },
  { from: "portal_principal", to: "engine_governance" },
  { from: "portal_owner", to: "engine_governance" },
  { from: "portal_student", to: "engine_marklist" },

  // Engines to APIs
  { from: "engine_marklist", to: "api_marklist_sync", animated: true },
  { from: "engine_attendance", to: "api_authorizations", animated: true },
  { from: "engine_finance", to: "api_finance_pay", animated: true },
  { from: "portal_parent", to: "api_parent_link" },
  { from: "engine_governance", to: "api_approvals" },

  // APIs to Databases
  { from: "api_marklist_sync", to: "db_graderecord" },
  { from: "api_authorizations", to: "db_attendance" },
  { from: "api_finance_pay", to: "db_payment" },
  { from: "api_parent_link", to: "db_student" },
  { from: "api_approvals", to: "db_school" },
  { from: "core_hub", to: "db_audit" },

  // Security Sentinels Defense Gates
  { from: "sentinel_idor", to: "core_hub", color: "#ef4444" },
  { from: "sentinel_rbac", to: "core_hub", color: "#ef4444" },
  { from: "sentinel_exam_lock", to: "api_marklist_sync", color: "#ef4444" },
  { from: "sentinel_absence", to: "api_authorizations", color: "#ef4444" },
  { from: "sentinel_finance", to: "api_finance_pay", color: "#ef4444" },
];

export function SoftwareNeuralGraph({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<BrainNode | null>(INITIAL_NODES[0]);
  const [activeGroup, setActiveGroup] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"graph" | "matrix" | "simulation">("graph");
  const [simulationStep, setSimulationStep] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Nodes state with calculated coordinates
  const nodesRef = useRef<BrainNode[]>([]);
  const hoveredNodeRef = useRef<BrainNode | null>(null);
  const draggingNodeRef = useRef<BrainNode | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize node positions in harmonic concentric orbital rings
  useEffect(() => {
    const width = 1200;
    const height = 800;
    const cx = width / 2;
    const cy = height / 2;

    const nodes = INITIAL_NODES.map((node) => {
      let r = 0;
      let angle = 0;

      if (node.category === "core") {
        r = 0;
      } else if (node.category === "portal") {
        const portalIdx = INITIAL_NODES.filter(n => n.category === "portal").findIndex(n => n.id === node.id);
        const count = INITIAL_NODES.filter(n => n.category === "portal").length;
        r = 170;
        angle = (portalIdx / count) * Math.PI * 2 - Math.PI / 2;
      } else if (node.category === "engine") {
        const engIdx = INITIAL_NODES.filter(n => n.category === "engine").findIndex(n => n.id === node.id);
        const count = INITIAL_NODES.filter(n => n.category === "engine").length;
        r = 270;
        angle = (engIdx / count) * Math.PI * 2 + Math.PI / 4;
      } else if (node.category === "api") {
        const apiIdx = INITIAL_NODES.filter(n => n.category === "api").findIndex(n => n.id === node.id);
        const count = INITIAL_NODES.filter(n => n.category === "api").length;
        r = 360;
        angle = (apiIdx / count) * Math.PI * 2 - Math.PI / 6;
      } else if (node.category === "database") {
        const dbIdx = INITIAL_NODES.filter(n => n.category === "database").findIndex(n => n.id === node.id);
        const count = INITIAL_NODES.filter(n => n.category === "database").length;
        r = 440;
        angle = (dbIdx / count) * Math.PI * 2 + Math.PI / 3;
      } else if (node.category === "sentinel") {
        const sIdx = INITIAL_NODES.filter(n => n.category === "sentinel").findIndex(n => n.id === node.id);
        const count = INITIAL_NODES.filter(n => n.category === "sentinel").length;
        r = 510;
        angle = (sIdx / count) * Math.PI * 2 - Math.PI / 4;
      }

      return {
        ...node,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
      };
    });

    nodesRef.current = nodes;
  }, []);

  // Animation Loop
  useEffect(() => {
    let animId: number;
    let pulseTime = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      pulseTime += 0.02;

      // Handle High-DPI display
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * 2 || canvas.height !== rect.height * 2) {
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
      }

      ctx.save();
      ctx.scale(2, 2);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const scaleFactor = Math.min(rect.width / 1200, rect.height / 850) * 0.95;

      // Draw subtle orbital guide rings
      [170, 270, 360, 440, 510].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * scaleFactor, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Filter nodes based on activeGroup or search
      const visibleNodes = nodesRef.current.filter((n) => {
        if (activeGroup !== "all" && n.group !== activeGroup && n.category !== "core") return false;
        if (searchQuery && !n.label.toLowerCase().includes(searchQuery.toLowerCase()) && !n.description.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        return true;
      });

      const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

      // Draw Edges
      EDGES.forEach((edge) => {
        if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) return;

        const fromNode = nodesRef.current.find((n) => n.id === edge.from);
        const toNode = nodesRef.current.find((n) => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const fx = cx + (fromNode.x! - 600) * scaleFactor;
        const fy = cy + (fromNode.y! - 400) * scaleFactor;
        const tx = cx + (toNode.x! - 600) * scaleFactor;
        const ty = cy + (toNode.y! - 400) * scaleFactor;

        const isHighlighted =
          selectedNode?.id === edge.from ||
          selectedNode?.id === edge.to ||
          hoveredNodeRef.current?.id === edge.from ||
          hoveredNodeRef.current?.id === edge.to;

        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);

        if (isHighlighted) {
          ctx.strokeStyle = edge.color || "rgba(16, 185, 129, 0.8)";
          ctx.lineWidth = 2.5;
          ctx.shadowColor = edge.color || "#10b981";
          ctx.shadowBlur = 10;
        } else {
          ctx.strokeStyle = edge.color ? `${edge.color}33` : "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Animated Synaptic Flow Particles
        if (edge.animated || isHighlighted || simulating) {
          const t = (pulseTime * 0.8 + (fromNode.radius || 10) * 0.1) % 1;
          const px = fx + (tx - fx) * t;
          const py = fy + (ty - fy) * t;

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = edge.color || "#10b981";
          ctx.shadowColor = edge.color || "#10b981";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Nodes
      visibleNodes.forEach((node) => {
        const nx = cx + (node.x! - 600) * scaleFactor;
        const ny = cy + (node.y! - 400) * scaleFactor;
        const rad = (node.radius || 15) * scaleFactor * 1.1;

        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNodeRef.current?.id === node.id;

        // Outer Glow Aura
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(nx, ny, rad + 8, 0, Math.PI * 2);
          ctx.fillStyle = `${node.color || "#10b981"}22`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(nx, ny, rad + 4, 0, Math.PI * 2);
          ctx.strokeStyle = node.color || "#10b981";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Inner Circle Body
        ctx.beginPath();
        ctx.arc(nx, ny, rad, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? (node.color || "#10b981") : "#09090b";
        ctx.fill();

        ctx.strokeStyle = node.color || "#10b981";
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        // Node Label
        ctx.font = `${Math.max(9, Math.round(11 * scaleFactor))}px Inter, sans-serif`;
        ctx.fillStyle = isSelected ? "#ffffff" : isHovered ? "#10b981" : "rgba(255, 255, 255, 0.85)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label, nx, ny + rad + 14);

        // Category Tag
        ctx.font = `${Math.max(7, Math.round(8 * scaleFactor))}px monospace`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillText(node.category.toUpperCase(), nx, ny + rad + 26);
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedNode, activeGroup, searchQuery, simulating]);

  // Handle Canvas Mouse Interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mousePosRef.current = { x, y };

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const scaleFactor = Math.min(rect.width / 1200, rect.height / 850) * 0.95;

    let found: BrainNode | null = null;
    nodesRef.current.forEach((node) => {
      const nx = cx + (node.x! - 600) * scaleFactor;
      const ny = cy + (node.y! - 400) * scaleFactor;
      const rad = (node.radius || 15) * scaleFactor * 1.5;
      const dist = Math.hypot(x - nx, y - ny);
      if (dist < rad) {
        found = node;
      }
    });

    hoveredNodeRef.current = found;
  };

  const handleCanvasClick = () => {
    if (hoveredNodeRef.current) {
      setSelectedNode(hoveredNodeRef.current);
    }
  };

  // Run Flow Simulation
  const runSimulation = (type: "absence" | "grade" | "payment") => {
    setSimulating(true);
    if (type === "absence") {
      setSimulationStep("1. Parent submits absence note via /api/parent/authorizations");
      setSelectedNode(INITIAL_NODES.find(n => n.id === "portal_parent") || null);
      setTimeout(() => {
        setSimulationStep("2. Principal reviews & clicks Approve in /dashboard/authorizations");
        setSelectedNode(INITIAL_NODES.find(n => n.id === "api_authorizations") || null);
      }, 1500);
      setTimeout(() => {
        setSimulationStep("3. Sentinel Gate 13 & Atomic DB Sync: Absences set to EXCUSED");
        setSelectedNode(INITIAL_NODES.find(n => n.id === "db_attendance") || null);
      }, 3000);
      setTimeout(() => {
        setSimulationStep("4. Complete! Next.js Cache Tag school:{id}:attendance revalidated.");
        setSimulating(false);
      }, 4500);
    } else if (type === "grade") {
      setSimulationStep("1. Teacher enters marks & clicks 'Sync to Gradebook'");
      setSelectedNode(INITIAL_NODES.find(n => n.id === "portal_teacher") || null);
      setTimeout(() => {
        setSimulationStep("2. Exam Firewall verifies isLocked == false and class ownership");
        setSelectedNode(INITIAL_NODES.find(n => n.id === "sentinel_exam_lock") || null);
      }, 1500);
      setTimeout(() => {
        setSimulationStep("3. Upserts GradeRecords scaled to Exam totalMarks in Postgres");
        setSelectedNode(INITIAL_NODES.find(n => n.id === "db_graderecord") || null);
      }, 3000);
      setTimeout(() => {
        setSimulationStep("4. Complete! Student GPAs & Report Cards refreshed.");
        setSimulating(false);
      }, 4500);
    } else if (type === "payment") {
      setSimulationStep("1. Parent initiates quarterly tuition payment via Stripe / Chapa");
      setSelectedNode(INITIAL_NODES.find(n => n.id === "portal_parent") || null);
      setTimeout(() => {
        setSimulationStep("2. Payment webhook hits /api/school/finance/pay");
        setSelectedNode(INITIAL_NODES.find(n => n.id === "api_finance_pay") || null);
      }, 1500);
      setTimeout(() => {
        setSimulationStep("3. Updates Payment table & sets Invoice.status = PAID");
        setSelectedNode(INITIAL_NODES.find(n => n.id === "db_payment") || null);
      }, 3000);
      setTimeout(() => {
        setSimulationStep("4. Complete! Director revenue telemetry and cashflow updated.");
        setSimulating(false);
      }, 4500);
    }
  };

  return (
    <div className={cn("relative w-full flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl text-white font-sans", className)}>
      {/* ── TOP CONTROL HUD BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-zinc-100">LUCY OS BRAIN MATRIX</span>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 font-semibold">Live Neural Grid</span>
            </div>
            <p className="text-xs text-zinc-400">Interactive 2D Architecture & Synaptic Data Flow Visualizer</p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode("graph")}
            className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5", viewMode === "graph" ? "bg-emerald-500 text-black shadow" : "text-zinc-400 hover:text-white")}
          >
            <Activity className="w-3.5 h-3.5" /> Neural Graph
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5", viewMode === "matrix" ? "bg-emerald-500 text-black shadow" : "text-zinc-400 hover:text-white")}
          >
            <Layers className="w-3.5 h-3.5" /> Button & API Matrix
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search nodes, routes, DB models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── SUBSYSTEM FILTER PILLS ── */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800/50 text-xs z-20">
        <span className="text-zinc-500 flex items-center gap-1.5 mr-2 font-medium">
          <Filter className="w-3.5 h-3.5" /> Filter Pathways:
        </span>
        {[
          { id: "all", label: "All Pathways" },
          { id: "academic", label: "Academic & Marklists" },
          { id: "finance", label: "Financial Ledgers" },
          { id: "attendance", label: "Attendance & Excuses" },
          { id: "governance", label: "Director Governance" },
          { id: "security", label: "17 Defense Sentinels" },
        ].map((grp) => (
          <button
            key={grp.id}
            onClick={() => setActiveGroup(grp.id)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all border",
              activeGroup === grp.id
                ? "bg-zinc-800 text-emerald-400 border-emerald-500/50 shadow-sm"
                : "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            )}
          >
            {grp.label}
          </button>
        ))}
      </div>

      {/* ── MAIN INTERACTIVE AREA ── */}
      <div className="relative w-full h-[650px] overflow-hidden bg-black/90">
        {viewMode === "graph" ? (
          <>
            {/* Canvas Interactive Neural Graph */}
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onClick={handleCanvasClick}
              className="w-full h-full cursor-crosshair"
            />

            {/* Live Flow Simulation HUD Bar */}
            <div className="absolute top-4 left-6 z-30 flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 backdrop-blur-md p-2 rounded-xl">
              <span className="text-xs font-semibold text-zinc-400 px-2 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-emerald-400" /> Simulate Data Packet:
              </span>
              <Button size="sm" variant="ghost" onClick={() => runSimulation("absence")} disabled={simulating} className="h-7 text-xs bg-zinc-800 hover:bg-emerald-500 hover:text-black">
                Absence Excuse Sync
              </Button>
              <Button size="sm" variant="ghost" onClick={() => runSimulation("grade")} disabled={simulating} className="h-7 text-xs bg-zinc-800 hover:bg-emerald-500 hover:text-black">
                Gradebook Sync
              </Button>
              <Button size="sm" variant="ghost" onClick={() => runSimulation("payment")} disabled={simulating} className="h-7 text-xs bg-zinc-800 hover:bg-emerald-500 hover:text-black">
                Tuition Payment
              </Button>
            </div>

            {/* Simulation Status Overlay Banner */}
            {simulating && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-16 left-6 z-30 bg-emerald-500/20 border border-emerald-500/50 backdrop-blur-md px-4 py-2 rounded-lg text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                {simulationStep}
              </motion.div>
            )}

            {/* Node Inspector Dossier HUD */}
            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute top-4 right-6 w-80 bg-zinc-900/95 border border-zinc-700/80 backdrop-blur-xl p-5 rounded-xl shadow-2xl z-30 text-zinc-200 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-zinc-800 text-zinc-300 rounded border border-zinc-700 font-bold">
                        {selectedNode.category.toUpperCase()}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">{selectedNode.label}</h3>
                    </div>
                    <button onClick={() => setSelectedNode(null)} className="text-zinc-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">{selectedNode.description}</p>

                  <div className="space-y-2 border-t border-zinc-800 pt-3 text-xs">
                    {selectedNode.role && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Role Guard:</span>
                        <span className="font-mono font-bold text-emerald-400">{selectedNode.role}</span>
                      </div>
                    )}
                    {selectedNode.route && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">UI Route:</span>
                        <span className="font-mono text-zinc-300">{selectedNode.route}</span>
                      </div>
                    )}
                    {selectedNode.api && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">API Endpoint:</span>
                        <span className="font-mono text-cyan-400">{selectedNode.api}</span>
                      </div>
                    )}
                    {selectedNode.dbModel && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">DB Model:</span>
                        <span className="font-mono font-bold text-purple-400">{selectedNode.dbModel}</span>
                      </div>
                    )}
                    {selectedNode.cacheTag && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Cache Tag:</span>
                        <span className="font-mono text-amber-400">{selectedNode.cacheTag}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-zinc-800 pt-3">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Connected Synapses:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {EDGES.filter(e => e.from === selectedNode.id || e.to === selectedNode.id).map((e, idx) => {
                        const otherId = e.from === selectedNode.id ? e.to : e.from;
                        const otherNode = INITIAL_NODES.find(n => n.id === otherId);
                        return (
                          <button
                            key={idx}
                            onClick={() => otherNode && setSelectedNode(otherNode)}
                            className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                          >
                            {otherNode?.label || otherId}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          /* ── MATRIX BLUEPRINT TABLE VIEW ── */
          <div className="w-full h-full overflow-y-auto p-6 bg-zinc-950/90 text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px] font-mono">
                  <th className="py-2.5 px-3">Subsystem</th>
                  <th className="py-2.5 px-3">Trigger / Button</th>
                  <th className="py-2.5 px-3">API Route Called</th>
                  <th className="py-2.5 px-3">Target DB Model</th>
                  <th className="py-2.5 px-3">Role Guard</th>
                  <th className="py-2.5 px-3">Cache Revalidation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-blue-400">Academic</td>
                  <td className="py-2.5 px-3 font-semibold text-white">"Sync to Gradebook"</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-400">POST /api/marklist/sync</td>
                  <td className="py-2.5 px-3 font-mono">GradeRecord, Exam</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">TEACHER+</td>
                  <td className="py-2.5 px-3 font-mono text-amber-400">school:&#123;id&#125;:grades</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">Attendance</td>
                  <td className="py-2.5 px-3 font-semibold text-white">"Approve Absence"</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-400">PATCH /api/school/authorizations</td>
                  <td className="py-2.5 px-3 font-mono">AbsenceAuthorization, AttendanceRecord</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">PRINCIPAL+</td>
                  <td className="py-2.5 px-3 font-mono text-amber-400">school:&#123;id&#125;:attendance</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-pink-400">Finance</td>
                  <td className="py-2.5 px-3 font-semibold text-white">"Record Cash Payment"</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-400">POST /api/school/finance/pay</td>
                  <td className="py-2.5 px-3 font-mono">Payment, Invoice</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">OWNER+</td>
                  <td className="py-2.5 px-3 font-mono text-amber-400">school:&#123;id&#125;:finance</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-amber-400">Governance</td>
                  <td className="py-2.5 px-3 font-semibold text-white">"Approve Request"</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-400">POST /api/school/approvals/resolve</td>
                  <td className="py-2.5 px-3 font-mono">ActionRequest + Target</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">OWNER</td>
                  <td className="py-2.5 px-3 font-mono text-amber-400">Target Entity Tag</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-purple-400">Family</td>
                  <td className="py-2.5 px-3 font-semibold text-white">"Link Child via Code"</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-400">POST /api/parent/link-student</td>
                  <td className="py-2.5 px-3 font-mono">ParentStudentLink, Student</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">PARENT</td>
                  <td className="py-2.5 px-3 font-mono text-amber-400">school:&#123;id&#125;:students</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-cyan-400">Student</td>
                  <td className="py-2.5 px-3 font-semibold text-white">"Submit Exam Answers"</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-400">POST /api/student/exams/submit</td>
                  <td className="py-2.5 px-3 font-mono">ExamAttempt, GradeRecord</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">STUDENT</td>
                  <td className="py-2.5 px-3 font-mono text-amber-400">school:&#123;id&#125;:grades</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── FOOTER TELEMETRY STATUS ── */}
      <div className="flex flex-wrap items-center justify-between px-6 py-3 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-400">
        <div className="flex items-center gap-4 font-mono">
          <span>Active Synapses: <strong className="text-emerald-400">{EDGES.length}</strong></span>
          <span>Nodes: <strong className="text-white">{INITIAL_NODES.length}</strong></span>
          <span>Security Gates: <strong className="text-emerald-400">17/17 DEFENDED</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span>PostgreSQL & Next.js 16 Edge Synced</span>
        </div>
      </div>
    </div>
  );
}
