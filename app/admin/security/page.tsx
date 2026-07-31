'use client';

import { useState, useEffect } from "react";
import {
    Loader2, ShieldCheck, Search, SlidersHorizontal, Activity, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SecurityReport {
    id: string;
    email: string;
    vulnerabilityType: string;
    severity: string;
    description: string;
    hash: string;
    createdAt: string;
}

interface AuditLog {
    id: string;
    ip_address: string;
    email: string;
    status: string;
    created_at: string;
}

export default function SecurityDisclosuresPage() {
    const [activeTab, setActiveTab] = useState<'disclosures' | 'threats'>('disclosures');

    const [securityReports, setSecurityReports] = useState<SecurityReport[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);

    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    // Filtering & Searching States (Disclosures)
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

    useEffect(() => {
        fetchSecurityReports();
    }, []);

    useEffect(() => {
        if (activeTab === 'threats') {
            fetchAuditLogs();
        }
    }, [activeTab]);

    const fetchSecurityReports = async () => {
        setIsLoadingReports(true);
        try {
            const res = await fetch('/api/admin/security-reports');
            if (!res.ok) throw new Error('Failed to fetch security reports');
            const data = (await res.json()) as any;
            setSecurityReports(data.reports || []);
        } catch (err: any) {
            console.error(err.message);
            toast.error("Failed to fetch security disclosures");
        } finally {
            setIsLoadingReports(false);
        }
    };

    const fetchAuditLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const res = await fetch('/api/admin/security/audit-logs');
            if (!res.ok) throw new Error('Failed to fetch audit logs');
            const data = (await res.json()) as any;
            setAuditLogs(data.logs || []);
        } catch (err: any) {
            console.error(err.message);
            toast.error("Failed to fetch audit logs");
        } finally {
            setIsLoadingLogs(false);
        }
    };

    // Client-side Filtering
    const filteredReports = securityReports.filter(report => {
        const matchesSearch = report.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              report.vulnerabilityType.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSeverity = severityFilter === 'ALL' || report.severity === severityFilter;
        return matchesSearch && matchesSeverity;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-orbitron tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-orange-500" />
                        SECURITY COMMAND CENTER
                    </h1>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest font-medium mt-1">
                        Monitor disclosures and active threats in real-time
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-white/5 pb-2">
                <button 
                    onClick={() => setActiveTab('disclosures')}
                    className={cn(
                        "px-4 py-2 text-xs font-semibold uppercase tracking-widest rounded-t-lg transition-colors flex items-center gap-2",
                        activeTab === 'disclosures' 
                            ? "bg-zinc-200 dark:bg-white/5 text-zinc-900 dark:text-white border-b-2 border-orange-500" 
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                    )}
                >
                    <ShieldCheck className="w-4 h-4" /> Disclosures
                </button>
                <button 
                    onClick={() => setActiveTab('threats')}
                    className={cn(
                        "px-4 py-2 text-xs font-semibold uppercase tracking-widest rounded-t-lg transition-colors flex items-center gap-2",
                        activeTab === 'threats' 
                            ? "bg-zinc-200 dark:bg-white/5 text-zinc-900 dark:text-white border-b-2 border-orange-500" 
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                    )}
                >
                    <Activity className="w-4 h-4" /> Threat Intelligence
                </button>
            </div>

            {activeTab === 'disclosures' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Filter Panel */}
                    <div className="bg-zinc-100/40 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-600 dark:text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search disclosures by reporter, description, category..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl h-10 pl-9 pr-4 text-xs text-zinc-900 dark:text-white focus:border-eduGreen-500 focus:outline-none placeholder-zinc-600"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                            <SlidersHorizontal className="w-4 h-4 text-zinc-600 dark:text-zinc-500 mr-2 flex-shrink-0" />
                            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                                <button
                                    key={sev}
                                    onClick={() => setSeverityFilter(sev)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                                        severityFilter === sev
                                            ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-400 dark:border-zinc-700"
                                            : "bg-transparent text-zinc-600 dark:text-zinc-500 border-transparent hover:text-zinc-400"
                                    )}
                                >
                                    {sev}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Security Reports Section */}
                    {isLoadingReports ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-500 opacity-60" />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-700">Loading reports...</p>
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-900">
                            <ShieldCheck className="w-10 h-10 text-zinc-800 dark:text-zinc-200 mx-auto mb-4" />
                            <p className="text-zinc-600 font-medium uppercase tracking-widest text-xs">No disclosures logged</p>
                            <p className="text-[10px] text-zinc-700 mt-1">Adjust filters or search parameters</p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-200 dark:bg-white/5 border-b border-zinc-200 dark:border-white/5">
                                <div className="col-span-3 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Reporter Email</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Category</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Severity</div>
                                <div className="col-span-3 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Description</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-right">Logged At</div>
                            </div>
                            
                            {/* Table Rows */}
                            <div className="divide-y divide-white/5 bg-white dark:bg-black">
                                {filteredReports.map((report) => (
                                    <div key={report.id} className="grid grid-cols-12 gap-4 px-6 py-5 hover:bg-zinc-200 dark:hover:bg-zinc-900/30 items-center transition-colors text-zinc-900 dark:text-white">
                                        <div className="col-span-3 font-mono text-xs select-all truncate">{report.email}</div>
                                        <div className="col-span-2 text-center">
                                            <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-[9px] font-bold text-zinc-600 dark:text-zinc-400">
                                                {report.vulnerabilityType}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full border text-[9px] font-bold",
                                                report.severity === 'CRITICAL' && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400",
                                                report.severity === 'HIGH' && "bg-orange-950/20 border-orange-900/50 text-orange-400",
                                                report.severity === 'MEDIUM' && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400",
                                                report.severity === 'LOW' && "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                                            )}>
                                                {report.severity}
                                            </span>
                                        </div>
                                        <div className="col-span-3 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-mono select-all pr-2">
                                            {report.description}
                                        </div>
                                        <div className="col-span-2 text-right text-[10px] text-zinc-600 font-mono">
                                            {new Date(report.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'threats' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold font-orbitron tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                            Live Authentication Feed
                        </h2>
                        <button onClick={fetchAuditLogs} className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                            Refresh Feed
                        </button>
                    </div>

                    {isLoadingLogs ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-500 opacity-60" />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-700">Loading audit logs...</p>
                        </div>
                    ) : auditLogs.length === 0 ? (
                        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-900">
                            <ShieldAlert className="w-10 h-10 text-zinc-800 dark:text-zinc-200 mx-auto mb-4" />
                            <p className="text-zinc-600 font-medium uppercase tracking-widest text-xs">No threats detected</p>
                            <p className="text-[10px] text-zinc-700 mt-1">Authentication audit logs are empty</p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-200 dark:bg-white/5 border-b border-zinc-200 dark:border-white/5">
                                <div className="col-span-3 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Timestamp</div>
                                <div className="col-span-3 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">IP Address</div>
                                <div className="col-span-4 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Account Email</div>
                                <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-right">Status</div>
                            </div>
                            
                            <div className="divide-y divide-white/5 bg-white dark:bg-black">
                                {auditLogs.map((log) => (
                                    <div key={log.id} className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-zinc-200 dark:hover:bg-zinc-900/30 items-center transition-colors text-zinc-900 dark:text-white">
                                        <div className="col-span-3 text-[10px] text-zinc-600 font-mono">
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                        <div className="col-span-3 font-mono text-xs select-all">{log.ip_address}</div>
                                        <div className="col-span-4 font-mono text-xs select-all truncate text-zinc-600 dark:text-zinc-400">{log.email}</div>
                                        <div className="col-span-2 text-right">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase",
                                                log.status === 'SUCCESS' && "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400",
                                                log.status === 'FAILED_PASSWORD' && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400",
                                                log.status === 'RATE_LIMITED' && "bg-orange-950/20 border-orange-900/50 text-orange-500",
                                                log.status === 'BLOCKED_TURNSTILE' && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500"
                                            )}>
                                                {log.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
