'use client';

import { useState, useEffect } from "react";
import {
    Loader2, ShieldCheck, Search, SlidersHorizontal
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

export default function SecurityDisclosuresPage() {
    const [securityReports, setSecurityReports] = useState<SecurityReport[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);

    // Filtering & Searching States
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

    useEffect(() => {
        fetchSecurityReports();
    }, []);

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
            <div>
                <h1 className="text-2xl font-bold font-orbitron tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-orange-500" />
                    SECURITY DISCLOSURES
                </h1>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest font-medium mt-1">
                    Review incoming security vulnerabilities reported from outside nodes
                </p>
            </div>

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
                                        report.severity === 'CRITICAL' && "bg-red-950/20 border-red-900/50 text-red-400",
                                        report.severity === 'HIGH' && "bg-orange-950/20 border-orange-900/50 text-orange-400",
                                        report.severity === 'MEDIUM' && "bg-amber-950/20 border-amber-900/50 text-amber-400",
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
    );
}
