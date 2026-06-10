"use client";

import React from 'react';
import { cn } from "@/lib/utils";

interface Column {
    id: string;
    title: string;
    maxMarks: number;
}

interface MarklistPrintProps {
    config: any;
    entries: any[];
}

export const MarklistPrint = React.forwardRef<HTMLDivElement, MarklistPrintProps>(
    ({ config, entries }, ref) => {
        return (
            <div ref={ref} className="p-10 bg-white text-black min-h-screen print:p-6 landscape-print">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { size: landscape; margin: 10mm; }
                        .landscape-print { width: 100% !important; }
                    }
                `}} />

                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tighter uppercase italic">LUCY <span className="text-zinc-400 not-italic">Academic Matrix</span></h1>
                        <div className="flex gap-4 mt-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] bg-black text-white px-2 py-1">Class: {config.class?.name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] bg-zinc-100 text-zinc-800 px-2 py-1">Subject: {config.subject?.name}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Registry Reference</p>
                        <p className="text-xs font-mono font-bold">MK-{config.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-[10px] font-medium text-zinc-500 mt-1">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Matrix Table */}
                <table className="w-full border-collapse border border-zinc-200">
                    <thead>
                        <tr className="bg-zinc-50 text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                            <th className="border border-zinc-200 p-2 w-10">#</th>
                            <th className="border border-zinc-200 p-2 text-left min-w-[150px]">Student Entity</th>
                            {config.columns.map((col: Column) => (
                                <th key={col.id} className="border border-zinc-200 p-2 text-center">
                                    <div className="flex flex-col">
                                        <span>{col.title}</span>
                                        <span className="text-[7px] text-zinc-400">MAX {col.maxMarks}</span>
                                    </div>
                                </th>
                            ))}
                            <th className="border border-zinc-200 p-2 text-center w-16 bg-zinc-100/50">Total</th>
                            <th className="border border-zinc-200 p-2 text-center w-16 bg-zinc-100">%</th>
                            <th className="border border-zinc-200 p-2 text-center w-12">Gr</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry, idx) => (
                            <tr key={entry.id} className="text-[10px] border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                                <td className="border border-zinc-200 p-2 text-center font-mono text-zinc-400">{idx + 1}</td>
                                <td className="border border-zinc-200 p-2 font-bold uppercase">
                                    {entry.student.firstName} {entry.student.lastName}
                                    <div className="text-[7px] text-zinc-400 font-mono tracking-tighter">{entry.student.studentCode}</div>
                                </td>
                                {config.columns.map((col: Column) => {
                                    const mark = entry.marks.find((m: any) => m.columnId === col.id);
                                    const score = mark ? mark.score : "-";
                                    return (
                                        <td key={col.id} className="border border-zinc-200 p-2 text-center font-bold">
                                            {score}
                                        </td>
                                    );
                                })}
                                <td className="border border-zinc-200 p-2 text-center font-black bg-zinc-50/30">{entry.total}</td>
                                <td className="border border-zinc-200 p-2 text-center font-black bg-zinc-50">{Math.round(entry.percentage)}%</td>
                                <td className="border border-zinc-200 p-2 text-center">
                                    <span className="font-bold border border-zinc-200 px-1 py-0.5 rounded text-[8px] bg-white">
                                        {entry.grade}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer Section */}
                <div className="mt-12 flex justify-between items-end border-t border-dashed border-zinc-200 pt-8">
                    <div className="space-y-4">
                        <div className="w-48 h-px bg-zinc-300" />
                        <div className="flex flex-col">
                            <p className="text-[10px] font-black uppercase text-zinc-800">{config.teacher?.name || 'Faculty Member'}</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 mt-1">Subject Faculty Signature</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="w-48 h-px bg-zinc-300" />
                        <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Head of Department / Director</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[7px] font-black text-zinc-200 uppercase tracking-[0.6em]">AUTHENTICATED BY LUCY CORE</p>
                    </div>
                </div>
            </div>
        );
    }
);

MarklistPrint.displayName = "MarklistPrint";
