"use client";

import React from 'react';
import { cn } from "@/lib/utils";

interface StudentRegistryPrintProps {
    students: any[];
    title?: string;
}

export const StudentRegistryPrint = React.forwardRef<HTMLDivElement, StudentRegistryPrintProps>(
    ({ students, title = "Official Student Registry" }, ref) => {
        // Group students by class
        const groupedStudents = students.reduce((acc: any, student: any) => {
            const className = student.class?.name || "Unassigned";
            if (!acc[className]) acc[className] = [];
            acc[className].push(student);
            return acc;
        }, {});

        const classNames = Object.keys(groupedStudents).sort();

        return (
            <div ref={ref} className="p-12 bg-white text-black min-h-screen print:p-8">
                {/* Branding / Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-10">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tighter uppercase italic">LUCY <span className="text-zinc-600 dark:text-zinc-400 not-italic">Institutional Network</span></h1>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] mt-2 text-zinc-600 dark:text-zinc-500">{title}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Generated On</p>
                        <p className="text-sm font-bold">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                {classNames.map((className, index) => (
                    <div key={className} className={cn("mb-16", index > 0 && "print:break-before-page")}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-10 w-1 bg-white dark:bg-black" />
                            <h2 className="text-2xl font-bold uppercase tracking-tight italic">Class: {className}</h2>
                            <div className="flex-1 h-px bg-zinc-100" />
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">{groupedStudents[className].length} Entities</span>
                        </div>

                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-200 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-500 text-left">
                                    <th className="py-4 px-2 w-12">#</th>
                                    <th className="py-4 px-2">ID Code</th>
                                    <th className="py-4 px-2">Full Legal Name</th>
                                    <th className="py-4 px-2">Gender</th>
                                    <th className="py-4 px-2">Guardian Contact</th>
                                    <th className="py-4 px-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedStudents[className].sort((a: any, b: any) =>
                                    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
                                ).map((student: any, idx: number) => (
                                    <tr key={student.id} className="border-b border-zinc-100 text-xs hover:bg-zinc-50 transition-colors">
                                        <td className="py-4 px-2 text-zinc-600 dark:text-zinc-400 font-mono">{idx + 1}</td>
                                        <td className="py-4 px-2 font-bold tracking-tight">{student.studentCode}</td>
                                        <td className="py-4 px-2 font-bold uppercase tracking-tight">
                                            {student.firstName} <span className="text-zinc-600 dark:text-zinc-400">{student.lastName}</span>
                                        </td>
                                        <td className="py-4 px-2 text-zinc-600 dark:text-zinc-500 font-medium">{student.gender?.[0] || 'U'}</td>
                                        <td className="py-4 px-2 text-zinc-600 dark:text-zinc-500 font-medium">
                                            {student.guardianName} ({student.guardianPhone})
                                        </td>
                                        <td className="py-4 px-2">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border",
                                                student.enrollmentStatus === 'ACTIVE' ? "bg-zinc-100 border-zinc-200 text-zinc-800 dark:text-zinc-200" : "bg-zinc-50 border-zinc-100 text-zinc-700 dark:text-zinc-300"
                                            )}>
                                                {student.enrollmentStatus}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Footer for the page */}
                        <div className="mt-8 flex justify-between items-center text-[8px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-[0.4em]">
                            <span>LUCY System Protocol :: Registry Export</span>
                            <span>Institutional Verification Required</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
);

StudentRegistryPrint.displayName = "StudentRegistryPrint";
