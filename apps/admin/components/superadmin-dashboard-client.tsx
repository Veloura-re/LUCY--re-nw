'use client';

import React, { useState } from 'react';
import { Crown, UserPlus, Trash2, Edit3, ShieldAlert, CheckCircle, AlertCircle, X } from 'lucide-react';
import { AdminRole } from '@prisma/client';

interface SuperadminDashboardClientProps {
    initialAdmins: any[];
    metrics: {
        schoolsCount: number;
        studentsCount: number;
        teachersCount: number;
        totalAuditCount: number;
    };
}

export function SuperadminDashboardClient({ initialAdmins, metrics }: SuperadminDashboardClientProps) {
    const [admins, setAdmins] = useState(initialAdmins);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<AdminRole>(AdminRole.FINANCE);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMsg(null);

        try {
            const res = await fetch('/api/admin/superadmin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'CREATE_ADMIN',
                    name,
                    email,
                    password,
                    role,
                }),
            });

            const data = (await res.json()) as { error?: string; admin?: any };
            if (res.ok && data.admin) {
                setAdmins((prev) => [...prev, data.admin]);
                setShowInviteModal(false);
                setName('');
                setEmail('');
                setPassword('');
                setMsg({ text: `Administrator account for ${data.admin.email} provisioned successfully.` });
            } else {
                setMsg({ text: data.error || 'Failed to create administrator.', error: true });
            }
        } catch {
            setMsg({ text: 'Network failure communicating with admin provisioning endpoint.', error: true });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAdmin = async (adminId: string, adminRole: string) => {
        if (adminRole === 'SUPERADMIN') {
            alert('The root superadmin cannot be deleted.');
            return;
        }

        if (!confirm('Are you sure you want to delete this administrator account? All active sessions will be terminated.')) {
            return;
        }

        try {
            const res = await fetch('/api/admin/superadmin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'DELETE_ADMIN', adminId }),
            });

            const deleteResult = (await res.json()) as { error?: string; success?: boolean };
            if (res.ok) {
                setAdmins((prev) => prev.filter((a) => a.id !== adminId));
                setMsg({ text: 'Administrator removed successfully.' });
            } else {
                setMsg({ text: deleteResult.error || 'Failed to delete administrator.', error: true });
            }
        } catch {
            setMsg({ text: 'Network error deleting administrator.', error: true });
        }
    };

    return (
        <div className="space-y-6">
            {msg && (
                <div
                    className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                        msg.error
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    }`}
                >
                    {msg.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                    <span>{msg.text}</span>
                </div>
            )}

            {/* Platform Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Total Schools
                    </span>
                    <div className="text-2xl font-bold font-mono text-zinc-100">{metrics.schoolsCount}</div>
                    <span className="text-[11px] text-zinc-500 mt-1 block">Active platform tenants</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Total Students
                    </span>
                    <div className="text-2xl font-bold font-mono text-zinc-100">{metrics.studentsCount}</div>
                    <span className="text-[11px] text-zinc-500 mt-1 block">Enrolled scholars</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Faculty & Staff
                    </span>
                    <div className="text-2xl font-bold font-mono text-zinc-100">{metrics.teachersCount}</div>
                    <span className="text-[11px] text-zinc-500 mt-1 block">Teachers and homerooms</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Audit Ledger Events
                    </span>
                    <div className="text-2xl font-bold font-mono text-amber-400">{metrics.totalAuditCount}</div>
                    <span className="text-[11px] text-zinc-500 mt-1 block">Recorded operations</span>
                </div>
            </div>

            {/* Administrator Management Roster */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-400" />
                            ADMINISTRATOR ROSTER & ROLE CLEARANCE
                        </h2>
                        <span className="text-[11px] font-mono text-zinc-500">
                            Strict Invariant: Exactly one superadmin exists.
                        </span>
                    </div>

                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        Provision Admin
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                            <tr>
                                <th className="py-3 px-4">Name</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Role</th>
                                <th className="py-3 px-4">Created Date</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                            {admins.map((adm) => (
                                <tr key={adm.id} className="hover:bg-zinc-900/40">
                                    <td className="py-3 px-4 font-semibold text-zinc-200">{adm.name}</td>
                                    <td className="py-3 px-4 text-zinc-400">{adm.email}</td>
                                    <td className="py-3 px-4">
                                        <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                adm.role === 'SUPERADMIN'
                                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                                    : adm.role === 'FINANCE'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                    : adm.role === 'SECURITY'
                                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                                    : adm.role === 'DEVELOPER'
                                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                            }`}
                                        >
                                            {adm.role}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-zinc-500">
                                        {new Date(adm.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        {adm.role !== 'SUPERADMIN' && (
                                            <button
                                                onClick={() => handleDeleteAdmin(adm.id, adm.role)}
                                                className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                                                title="Delete Administrator"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
                        <button
                            onClick={() => setShowInviteModal(false)}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <h3 className="text-sm font-bold font-mono text-zinc-100 mb-1">
                            PROVISION ADMINISTRATOR ACCOUNT
                        </h3>
                        <p className="text-xs text-zinc-400 mb-4 font-mono">
                            Assign departmental role. Superadmin cannot be duplicated.
                        </p>

                        <form onSubmit={handleCreateAdmin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono text-zinc-400 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Sarah Jenkins"
                                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-zinc-400 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="sarah.finance@5-cn.net"
                                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-zinc-400 mb-1">Initial Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={10}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Minimum 10 characters"
                                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-zinc-400 mb-1">Role Clearance</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as AdminRole)}
                                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                                >
                                    <option value={AdminRole.FINANCE}>FINANCE (Revenue, Payroll, Fees, Gateways)</option>
                                    <option value={AdminRole.SECURITY}>SECURITY (Auth Logs, Sessions, Clearance)</option>
                                    <option value={AdminRole.DEVELOPER}>DEVELOPER (Telemetry, Error Logs, Health)</option>
                                    <option value={AdminRole.SUPPORT}>SUPPORT (School Directory, Read-Only)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono rounded disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : 'Provision'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
