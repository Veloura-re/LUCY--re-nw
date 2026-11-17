import React from 'react';
import { AdminRole } from '@prisma/client';
import { protectAdminPage } from '@/lib/page-guard';
import { AdminShell } from '@/components/admin-shell';
import { prisma } from '@/lib/prisma';
import { LifeBuoy, Search, School, Users, GraduationCap, Eye } from 'lucide-react';

export default async function SupportAdminPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const admin = await protectAdminPage([AdminRole.SUPPORT], '/support');
    const { q } = await searchParams;
    const query = q?.trim() || '';

    const schools = await prisma.school.findMany({
        where: query
            ? {
                  OR: [
                      { name: { contains: query, mode: 'insensitive' } },
                      { schoolCode: { contains: query, mode: 'insensitive' } },
                  ],
              }
            : undefined,
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            schoolCode: true,
            status: true,
            domain: true,
            createdAt: true,
            _count: {
                select: { students: true, users: true, classes: true },
            },
        },
    });

    return (
        <AdminShell admin={admin}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl font-bold font-mono text-zinc-100 flex items-center gap-2">
                        <LifeBuoy className="w-5 h-5 text-cyan-400" />
                        INSTITUTIONAL SUPPORT & SCHOOL DIRECTORY (READ-ONLY)
                    </h1>
                    <p className="text-xs font-mono text-zinc-400 mt-1">
                        Restricted Access: Support Administrator Clearance (Mutations Strictly Blocked)
                    </p>
                </div>

                {/* Search Bar */}
                <form method="GET" className="flex gap-2 max-w-xl">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                        <input
                            type="text"
                            name="q"
                            defaultValue={query}
                            placeholder="Search schools by name or institutional code..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono rounded-lg transition-colors"
                    >
                        Search
                    </button>
                    {query && (
                        <a
                            href="/support"
                            className="px-3 py-2 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-400 text-xs font-mono rounded-lg flex items-center"
                        >
                            Clear
                        </a>
                    )}
                </form>

                {/* Schools Table */}
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                        <h2 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                            <School className="w-4 h-4 text-cyan-400" />
                            REGISTERED SCHOOL DIRECTORY ({schools.length})
                        </h2>
                        <span className="text-xs font-mono text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                            READ-ONLY MODE
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                            <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                                <tr>
                                    <th className="py-3 px-4">School Name</th>
                                    <th className="py-3 px-4">Code</th>
                                    <th className="py-3 px-4">Country</th>
                                    <th className="py-3 px-4">Students</th>
                                    <th className="py-3 px-4">Staff</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Onboarded</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                                {schools.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-zinc-500">
                                            No schools matched the search criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    schools.map((school) => (
                                        <tr key={school.id} className="hover:bg-zinc-900/40">
                                            <td className="py-3 px-4 font-semibold text-zinc-200">
                                                {school.name}
                                            </td>
                                            <td className="py-3 px-4 text-cyan-400 font-bold">
                                                {school.schoolCode || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-zinc-400">{school.domain || 'N/A'}</td>
                                            <td className="py-3 px-4 text-zinc-300">{school._count.students}</td>
                                            <td className="py-3 px-4 text-zinc-300">{school._count.users}</td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                        school.status === 'ACTIVE'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                    }`}
                                                >
                                                    {school.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-zinc-500">
                                                {new Date(school.createdAt).toLocaleDateString()}
                                            </td>
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
