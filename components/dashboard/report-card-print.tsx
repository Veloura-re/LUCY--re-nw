"use client";

import React from 'react';
import { format } from 'date-fns';

interface ReportCardPrintProps {
    subjects: any[];
    studentName: string;
    school: any;
    studentId: string;
}

export const ReportCardPrint = React.forwardRef<HTMLDivElement, ReportCardPrintProps>(({ subjects, studentName, school, studentId }, ref) => {
    if (!subjects || subjects.length === 0) return null;

    const overallAverage = subjects.reduce((acc, sub) => acc + (sub.average || 0), 0) / subjects.length;

    return (
        <div ref={ref} className="p-16 bg-white text-black font-sans min-h-screen">
            {/* Header */}
            <div className="text-center border-b-4 border-zinc-900 pb-10 mb-10">
                <h1 className="text-5xl font-bold tracking-tighter text-zinc-900 uppercase italic mb-2">
                    LUCY <span className="text-zinc-400 not-italic">Academics</span>
                </h1>
                <h2 className="text-2xl font-bold uppercase tracking-[0.3em] text-zinc-500 mb-6">Official Academic Report Card</h2>

                <div className="flex justify-between items-end mt-12 bg-zinc-50 p-8 rounded-[2rem] border border-zinc-100">
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Student Individual</p>
                        <p className="text-3xl font-bold text-zinc-900 tracking-tight">{studentName}</p>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mt-2 italic">ID: {studentId.slice(-8).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Institutional Context</p>
                        <p className="text-xl font-bold text-zinc-900 uppercase tracking-tight">{school?.name || "Educational Nexus"}</p>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mt-1">Generated: {format(new Date(), 'PPP')}</p>
                    </div>
                </div>
            </div>

            {/* Performance Summary Grid */}
            <div className="grid grid-cols-3 gap-8 mb-12">
                <div className="p-6 bg-zinc-900 text-white rounded-[2rem] text-center">
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-2">Cumulative GPA</p>
                    <p className="text-4xl font-bold italic tracking-tighter">{(overallAverage / 20).toFixed(2)}</p>
                </div>
                <div className="p-6 border-2 border-zinc-900 rounded-[2rem] text-center">
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-2">Average Score</p>
                    <p className="text-4xl font-bold italic tracking-tighter">{overallAverage.toFixed(1)}%</p>
                </div>
                <div className="p-6 bg-zinc-50 rounded-[2rem] text-center border border-zinc-100">
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-2">Academic Standing</p>
                    <p className="text-xl font-bold uppercase tracking-tight mt-1">{overallAverage >= 90 ? "Elite" : overallAverage >= 75 ? "Distinction" : "Merit"}</p>
                </div>
            </div>

            {/* Subjects Table */}
            <div className="space-y-6">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-[0.4em] pl-4 border-l-4 border-zinc-900">Academic Breakdown</h3>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-zinc-950 text-white">
                            <th className="p-4 text-left text-[10px] font-bold uppercase tracking-widest rounded-tl-2xl">Subject Entity</th>
                            <th className="p-4 text-center text-[10px] font-bold uppercase tracking-widest">Base Points</th>
                            <th className="p-4 text-center text-[10px] font-bold uppercase tracking-widest">Max Points</th>
                            <th className="p-4 text-right text-[10px] font-bold uppercase tracking-widest rounded-tr-2xl">Performance %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {subjects.map((sub: any, idx: number) => (
                            <tr key={idx} className="group hover:bg-zinc-50 transition-colors">
                                <td className="p-5">
                                    <p className="font-bold text-zinc-900 uppercase tracking-tight">{sub.subjectName}</p>
                                    <p className="text-[8px] font-medium text-zinc-400 uppercase tracking-widest mt-1">Core Requirement</p>
                                </td>
                                <td className="p-5 text-center font-bold text-zinc-500">
                                    {sub.exams.reduce((acc: number, e: any) => acc + (e.score || 0), 0)}
                                </td>
                                <td className="p-5 text-center font-bold text-zinc-500">
                                    {sub.exams.reduce((acc: number, e: any) => acc + (e.maxScore || 100), 0)}
                                </td>
                                <td className="p-5 text-right font-bold text-zinc-900 italic text-xl">
                                    {sub.average.toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Assessment Details Breakdown */}
            <div className="mt-16 space-y-8">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-[0.4em] pl-4 border-l-4 border-zinc-900">Neural Assessment Log</h3>
                <div className="grid grid-cols-2 gap-8">
                    {subjects.map((sub: any, idx: number) => (
                        <div key={idx} className="border border-zinc-100 rounded-[2rem] overflow-hidden">
                            <div className="bg-zinc-50 p-4 border-b border-zinc-100">
                                <p className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">{sub.subjectName}</p>
                            </div>
                            <div className="p-6 space-y-3">
                                {sub.exams.map((exam: any, eIdx: number) => (
                                    <div key={eIdx} className="flex justify-between items-center bg-white border border-zinc-50 p-3 rounded-xl shadow-sm">
                                        <div>
                                            <p className="text-[10px] font-medium text-zinc-800 uppercase tracking-tight">{exam.title}</p>
                                            <p className="text-[8px] text-zinc-400 italic">{new Date(exam.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="font-bold text-zinc-900">{exam.score} / {exam.maxScore}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer / Auth */}
            <div className="mt-24 pt-12 border-t-2 border-zinc-200">
                <div className="flex justify-between items-start">
                    <div className="w-1/3">
                        <div className="h-px bg-zinc-900 mb-4" />
                        <p className="text-[8px] font-bold text-zinc-900 uppercase tracking-widest text-center">Institutional Registrar</p>
                    </div>
                    <div className="w-1/3 text-center">
                        <div className="w-20 h-20 bg-zinc-50 border border-zinc-100 rounded-full mx-auto flex items-center justify-center mb-4">
                            <span className="text-[8px] font-bold text-zinc-300 uppercase italic">Seal</span>
                        </div>
                    </div>
                    <div className="w-1/3 text-right">
                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-2 leading-relaxed italic">
                            Official Academic Record for {studentName}
                        </p>
                        <p className="text-[8px] text-zinc-300 uppercase tracking-widest">
                            Verified via LUCY Neural Protocol
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
});

ReportCardPrint.displayName = 'ReportCardPrint';
