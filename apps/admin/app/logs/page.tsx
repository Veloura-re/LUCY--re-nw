import React from 'react';
import { AdminRole } from '@prisma/client';
import { protectAdminPage } from '@/lib/page-guard';
import { AdminShell } from '@/components/admin-shell';
import { prisma } from '@/lib/prisma';
import { Terminal, Activity, Server, Cpu, AlertTriangle, ShieldCheck } from 'lucide-react';

export default async function DeveloperLogsPage() {
    const admin = await protectAdminPage([AdminRole.DEVELOPER], '/logs');

    // 1. Database Health Probe
    const dbStartTime = Date.now();
    let dbStatus = 'ONLINE';
    let dbLatencyMs = 0;
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - dbStartTime;
    } catch {
        dbStatus = 'OFFLINE';
        dbLatencyMs = Date.now() - dbStartTime;
    }

    // 2. Error logs query
    const errorLogs = await prisma.auditLog.findMany({
        where: {
            OR: [
                { action: { contains: 'ERROR', mode: 'insensitive' } },
                { action: { contains: 'FAIL', mode: 'insensitive' } },
                { action: { contains: 'TIMEOUT', mode: 'insensitive' } },
            ],
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { email: true, name: true, role: true } },
            school: { select: { name: true } },
        },
    });

    const memory = typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : null;

    return (
        <AdminShell admin={admin}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl font-bold font-mono text-zinc-100 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-purple-400" />
                        SYSTEM HEALTH, TELEMETRY & ERROR LOGS
                    </h1>
                    <p className="text-xs font-mono text-zinc-400 mt-1">
                        Restricted Access: Developer Administrator Clearance
                    </p>
                </div>

                {/* Health Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                            Database Status
                        </span>
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${dbStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className="text-xl font-bold font-mono text-zinc-100">{dbStatus}</span>
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">Latency: {dbLatencyMs}ms</span>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                            Heap Memory Usage
                        </span>
                        <div className="text-xl font-bold font-mono text-zinc-100">
                            {memory ? `${Math.round(memory.heapUsed / 1024 / 1024)} MB` : 'N/A'}
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">Total RSS: {memory ? `${Math.round(memory.rss / 1024 / 1024)} MB` : 'N/A'}</span>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                            Process Runtime
                        </span>
                        <div className="text-xl font-bold font-mono text-zinc-100">
                            {process.version}
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">Platform: {process.platform}</span>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                            Deployment Tier
                        </span>
                        <div className="text-xl font-bold font-mono text-purple-400">
                            {process.env.VERCEL_ENV ? process.env.VERCEL_ENV.toUpperCase() : 'LOCAL'}
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">Commit: {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'HEAD'}</span>
                    </div>
                </div>

                {/* Error Telemetry Stream */}
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                        <h2 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                            APPLICATION ERROR & EXCEPTION TELEMETRY STREAM
                        </h2>
                        <span className="text-xs font-mono text-zinc-500">Live operational events</span>
                    </div>

                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left text-xs font-mono">
                            <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 sticky top-0">
                                <tr>
                                    <th className="py-2.5 px-4">Timestamp</th>
                                    <th className="py-2.5 px-4">Action</th>
                                    <th className="py-2.5 px-4">Origin / School</th>
                                    <th className="py-2.5 px-4">User</th>
                                    <th className="py-2.5 px-4">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                                {errorLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-zinc-500">
                                            No active exceptions or system errors reported.
                                        </td>
                                    </tr>
                                ) : (
                                    errorLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-zinc-900/40">
                                            <td className="py-2 px-4 text-zinc-500 text-[11px]">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </td>
                                            <td className="py-2 px-4">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-2 px-4 text-zinc-300">
                                                {log.school?.name || 'Platform System'}
                                            </td>
                                            <td className="py-2 px-4 text-zinc-400">
                                                {log.user ? `${log.user.name} (${log.user.role})` : 'Anonymous / Job'}
                                            </td>
                                            <td className="py-2 px-4 text-zinc-500">{log.ip || 'unknown'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminShell>
    );
}
