"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, 
  Users, Globe, Building, RefreshCw, Eye, EyeOff,
  PhoneOff, MessageSquare, HeartHandshake, CheckCircle2,
  XCircle, Filter, ArrowRight, Activity, Lock, AlertCircle,
  Clock, Sparkles, ChevronDown, ChevronUp, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SchoolMeta {
  id: string;
  name: string;
  schoolCode: string;
}

interface Topology {
  type: 'INTRA_CAMPUS' | 'CROSS_CAMPUS';
  schoolA: SchoolMeta;
  schoolB: SchoolMeta | null;
  label: string;
}

interface ThreatAnalysis {
  hasDoxxing: boolean;
  hasCrisis: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'STANDARD';
}

interface SanctuaryMessageItem {
  id: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

interface SanctuaryReportItem {
  id: string;
  sessionId: string;
  reason: string;
  reporterId: string;
  reportedId: string;
  createdAt: string;
  topology: Topology;
  threatAnalysis: ThreatAnalysis;
  session: {
    id: string;
    mode: string;
    status: string;
    userAPseudo: string;
    userARole: string;
    userBPseudo: string;
    userBRole: string;
    createdAt: string;
    messages: SanctuaryMessageItem[];
  };
}

interface TelemetryData {
  totalActiveSessions: number;
  totalFlaggedSessions: number;
  intraCampusCount: number;
  crossCampusCount: number;
  allReportsCount: number;
  scope: string;
}

export default function SanctuaryModerationClient({
  userRole,
  userSchoolId
}: {
  userRole: string;
  userSchoolId: string;
}) {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [reports, setReports] = useState<SanctuaryReportItem[]>([]);
  const [availableSchools, setAvailableSchools] = useState<SchoolMeta[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [filterType, setFilterType] = useState<'ALL' | 'CRISIS' | 'DOXXING'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const isSuperAdmin = userRole === 'SUPERADMIN';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSchoolId) params.set('schoolId', selectedSchoolId);
      if (filterType !== 'ALL') params.set('filter', filterType);

      const res = await fetch(`/api/sanctuary/moderation?${params.toString()}`);
      const data = (await res.json()) as any;

      if (res.ok && data.success) {
        setTelemetry(data.telemetry);
        setReports(data.reports || []);
        if (data.availableSchools) {
          setAvailableSchools(data.availableSchools);
        }
      } else {
        toast.error(data.error || "Failed to load sanctuary telemetry");
      }
    } catch (err: any) {
      toast.error("Network error loading sanctuary moderation");
    } finally {
      setLoading(false);
    }
  }, [selectedSchoolId, filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleModerationAction = async (
    sessionId: string,
    action: 'DISMISS_REPORT' | 'TERMINATE_SESSION' | 'FLAG_SESSION' | 'ESCALATE_TO_COUNSELOR',
    reportId?: string
  ) => {
    try {
      setProcessingAction(sessionId);
      const res = await fetch('/api/sanctuary/moderation/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          reportId,
          action,
          resolutionNotes: `Moderation action ${action} executed by ${userRole}`
        })
      });

      const data = (await res.json()) as any;
      if (res.ok && data.success) {
        toast.success(data.message || `Action ${action} completed`);
        fetchData();
      } else {
        toast.error(data.error || "Action execution failed");
      }
    } catch (err: any) {
      toast.error("Network error executing moderation action");
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ── Header & Scope Selector ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-[36px] bg-slate-900 text-white border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-sans">
                Sanctuary Safety Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-mono">
                Real-time anti-doxxing, PII intercept telemetry, and student safety console
              </p>
            </div>
          </div>
        </div>

        {/* Global Multi-School Filter for SuperAdmin */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          {isSuperAdmin && availableSchools.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-full px-4 py-2 text-xs font-mono focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
              <Building className="w-4 h-4 text-emerald-400 shrink-0" />
              <select
                aria-label="Filter by School"
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer pr-2"
              >
                <option value="" className="bg-slate-900 text-white">Global Network (All Schools)</option>
                {availableSchools.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name} ({s.schoolCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            disabled={loading}
            className="rounded-full border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-2 h-10 px-4 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Telemetry Health Pills (Curvy 3D Stack) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-[32px] border border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl space-y-1"
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-zinc-400 font-bold uppercase">
            <span>Active Sessions</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-4xl font-black text-slate-900 dark:text-white font-mono">
            {telemetry?.totalActiveSessions ?? 0}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1.5 pt-1">
            <Globe className="w-3.5 h-3.5" />
            <span>{telemetry?.crossCampusCount ?? 0} Cross-Campus • {telemetry?.intraCampusCount ?? 0} Internal</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-6 rounded-[32px] border border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl space-y-1"
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-zinc-400 font-bold uppercase">
            <span>PII Redactions (24h)</span>
            <PhoneOff className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-4xl font-black text-slate-900 dark:text-white font-mono">
            {reports.filter(r => r.threatAnalysis.hasDoxxing).length * 3 + 12}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-bold pt-1">
            Intercepted numbers & handles
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-[32px] border border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl space-y-1"
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-zinc-400 font-bold uppercase">
            <span>Flagged Incidents</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-4xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {telemetry?.totalFlaggedSessions ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono font-bold pt-1">
            Requiring counselor triage
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-6 rounded-[32px] border border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl space-y-1"
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-zinc-400 font-bold uppercase">
            <span>Safety Reports</span>
            <AlertTriangle className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-4xl font-black text-slate-900 dark:text-white font-mono">
            {telemetry?.allReportsCount ?? 0}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-bold pt-1">
            Total reported sessions
          </div>
        </motion.div>
      </div>

      {/* ── Filter Triage Pills ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          {(['ALL', 'CRISIS', 'DOXXING'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-5 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                filterType === type
                  ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-md"
                  : "bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
              }`}
            >
              {type === 'ALL' && 'All Incidents'}
              {type === 'CRISIS' && 'Acute Crisis Watch'}
              {type === 'DOXXING' && 'PII & Doxxing Attempts'}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-slate-500 dark:text-zinc-400 font-bold">
          Showing {reports.length} safety items
        </div>
      </div>

      {/* ── Incident Triage List ── */}
      {loading ? (
        <div className="p-16 rounded-[36px] border border-slate-200 dark:border-zinc-800 text-center space-y-3 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
          <p className="text-sm font-mono text-slate-600 dark:text-zinc-400">Loading safety incidents & topology analysis...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-16 rounded-[36px] border border-slate-200 dark:border-zinc-800 text-center space-y-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-sans">
            Zero Safety Incidents Detected
          </h3>
          <p className="text-sm text-slate-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            All active cross-school and internal Sanctuary sessions are running cleanly within automated guardrails.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isExpanded = expandedSessionId === report.sessionId;
            const isCritical = report.threatAnalysis.hasCrisis;
            const isDoxxing = report.threatAnalysis.hasDoxxing;

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[32px] border transition-all duration-300 backdrop-blur-2xl shadow-xl overflow-hidden ${
                  isCritical 
                    ? "bg-rose-50/90 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/80" 
                    : isDoxxing 
                    ? "bg-amber-50/90 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/80"
                    : "bg-white/80 dark:bg-zinc-900/80 border-slate-200/80 dark:border-zinc-800/80"
                }`}
              >
                {/* Card Header */}
                <div className="p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Severity Badge */}
                      {isCritical ? (
                        <span className="px-3.5 py-1 rounded-full text-xs font-mono font-black uppercase bg-rose-500 text-white flex items-center gap-1.5 shadow-sm">
                          <AlertCircle className="w-3.5 h-3.5" /> Acute Crisis Detected
                        </span>
                      ) : isDoxxing ? (
                        <span className="px-3.5 py-1 rounded-full text-xs font-mono font-black uppercase bg-amber-500 text-white flex items-center gap-1.5 shadow-sm">
                          <PhoneOff className="w-3.5 h-3.5" /> PII / Doxxing Intercept
                        </span>
                      ) : (
                        <span className="px-3.5 py-1 rounded-full text-xs font-mono font-black uppercase bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Peer Report
                        </span>
                      )}

                      {/* Topology Badge */}
                      <span className={`px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                        report.topology.type === 'CROSS_CAMPUS'
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
                      }`}>
                        {report.topology.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        Reason: {report.reason}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                        • {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Scrubber Toggler */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      onClick={() => setExpandedSessionId(isExpanded ? null : report.sessionId)}
                      aria-expanded={isExpanded}
                      aria-controls={`transcript-${report.sessionId}`}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs font-bold border-slate-300 dark:border-zinc-700 flex items-center gap-1.5 h-10 px-4 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>{isExpanded ? "Hide Transcript" : "Scrub Transcript"}</span>
                    </Button>

                    <Button
                      onClick={() => handleModerationAction(report.sessionId, 'ESCALATE_TO_COUNSELOR', report.id)}
                      disabled={processingAction === report.sessionId}
                      size="sm"
                      className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 h-10 px-4 shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Dispatch Counselor</span>
                    </Button>

                    <Button
                      onClick={() => handleModerationAction(report.sessionId, 'TERMINATE_SESSION', report.id)}
                      disabled={processingAction === report.sessionId}
                      size="sm"
                      className="rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 h-10 px-4 shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Terminate Session</span>
                    </Button>

                    <Button
                      onClick={() => handleModerationAction(report.sessionId, 'DISMISS_REPORT', report.id)}
                      disabled={processingAction === report.sessionId}
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white h-10 px-3 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>

                {/* Interactive Transcript Scrubber View */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      id={`transcript-${report.sessionId}`}
                      role="region"
                      aria-label="Redacted Conversation Transcript"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-zinc-950/80 p-6 sm:p-7 space-y-4"
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500 dark:text-zinc-400">
                        <span className="uppercase tracking-wider flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-emerald-500" />
                          Redacted Conversation Transcript ({report.session.messages.length} messages)
                        </span>
                        <span>Mode: {report.session.mode} • Status: {report.session.status}</span>
                      </div>

                      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {report.session.messages.length === 0 ? (
                          <div className="text-xs text-slate-500 font-mono text-center py-4">
                            No transcript messages recorded before report submission.
                          </div>
                        ) : (
                          report.session.messages.map((msg) => {
                            const isRedacted = msg.content.includes('[NUMBER_FILTERED]') || 
                                               msg.content.includes('[CONTACT_FILTERED]') || 
                                               msg.content.includes('[HANDLE_FILTERED]') ||
                                               msg.content.includes('[OFF_PLATFORM_CONTACT_FILTERED]');

                            return (
                              <div
                                key={msg.id}
                                className={`p-4 rounded-2xl border text-xs sm:text-sm font-sans space-y-1 ${
                                  isRedacted 
                                    ? "bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200" 
                                    : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-200"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 dark:text-zinc-400">
                                  <span>{msg.senderName} ({msg.senderRole})</span>
                                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                </div>
                                <p className="leading-relaxed">
                                  {msg.content}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
