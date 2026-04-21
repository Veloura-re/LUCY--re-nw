"use client";

import { useRef } from "react";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintRegistryButton({ configs }: { configs: any[] }) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrintFn = useReactToPrint({
        contentRef: printRef,
        documentTitle: `marklist_registry_${new Date().toISOString().slice(0, 10)}`,
    });

    const triggerPrint = () => {
        if (handlePrintFn) handlePrintFn();
    }

    return (
        <>
            <Button
                onClick={triggerPrint}
                className="bg-eduGreen-600 border-eduGreen-500 text-white hover:bg-eduGreen-500 h-14 px-8 rounded-2xl font-medium text-xs uppercase tracking-[0.2em] shadow-xl shadow-eduGreen-900/20 transition-all active:scale-95"
            >
                <Printer className="w-4 h-4 mr-2" /> Export PDF Registry
            </Button>

            {/* Hidden Print Template */}
            <div className="absolute -left-[9999px] top-0 overflow-hidden" aria-hidden="true">
                <div ref={printRef} className="p-12 bg-white text-black min-h-screen">
                    <h1 className="text-3xl font-bold mb-8 uppercase tracking-tighter italic">LUCY Marklist Registry</h1>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-black text-[10px] font-bold uppercase text-left">
                                <th className="p-2">Subject</th>
                                <th className="p-2">Class</th>
                                <th className="p-2 text-center">Cols</th>
                                <th className="p-2 text-center">Entries</th>
                                <th className="p-2">Last Sync</th>
                            </tr>
                        </thead>
                        <tbody>
                            {configs.map((c) => (
                                <tr key={c.id} className="border-b border-zinc-100 text-xs">
                                    <td className="p-2 font-bold uppercase">{c.subject.name}</td>
                                    <td className="p-2 uppercase">{c.class.name}</td>
                                    <td className="p-2 text-center">{c._count.columns}</td>
                                    <td className="p-2 text-center">{c._count.entries}</td>
                                    <td className="p-2">{format(new Date(c.updatedAt), 'MMM do, yyyy')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
