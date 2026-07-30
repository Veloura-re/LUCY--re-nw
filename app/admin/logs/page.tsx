'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Search, RefreshCw, ChevronLeft, ChevronRight,
    Filter, User, Clock, Database, Trash2, Edit3, Plus, Eye,
    Shield, AlertTriangle, CheckCircle, Download, School,
    XCircle, Zap, Bug, Globe, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveTracker } from '@/components/dashboard/live-tracker';

type Tab = 'activity' | 'errors';

interface AuditLog {
    id: string; userId: string; schoolId?: string; action: string; resourceType: string;
    resourceId?: string; level: string; statusCode?: number; path?: string;
    before?: any; after?: any; ip?: string; userAgent?: string; createdAt: string;
    user: { id: string; name: string | null; email: string; role: string };
}

interface ErrorLog {
    id: string; schoolId?: string; userId?: string; level: string; type: string;
    message: string; stack?: string; path?: string; statusCode?: number;
    ip?: string; userAgent?: string; metadata?: any; createdAt: string;
    school?: { id: string; name: string; schoolCode: string } | null;
}

interface SchoolInfo { id: string; name: string; schoolCode: string; }

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    UPDATE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    UPDATE_SETTINGS: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
    APPROVE: 'text-green-400 bg-green-500/10 border-green-500/20',
    RESOLVE: 'text-green-400 bg-green-500/10 border-green-500/20',
    REGISTER: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    INVITE: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    SUBMIT: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    VERIFY_PAYMENT: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    GENERATE: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

const ERROR_TYPE_COLORS: Record<string, string> = {
    ui_crash: 'text-red-400 bg-red-500/10 border-red-500/20',
    api_error: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    route_404: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    auth_failure: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    unhandled_rejection: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    network_error: 'text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
};

const ERROR_TYPE_ICONS: Record<string, React.ReactNode> = {
    ui_crash: <Bug className="w-3 h-3" />,
    api_error: <AlertCircle className="w-3 h-3" />,
    route_404: <Globe className="w-3 h-3" />,
    auth_failure: <Shield className="w-3 h-3" />,
    unhandled_rejection: <Zap className="w-3 h-3" />,
    network_error: <XCircle className="w-3 h-3" />,
};

function getActionColor(action: string) {
    const upper = action.toUpperCase();
    for (const key of Object.keys(ACTION_COLORS)) {
        if (upper.startsWith(key)) return ACTION_COLORS[key];
    }
    return 'text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
}

function getActionIcon(action: string) {
    const u = action.toUpperCase();
    if (u.includes('DELETE')) return <Trash2 className="w-3 h-3" />;
    if (u.includes('UPDATE') || u.includes('SETTINGS')) return <Edit3 className="w-3 h-3" />;
    if (u.includes('CREATE') || u.includes('REGISTER')) return <Plus className="w-3 h-3" />;
    if (u.includes('APPROVE') || u.includes('RESOLVE')) return <CheckCircle className="w-3 h-3" />;
    if (u.includes('GENERATE')) return <Zap className="w-3 h-3" />;
    return <Activity className="w-3 h-3" />;
}

function formatRelative(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (s < 60) return 'just now'; if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`; if (d < 7) return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function AdminLogsPage() {
    const [tab, setTab] = useState<Tab>('activity');
    // Activity logs state
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('');
    const [resourceFilter, setResourceFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('');
    const [actionStats, setActionStats] = useState<any[]>([]);
    const [schoolStats, setSchoolStats] = useState<any[]>([]);
    const [schoolsMap, setSchoolsMap] = useState<Record<string, SchoolInfo>>({});
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    // Error logs state
    const [errors, setErrors] = useState<ErrorLog[]>([]);
    const [errorTotal, setErrorTotal] = useState(0);
    const [errorPage, setErrorPage] = useState(1);
    const [errorLoading, setErrorLoading] = useState(false);
    const [errorSearch, setErrorSearch] = useState('');
    const [errorTypeFilter, setErrorTypeFilter] = useState('');
    const [errorLevelFilter, setErrorLevelFilter] = useState('');
    const [errorSchoolFilter, setErrorSchoolFilter] = useState('');
    const [errorStats, setErrorStats] = useState<any[]>([]);
    const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
    
    const limit = 50;

    // Debounce search
    useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 350); return () => clearTimeout(t); }, [search]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(limit), search: debouncedSearch, schoolId: schoolFilter, resourceType: resourceFilter, level: levelFilter });
            const res = await fetch(`/api/admin/logs?${params}`);
            const data = await res.json() as { logs: AuditLog[]; total: number; actionStats: any[]; schoolStats: any[]; schools: SchoolInfo[] };
            setLogs(data.logs || []);
            setTotal(data.total || 0);
            setActionStats(data.actionStats || []);
            setSchoolStats(data.schoolStats || []);
            const map: Record<string, SchoolInfo> = {};
            (data.schools || []).forEach(s => { map[s.id] = s; });
            setSchoolsMap(map);
        } finally { setLoading(false); }
    }, [page, debouncedSearch, schoolFilter, resourceFilter, levelFilter]);

    const fetchErrors = useCallback(async () => {
        setErrorLoading(true);
        try {
            const params = new URLSearchParams({ page: String(errorPage), limit: String(limit), search: errorSearch, schoolId: errorSchoolFilter, type: errorTypeFilter, level: errorLevelFilter });
            const res = await fetch(`/api/admin/error-logs?${params}`);
            const data = await res.json() as { errors: ErrorLog[]; total: number; typeStats: any[] };
            setErrors(data.errors || []);
            setErrorTotal(data.total || 0);
            setErrorStats(data.typeStats || []);
        } finally { setErrorLoading(false); }
    }, [errorPage, errorSearch, errorSchoolFilter, errorTypeFilter, errorLevelFilter]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    useEffect(() => { if (tab === 'errors') fetchErrors(); }, [tab, fetchErrors]);
    useEffect(() => { setPage(1); }, [debouncedSearch, schoolFilter, resourceFilter, levelFilter]);
    useEffect(() => { setErrorPage(1); }, [errorSearch, errorSchoolFilter, errorTypeFilter, errorLevelFilter]);

    const downloadCSV = () => {
        const rows = logs.map(l => [new Date(l.createdAt).toISOString(), l.user.name || '', l.user.email, l.user.role, l.action, l.resourceType, l.resourceId || '', l.ip || '', l.path || '']);
        const csv = [['Timestamp','User','Email','Role','Action','Resource','ResourceId','IP','Path'], ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'audit-logs.csv'; a.click();
    };

    const totalActivityPages = Math.ceil(total / limit);
    const totalErrorPages = Math.ceil(errorTotal / limit);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-eduGreen-500" />
                        <span className="text-[10px] font-semibold text-eduGreen-500 uppercase tracking-[0.3em]">System Intelligence</span>
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Logs & Monitoring</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-500 mt-0.5">Audit trail + error monitoring across all schools</p>
                </div>
                <div className="flex items-center gap-4">
                    <LiveTracker />
                    <div className="w-px h-6 bg-zinc-300 dark:bg-white/10" />
                    <button onClick={() => { fetchLogs(); if (tab === 'errors') fetchErrors(); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-xs font-medium">
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                    {tab === 'activity' && (
                        <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-eduGreen-500/10 border border-eduGreen-500/20 text-eduGreen-400 hover:bg-eduGreen-500/20 transition-all text-xs font-medium">
                            <Download className="w-3.5 h-3.5" /> Export CSV
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-xl w-fit">
                {([
                    { id: 'activity', label: 'Activity Logs', icon: Activity, count: total },
                    { id: 'errors', label: 'Error Logs', icon: Bug, count: errorTotal },
                ] as const).map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all",
                            tab === t.id ? "bg-zinc-300 dark:bg-white/10 text-zinc-900 dark:text-white" : "text-zinc-600 hover:text-zinc-400")}>
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                        {t.count > 0 && <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold", tab === t.id ? "bg-white/20" : "bg-zinc-200 dark:bg-white/5")}>{t.count}</span>}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* ─────────── ACTIVITY LOGS TAB ─────────── */}
                {tab === 'activity' && (
                    <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                        {/* School breakdown strip */}
                        {schoolStats.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold flex items-center gap-2">
                                    <School className="w-3 h-3" /> Top Active Schools
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setSchoolFilter('')}
                                        className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider transition-all",
                                            !schoolFilter ? "bg-zinc-300 dark:bg-white/10 border-zinc-300 dark:border-white/20 text-zinc-900 dark:text-white" : "bg-white/[0.02] border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-500 hover:border-zinc-300 dark:border-white/10")}>
                                        All Schools
                                    </button>
                                    {schoolStats.map((s: any) => {
                                        const info = schoolsMap[s.schoolId];
                                        return (
                                            <button key={s.schoolId} onClick={() => setSchoolFilter(s.schoolId === schoolFilter ? '' : s.schoolId)}
                                                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider transition-all",
                                                    schoolFilter === s.schoolId ? "bg-eduGreen-500/10 border-eduGreen-500/30 text-eduGreen-400" : "bg-white/[0.02] border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-500 hover:border-zinc-300 dark:border-white/10 hover:text-zinc-300")}>
                                                <School className="w-3 h-3" />
                                                {info?.name || info?.schoolCode || s.schoolId.slice(0, 8)}
                                                <span className="opacity-60">{s._count.schoolId}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Action Stats */}
                        {actionStats.length > 0 && (
                            <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                                {actionStats.map((s: any, i: number) => (
                                    <motion.div key={s.action} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                        className="bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-xl p-3 space-y-1 text-center">
                                        <div className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold uppercase", getActionColor(s.action))}>
                                            {getActionIcon(s.action)}{s.action.slice(0, 8)}
                                        </div>
                                        <div className="text-xl font-black text-zinc-900 dark:text-white">{s._count.action}</div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Filters */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, action, resource…"
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-zinc-300 dark:border-white/10 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-600 focus:outline-none focus:border-eduGreen-500/40 transition-all" />
                            </div>
                            <select value={resourceFilter} onChange={e => setResourceFilter(e.target.value)}
                                className="px-4 py-2.5 bg-white/[0.03] border border-zinc-300 dark:border-white/10 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-eduGreen-500/40 appearance-none cursor-pointer">
                                <option value="">All Resources</option>
                                {['student','teacher','grade','exam','attendance','fee','payment','timetable','event','message','authorization','settings','billing','user'].map(r => (
                                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                ))}
                            </select>
                            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
                                className="px-4 py-2.5 bg-white/[0.03] border border-zinc-300 dark:border-white/10 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-eduGreen-500/40 appearance-none cursor-pointer">
                                <option value="">All Levels</option>
                                <option value="INFO">Info</option>
                                <option value="WARN">Warn</option>
                                <option value="ERROR">Error</option>
                            </select>
                            <div className="text-[11px] text-zinc-600">{total.toLocaleString()} records</div>
                        </div>

                        {/* Table */}
                        <div className="bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden">
                            <div className="grid grid-cols-[1fr_1.2fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-zinc-200 dark:border-white/5 text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em]">
                                <span>User</span><span>Action</span><span>Resource</span><span className="hidden md:block">IP</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />Time</span>
                            </div>
                            {loading ? (
                                <div className="flex items-center justify-center py-16"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw className="w-5 h-5 text-zinc-700" /></motion.div></div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-16"><Activity className="w-8 h-8 text-zinc-800 dark:text-zinc-200 mx-auto mb-2" /><p className="text-sm text-zinc-700">No logs found</p></div>
                            ) : (
                                <div className="divide-y divide-white/[0.03]">
                                    {logs.map((log, i) => (
                                        <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.008 }}
                                            onClick={() => setSelectedLog(log)}
                                            className="grid grid-cols-[1fr_1.2fr_1fr_auto_auto] gap-4 px-5 py-3 hover:bg-white/[0.03] transition-all cursor-pointer group">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-zinc-600 dark:text-zinc-500 uppercase">{(log.user.name || log.user.email)[0]}</div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{log.user.name || '—'}</div>
                                                    <div className="text-[10px] text-zinc-600 truncate">{log.user.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase", getActionColor(log.action))}>
                                                    {getActionIcon(log.action)}{log.action.length > 18 ? log.action.slice(0, 18) + '…' : log.action}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <Database className="w-3 h-3 text-zinc-700 shrink-0" />
                                                <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{log.resourceType}</span>
                                            </div>
                                            <div className="hidden md:flex items-center"><span className="text-[10px] text-zinc-700 font-mono">{log.ip || '—'}</span></div>
                                            <div className="flex items-center"><span className="text-[10px] text-zinc-600 dark:text-zinc-500 whitespace-nowrap">{formatRelative(log.createdAt)}</span></div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {totalActivityPages > 1 && (
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-zinc-600">Page {page} of {totalActivityPages}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400 hover:text-white disabled:opacity-30 transition-all"><ChevronLeft className="w-3.5 h-3.5" />Prev</button>
                                    <button onClick={() => setPage(p => Math.min(totalActivityPages, p + 1))} disabled={page === totalActivityPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400 hover:text-white disabled:opacity-30 transition-all">Next<ChevronRight className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ─────────── ERROR LOGS TAB ─────────── */}
                {tab === 'errors' && (
                    <motion.div key="errors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                        {/* Error type stats */}
                        {errorStats.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                {errorStats.map((s: any, i: number) => (
                                    <motion.div key={s.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                        onClick={() => setErrorTypeFilter(s.type === errorTypeFilter ? '' : s.type)}
                                        className={cn("bg-white/[0.02] border rounded-xl p-4 space-y-2 cursor-pointer transition-all hover:bg-white/[0.04]", errorTypeFilter === s.type ? "border-red-500/30" : "border-zinc-200 dark:border-white/5")}>
                                        <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase", ERROR_TYPE_COLORS[s.type] || 'text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20')}>
                                            {ERROR_TYPE_ICONS[s.type]}{s.type.replace('_', ' ')}
                                        </div>
                                        <div className="text-2xl font-black text-zinc-900 dark:text-white">{s._count.type}</div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Filters */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                <input value={errorSearch} onChange={e => setErrorSearch(e.target.value)} placeholder="Search message, path…"
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-zinc-300 dark:border-white/10 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/40 transition-all" />
                            </div>
                            <select value={errorTypeFilter} onChange={e => setErrorTypeFilter(e.target.value)}
                                className="px-4 py-2.5 bg-white/[0.03] border border-zinc-300 dark:border-white/10 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none appearance-none cursor-pointer">
                                <option value="">All Types</option>
                                {['ui_crash','api_error','route_404','auth_failure','unhandled_rejection','network_error'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                            </select>
                            <div className="text-[11px] text-zinc-600">{errorTotal.toLocaleString()} errors</div>
                        </div>

                        {/* Error Table */}
                        <div className="bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden">
                            <div className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-4 px-5 py-3 border-b border-zinc-200 dark:border-white/5 text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em]">
                                <span>Type</span><span>Message</span><span>Path</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />Time</span>
                            </div>
                            {errorLoading ? (
                                <div className="flex items-center justify-center py-16"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw className="w-5 h-5 text-zinc-700" /></motion.div></div>
                            ) : errors.length === 0 ? (
                                <div className="text-center py-16">
                                    <CheckCircle className="w-8 h-8 text-emerald-800 mx-auto mb-2" />
                                    <p className="text-sm text-zinc-700">No errors logged — system healthy</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.03]">
                                    {errors.map((err, i) => (
                                        <motion.div key={err.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.008 }}
                                            onClick={() => setSelectedError(err)}
                                            className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-4 px-5 py-3 hover:bg-white/[0.03] cursor-pointer transition-all">
                                            <div className="flex items-center">
                                                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase", ERROR_TYPE_COLORS[err.type] || 'text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20')}>
                                                    {ERROR_TYPE_ICONS[err.type]}{err.type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center min-w-0">
                                                <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{err.message}</span>
                                            </div>
                                            <div className="flex items-center min-w-0">
                                                <span className="text-[10px] text-zinc-600 font-mono truncate">{err.path || '—'}</span>
                                            </div>
                                            <div className="flex items-center"><span className="text-[10px] text-zinc-600 dark:text-zinc-500 whitespace-nowrap">{formatRelative(err.createdAt)}</span></div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {totalErrorPages > 1 && (
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-zinc-600">Page {errorPage} of {totalErrorPages}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setErrorPage(p => Math.max(1, p - 1))} disabled={errorPage === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400 hover:text-white disabled:opacity-30 transition-all"><ChevronLeft className="w-3.5 h-3.5" />Prev</button>
                                    <button onClick={() => setErrorPage(p => Math.min(totalErrorPages, p + 1))} disabled={errorPage === totalErrorPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400 hover:text-white disabled:opacity-30 transition-all">Next<ChevronRight className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Activity Log Detail Modal ─── */}
            <AnimatePresence>
                {selectedLog && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedLog(null)}
                        className="fixed inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-5 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase mb-2", getActionColor(selectedLog.action))}>
                                        {getActionIcon(selectedLog.action)}{selectedLog.action}
                                    </span>
                                    <h2 className="text-base font-bold text-zinc-900 dark:text-white">{selectedLog.resourceType}</h2>
                                </div>
                                <button onClick={() => setSelectedLog(null)} className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white text-xl">×</button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                {[['User', selectedLog.user.name || '—'],['Email', selectedLog.user.email],['Role', selectedLog.user.role],['IP', selectedLog.ip || '—'],['Path', selectedLog.path || '—'],['Resource ID', selectedLog.resourceId || '—'],['Level', selectedLog.level],['Timestamp', new Date(selectedLog.createdAt).toLocaleString('en-GB')]].map(([label, value]) => (
                                    <div key={label} className="space-y-0.5">
                                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{label}</div>
                                        <div className="text-zinc-900 dark:text-white font-mono break-all text-[11px]">{value}</div>
                                    </div>
                                ))}
                            </div>
                            {selectedLog.before && <div><div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Before</div><pre className="bg-red-950/20 border border-red-500/10 rounded-xl p-3 text-[11px] text-red-300 overflow-x-auto">{JSON.stringify(selectedLog.before, null, 2)}</pre></div>}
                            {selectedLog.after && <div><div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">After</div><pre className="bg-emerald-950/20 border border-emerald-500/10 rounded-xl p-3 text-[11px] text-emerald-300 overflow-x-auto">{JSON.stringify(selectedLog.after, null, 2)}</pre></div>}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Error Log Detail Modal ─── */}
            <AnimatePresence>
                {selectedError && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedError(null)}
                        className="fixed inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 rounded-2xl p-6 w-full max-w-2xl space-y-5 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between">
                                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase", ERROR_TYPE_COLORS[selectedError.type] || '')}>
                                    {ERROR_TYPE_ICONS[selectedError.type]}{selectedError.type.replace('_', ' ')}
                                </span>
                                <button onClick={() => setSelectedError(null)} className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white text-xl">×</button>
                            </div>
                            <div className="p-4 bg-red-950/20 border border-red-500/10 rounded-xl">
                                <p className="text-sm text-red-300 font-medium">{selectedError.message}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                {[['School', selectedError.school?.name || '—'],['Path', selectedError.path || '—'],['Status', selectedError.statusCode?.toString() || '—'],['IP', selectedError.ip || '—'],['Level', selectedError.level],['Time', new Date(selectedError.createdAt).toLocaleString('en-GB')]].map(([l, v]) => (
                                    <div key={l} className="space-y-0.5">
                                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{l}</div>
                                        <div className="text-zinc-900 dark:text-white font-mono text-[11px] break-all">{v}</div>
                                    </div>
                                ))}
                            </div>
                            {selectedError.stack && (
                                <div>
                                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Stack Trace</div>
                                    <pre className="bg-zinc-100 dark:bg-black/60 border border-zinc-200 dark:border-white/5 rounded-xl p-3 text-[10px] text-zinc-600 dark:text-zinc-500 overflow-x-auto whitespace-pre-wrap">{selectedError.stack}</pre>
                                </div>
                            )}
                            {selectedError.userAgent && (
                                <div>
                                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">User Agent</div>
                                    <p className="text-[10px] text-zinc-600 font-mono">{selectedError.userAgent}</p>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
