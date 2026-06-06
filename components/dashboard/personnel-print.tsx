"use client";

import React from 'react';
import { cn } from "@/lib/utils";

interface PersonnelPrintProps {
    data: any[];
    title?: string;
    type?: 'TEACHER' | 'STAFFING';
}

export const PersonnelPrint = React.forwardRef<HTMLDivElement, PersonnelPrintProps>(
    ({ data, title = "Personnel Registry", type = 'TEACHER' }, ref) => {
        return (
            <div ref={ref} className="p-12 bg-white text-black min-h-screen print:p-8">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-10">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tighter uppercase italic">LUCY <span className="text-zinc-400 not-italic">Institutional Network</span></h1>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] mt-2 text-zinc-500">{title}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Generated On</p>
                        <p className="text-sm font-bold">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-black text-[10px] font-bold uppercase tracking-widest text-left">
                            <th className="py-4 px-2 w-12">#</th>
                            <th className="py-4 px-2">Personnel ID</th>
                            <th className="py-4 px-2">Full Legal Name</th>
                            {type === 'TEACHER' ? (
                                <>
                                    <th className="py-4 px-2">Subject Expert</th>
                                    <th className="py-4 px-2">Primary Class</th>
                                </>
                            ) : (
                                <>
                                    <th className="py-4 px-2">Assigned Class</th>
                                    <th className="py-4 px-2">Subject Assigned</th>
                                </>
                            )}
                            <th className="py-4 px-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, idx) => (
                            <tr key={item.id} className="border-b border-zinc-100 text-xs">
                                <td className="py-4 px-2 text-zinc-400 font-mono">{idx + 1}</td>
                                <td className="py-4 px-2 font-bold tracking-tight">{item.teacherCode || item.staffCode || '-'}</td>
                                <td className="py-4 px-2 font-bold uppercase">
                                    {item.name || item.teacher?.name || "Pending Setup"}
                                </td>
                                {type === 'TEACHER' ? (
                                    <>
                                        <td className="py-4 px-2 text-zinc-500 font-medium uppercase tracking-tighter">{item.subject?.name || '-'}</td>
                                        <td className="py-4 px-2 text-zinc-500 font-medium uppercase tracking-tighter">{item.class?.name || '-'}</td>
                                    </>
                                ) : (
                                    <>
                                        <td className="py-4 px-2 text-zinc-500 font-medium uppercase tracking-tighter">{item.class?.name || '-'}</td>
                                        <td className="py-4 px-2 text-zinc-500 font-medium uppercase tracking-tighter">{item.subject?.name || '-'}</td>
                                    </>
                                )}
                                <td className="py-4 px-2">
                                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-[8px] font-bold uppercase tracking-widest text-zinc-800">
                                        Verified
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="mt-20 flex justify-between items-center text-[8px] font-bold text-zinc-300 uppercase tracking-[0.4em]">
                    <span>LUCY System Protocol :: Personnel Export</span>
                    <span>Institutional Verification Required</span>
                </div>
            </div>
        );
    }
);

PersonnelPrint.displayName = "PersonnelPrint";
