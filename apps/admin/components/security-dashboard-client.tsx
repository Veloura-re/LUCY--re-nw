'use client';

import React, { useState } from 'react';
import { Shield, UserX, Unlock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface SecurityDashboardClientProps {
    initialActiveSessions: any[];
    initialAuditLogs: any[];
    initialLockedAdmins: any[];
}

export function SecurityDashboardClient({
    initialActiveSessions,
    initialAuditLogs,
    initialLockedAdmins,
}: SecurityDashboardClientProps) {
    const [activeSessions, setActiveSessions] = useState(initialActiveSessions);
    const [lockedAdmins, setLockedAdmins] = useState(initialLockedAdmins);
    const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
    const [actionMsg, setActionMsg] = useState<{ text: string; error?: boolean } | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleRevokeSession = async (sessionId: string) => {
        setLoadingId(sessionId);
        setActionMsg(null);
        try {
            const res = await fetch('/api/admin/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REVOKE_SESSION', sessionId }),
            });
            const data = (await res.json()) as { error?: string; success?: boolean };
            if (res.ok) {
                setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
                setActionMsg({ text: 'Session successfully revoked.' });
            } else {
                setActionMsg({ text: data.error || 'Failed to revoke session.', error: true });
            }
        } catch {
            setActionMsg({ text: 'Network failure communicating with security endpoint.', error: true });
        } finally {
            setLoadingId(null);
        }
    };

    const handleUnlockAdmin = async (adminId: string) => {
        setLoadingId(adminId);
        setActionMsg(null);
        try {
            const res = await fetch('/api/admin/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'UNLOCK_ACCOUNT', adminId }),
            });
            const data = (await res.json()) as { error?: string; success?: boolean };
            if (res.ok) {
                setLockedAdmins((prev) => prev.filter((a) => a.id !== adminId));
                setActionMsg({ text: 'Account unlocked and failure counter cleared.' });
            } else {
                setActionMsg({ text: data.error || 'Failed to unlock account.', error: true });
            }
        } catch {
            setActionMsg({ text: 'Network failure communicating with security endpoint.', error: true });
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {actionMsg && (
                <div
                    className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                        actionMsg.error
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    }`}
                >
                    {actionMsg.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                    <span>{actionMsg.text}</span>
                </div>
            )}

            {/* Active Sessions Grid */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            ACTIVE ADMINISTRATOR SESSIONS ({activeSessions.length})
                        </h2>
                        <span className="text-[11px] font-mono text-zinc-500">
                            Enforcing 30-minute inactivity timeout. Click Revoke to kill compromised tokens instantly.
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                            <tr>
                                <th className="py-2.5 px-3">Administrator</th>
                                <th className="py-2.5 px-3">Role</th>
                                <th className="py-2.5 px-3">IP Address</th>
                                <th className="py-2.5 px-3">Last Active</th>
                                <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                            {activeSessions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-6 text-center text-zinc-500">
                                        No other active sessions detected.
                                    </td>
                                </tr>
                            ) : (
                                activeSessions.map((session) => (
                                    <tr key={session.id} className="hover:bg-zinc-900/40">
                                        <td className="py-2.5 px-3">
                                            <div className="font-semibold text-zinc-200">{session.admin?.name}</div>
                                            <div className="text-[10px] text-zinc-500">{session.admin?.email}</div>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300">
                                                {session.admin?.role}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-zinc-400">{session.ipAddress}</td>
                                        <td className="py-2.5 px-3 text-zinc-500">
                                            {new Date(session.lastActiveAt).toLocaleTimeString()}
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                            <button
                                                onClick={() => handleRevokeSession(session.id)}
                                                disabled={loadingId === session.id}
                                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[11px] transition-colors disabled:opacity-50"
                                            >
                                                {loadingId === session.id ? 'Revoking...' : 'Force Kill'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Suspicious / Locked Accounts */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-6">
                <h2 className="text-sm font-bold font-mono text-zinc-100 mb-1 flex items-center gap-2">
                    <UserX className="w-4 h-4 text-amber-400" />
                    LOCKED & FLAGGED ADMINISTRATOR ACCOUNTS ({lockedAdmins.length})
                </h2>
                <span className="text-[11px] font-mono text-zinc-500 block mb-4">
                    Accounts locked after 5 consecutive failed passwords.
                </span>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                            <tr>
                                <th className="py-2.5 px-3">Administrator</th>
                                <th className="py-2.5 px-3">Role</th>
                                <th className="py-2.5 px-3">Failed Attempts</th>
                                <th className="py-2.5 px-3">Locked Status</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                            {lockedAdmins.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-6 text-center text-zinc-500">
                                        Zero locked accounts. Security posture clean.
                                    </td>
                                </tr>
                            ) : (
                                lockedAdmins.map((adm) => {
                                    const isLocked = adm.lockedUntil && new Date(adm.lockedUntil) > new Date();
                                    return (
                                        <tr key={adm.id} className="hover:bg-zinc-900/40">
                                            <td className="py-2.5 px-3">
                                                <div className="font-semibold text-zinc-200">{adm.name}</div>
                                                <div className="text-[10px] text-zinc-500">{adm.email}</div>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">
                                                    {adm.role}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-amber-400 font-semibold">{adm.failedLoginAttempts} / 5</td>
                                            <td className="py-2.5 px-3">
                                                {isLocked ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/30">
                                                        LOCKED until {new Date(adm.lockedUntil).toLocaleTimeString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-500">Warning State</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <button
                                                    onClick={() => handleUnlockAdmin(adm.id)}
                                                    disabled={loadingId === adm.id}
                                                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[11px] transition-colors disabled:opacity-50"
                                                >
                                                    {loadingId === adm.id ? 'Unlocking...' : 'Unlock Account'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit Log Stream */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-sm font-bold font-mono text-zinc-100">
                            IMMUTABLE ACTION AUDIT LOG STREAM
                        </h2>
                        <span className="text-[11px] font-mono text-zinc-500">
                            Logging: Who, What, When, IP Address
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 sticky top-0">
                            <tr>
                                <th className="py-2.5 px-4">Timestamp</th>
                                <th className="py-2.5 px-4">Operator</th>
                                <th className="py-2.5 px-4">Action</th>
                                <th className="py-2.5 px-4">Resource</th>
                                <th className="py-2.5 px-4">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                            {auditLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                                        No audit entries recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                auditLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-zinc-900/40">
                                        <td className="py-2 px-4 text-zinc-500 text-[11px]">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td className="py-2 px-4 font-semibold text-zinc-300">
                                            {log.admin?.name || 'System / Unauth'}
                                        </td>
                                        <td className="py-2 px-4">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-700 text-zinc-200">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-2 px-4 text-zinc-400">{log.targetResource}</td>
                                        <td className="py-2 px-4 text-zinc-500">{log.ipAddress}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
