'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Search, RefreshCw, ChevronLeft, ChevronRight,
    Filter, User, Clock, Database, Trash2, Edit3, Plus, Eye,
    Shield, AlertTriangle, CheckCircle, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditLog {
    id: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    before?: any;
    after?: any;
    ip?: string;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        email: string;
        role: string;
    };
}

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    UPDATE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
    LOGIN: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    APPROVE: 'text-green-400 bg-green-500/10 border-green-500/20',
    REJECT: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
    student: <User className="w-3 h-3" />,
    teacher: <User className="w-3 h-3" />,
    grade: <Database className="w-3 h-3" />,
    exam: <Database className="w-3 h-3" />,
    school: <Shield className="w-3 h-3" />,
};

function getActionColor(action: string) {
    const upper = action.toUpperCase();
    for (const key of Object.keys(ACTION_COLORS)) {
        if (upper.includes(key)) return ACTION_COLORS[key];
    }
    return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
}

function getActionIcon(action: string) {
    const upper = action.toUpperCase();
    if (upper.includes('DELETE')) return <Trash2 className="w-3 h-3" />;
    if (upper.includes('UPDATE') || upper.includes('EDIT')) return <Edit3 className="w-3 h-3" />;
    if (upper.includes('CREATE') || upper.includes('ADD')) return <Plus className="w-3 h-3" />;
    if (upper.includes('VIEW') || upper.includes('READ')) return <Eye className="w-3 h-3" />;
    if (upper.includes('APPROVE')) return <CheckCircle className="w-3 h-3" />;
    if (upper.includes('REJECT')) return <AlertTriangle className="w-3 h-3" />;
    return <Activity className="w-3 h-3" />;
}

function formatRelativeTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [resourceFilter, setResourceFilter] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [stats, setStats] = useState<{ action: string; _count: { action: number } }[]>([]);
    const limit = 50;
    const totalPages = Math.ceil(total / limit);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                search: debouncedSearch,
                resourceType: resourceFilter,
            });
            const res = await fetch(`/api/admin/logs?${params}`);
            const data = await res.json() as {
                logs: AuditLog[];
                total: number;
                stats: { action: string; _count: { action: number } }[];
            };
            setLogs(data.logs || []);
            setTotal(data.total || 0);
            setStats(data.stats || []);
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, resourceFilter]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    useEffect(() => { setPage(1); }, [debouncedSearch, resourceFilter]);

    const downloadCSV = () => {
        const header = ['Timestamp', 'User', 'Email', 'Role', 'Action', 'Resource Type', 'Resource ID', 'IP'];
        const rows = logs.map(l => [
            new Date(l.createdAt).toISOString(),
            l.user.name || '',
            l.user.email,
            l.user.role,
            l.action,
            l.resourceType,
            l.resourceId || '',
            l.ip || ''
        ]);
        const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'audit-logs.csv'; a.click();
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-eduGreen-500" />
                        <span className="text-[10px] font-semibold text-eduGreen-500 uppercase tracking-[0.3em]">System Audit Trail</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Activity Logs</h1>
                    <p className="text-sm text-zinc-500 mt-0.5">Immutable record of every action taken across LUCY OS</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-xs font-medium"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                    </button>
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-eduGreen-500/10 border border-eduGreen-500/20 text-eduGreen-400 hover:bg-eduGreen-500/20 transition-all text-xs font-medium"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Stats Strip */}
            {stats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {stats.map((s, i) => (
                        <motion.div
                            key={s.action}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-1"
                        >
                            <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase", getActionColor(s.action))}>
                                {getActionIcon(s.action)}
                                {s.action}
                            </div>
                            <div className="text-2xl font-black text-white">{s._count.action.toLocaleString()}</div>
                            <div className="text-[10px] text-zinc-600">total events</div>
                        </motion.div>
                    ))}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: stats.length * 0.05 }}
                        className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-1"
                    >
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase text-zinc-400 bg-zinc-500/10 border-zinc-500/20">
                            <Activity className="w-3 h-3" /> Total
                        </div>
                        <div className="text-2xl font-black text-white">{total.toLocaleString()}</div>
                        <div className="text-[10px] text-zinc-600">all log entries</div>
                    </motion.div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by user, action, resource…"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-eduGreen-500/40 transition-all"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                    <select
                        value={resourceFilter}
                        onChange={e => setResourceFilter(e.target.value)}
                        className="pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-eduGreen-500/40 transition-all appearance-none cursor-pointer"
                    >
                        <option value="">All Resources</option>
                        <option value="student">Students</option>
                        <option value="teacher">Teachers</option>
                        <option value="grade">Grades</option>
                        <option value="exam">Exams</option>
                        <option value="school">Schools</option>
                        <option value="fee">Fees</option>
                        <option value="approval">Approvals</option>
                    </select>
                </div>
                <div className="text-[11px] text-zinc-600 font-medium">
                    {total.toLocaleString()} records
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/5 text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em]">
                    <span>User</span>
                    <span>Action</span>
                    <span>Resource</span>
                    <span className="hidden md:block">IP Address</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Time</span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        >
                            <RefreshCw className="w-5 h-5 text-zinc-600" />
                        </motion.div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20">
                        <Activity className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
                        <p className="text-sm text-zinc-600">No logs found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.03]">
                        {logs.map((log, i) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.01 }}
                                onClick={() => setSelectedLog(log)}
                                className="grid grid-cols-[1fr_1.2fr_1fr_1fr_auto] gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-all cursor-pointer group"
                            >
                                {/* User */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-zinc-400 uppercase">
                                        {(log.user.name || log.user.email)[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold text-white truncate">
                                            {log.user.name || '—'}
                                        </div>
                                        <div className="text-[10px] text-zinc-600 truncate">{log.user.email}</div>
                                    </div>
                                </div>

                                {/* Action */}
                                <div className="flex items-center">
                                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase", getActionColor(log.action))}>
                                        {getActionIcon(log.action)}
                                        {log.action.length > 20 ? log.action.slice(0, 20) + '…' : log.action}
                                    </span>
                                </div>

                                {/* Resource */}
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-zinc-600">{RESOURCE_ICONS[log.resourceType.toLowerCase()] ?? <Database className="w-3 h-3" />}</span>
                                    <span className="text-xs text-zinc-400 font-medium">{log.resourceType}</span>
                                    {log.resourceId && (
                                        <span className="text-[10px] text-zinc-700 font-mono truncate hidden xl:block">#{log.resourceId.slice(0, 8)}</span>
                                    )}
                                </div>

                                {/* IP */}
                                <div className="hidden md:flex items-center">
                                    <span className="text-[10px] text-zinc-600 font-mono">{log.ip || '—'}</span>
                                </div>

                                {/* Time */}
                                <div className="flex items-center">
                                    <span className="text-[10px] text-zinc-500 whitespace-nowrap">{formatRelativeTime(log.createdAt)}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-600">
                        Page {page} of {totalPages} · {total.toLocaleString()} records
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={cn(
                                        "w-8 h-8 rounded-lg text-xs font-semibold border transition-all",
                                        p === page
                                            ? "bg-eduGreen-500/10 border-eduGreen-500/30 text-eduGreen-400"
                                            : "bg-white/5 border-white/10 text-zinc-500 hover:text-white"
                                    )}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedLog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedLog(null)}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-5 max-h-[80vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase mb-2", getActionColor(selectedLog.action))}>
                                        {getActionIcon(selectedLog.action)}
                                        {selectedLog.action}
                                    </span>
                                    <h2 className="text-base font-bold text-white">{selectedLog.resourceType}</h2>
                                </div>
                                <button onClick={() => setSelectedLog(null)} className="text-zinc-600 hover:text-white transition-colors text-xl leading-none">×</button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                {[
                                    { label: 'User', value: selectedLog.user.name || '—' },
                                    { label: 'Email', value: selectedLog.user.email },
                                    { label: 'Role', value: selectedLog.user.role },
                                    { label: 'IP Address', value: selectedLog.ip || '—' },
                                    { label: 'Resource ID', value: selectedLog.resourceId || '—' },
                                    { label: 'Timestamp', value: new Date(selectedLog.createdAt).toLocaleString('en-GB') },
                                ].map(({ label, value }) => (
                                    <div key={label} className="space-y-0.5">
                                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{label}</div>
                                        <div className="text-white font-medium font-mono break-all">{value}</div>
                                    </div>
                                ))}
                            </div>

                            {selectedLog.before && (
                                <div>
                                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Before</div>
                                    <pre className="bg-red-950/20 border border-red-500/10 rounded-xl p-3 text-[11px] text-red-300 overflow-x-auto">
                                        {JSON.stringify(selectedLog.before, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {selectedLog.after && (
                                <div>
                                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">After</div>
                                    <pre className="bg-emerald-950/20 border border-emerald-500/10 rounded-xl p-3 text-[11px] text-emerald-300 overflow-x-auto">
                                        {JSON.stringify(selectedLog.after, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
