"use client";

import React from 'react';
import { cn } from "@/lib/utils";

interface AssessmentPrintProps {
    exam: any;
    students: any[];
}

export const AssessmentPrint = React.forwardRef<HTMLDivElement, AssessmentPrintProps>(
    ({ exam, students }, ref) => {
        const calculateGrade = (score: any, total: number) => {
            if (!score && score !== 0) return "-";
            const num = parseFloat(score);
            if (isNaN(num)) return "-";
            const pct = (num / total) * 100;
            if (pct >= 90) return "A+";
            if (pct >= 80) return "A";
            if (pct >= 70) return "B";
            if (pct >= 60) return "C";
            if (pct >= 50) return "D";
            return "F";
        };

        return (
            <div ref={ref} className="p-12 bg-white text-black min-h-screen print:p-8">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-10">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tighter uppercase italic">LUCY <span className="text-zinc-600 dark:text-zinc-400 not-italic">Grading Sheet</span></h1>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] mt-2 text-zinc-500">{exam.title}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Assessment Category</p>
                        <p className="text-sm font-bold uppercase">{exam.category?.replace('_', ' ')}</p>
                        <p className="text-[10px] font-medium text-zinc-500 mt-1">{exam.className} • {exam.subjectName}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-8 mb-10">
                    <div className="bg-zinc-50 p-4 border border-zinc-100 italic">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 mb-1">Total Marks</p>
                        <p className="text-xl font-bold">{exam.totalMarks}</p>
                    </div>
                    <div className="bg-zinc-50 p-4 border border-zinc-100 italic">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 mb-1">Class Average</p>
                        <p className="text-xl font-bold">
                            {(students.reduce((acc, s) => acc + (parseFloat(s.score) || 0), 0) / (students.filter(s => s.score !== null).length || 1)).toFixed(1)}
                        </p>
                    </div>
                    <div className="bg-zinc-50 p-4 border border-zinc-100 italic text-right">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 mb-1">Date Generated</p>
                        <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-black text-[10px] font-bold uppercase tracking-widest text-left">
                            <th className="py-4 px-2 w-12">#</th>
                            <th className="py-4 px-2">Student Name</th>
                            <th className="py-4 px-2 text-center w-32">Score / {exam.totalMarks}</th>
                            <th className="py-4 px-2 text-center w-24">Grade</th>
                            <th className="py-4 px-2">Remarks / Observations</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, idx) => {
                            const grade = calculateGrade(student.score, exam.totalMarks);
                            return (
                                <tr key={student.id} className="border-b border-zinc-100 text-xs">
                                    <td className="py-4 px-2 text-zinc-600 dark:text-zinc-400 font-mono">{idx + 1}</td>
                                    <td className="py-4 px-2 font-bold uppercase">
                                        {student.firstName} <span className="text-zinc-600 dark:text-zinc-400">{student.lastName}</span>
                                        <div className="text-[8px] font-mono text-zinc-700 dark:text-zinc-300">{student.studentCode}</div>
                                    </td>
                                    <td className="py-4 px-2 text-center font-bold text-lg">{student.score ?? '-'}</td>
                                    <td className="py-4 px-2 text-center font-bold">{grade}</td>
                                    <td className="py-4 px-2 text-zinc-500 italic">{student.remark || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="mt-20 grid grid-cols-2 gap-20">
                    <div className="space-y-4 text-center">
                        <div className="h-px bg-white dark:bg-black w-full mb-2" />
                        <p className="text-[10px] font-black uppercase text-zinc-800">{exam.createdBy?.name || 'Faculty Member'}</p>
                        <p className="text-[8px] font-bold uppercase tracking-[0.3em]">Examiner Signature</p>
                    </div>
                    <div className="space-y-4">
                        <div className="h-px bg-white dark:bg-black w-full" />
                        <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-center">Academic Dean / Principal</p>
                    </div>
                </div>
            </div>
        );
    }
);

AssessmentPrint.displayName = "AssessmentPrint";
