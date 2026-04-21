"use client";

import React from 'react';
import { cn } from "@/lib/utils";

interface LibraryPrintProps {
    books: any[];
    title?: string;
}

export const LibraryPrint = React.forwardRef<HTMLDivElement, LibraryPrintProps>(
    ({ books, title = "Institutional Library Registry" }, ref) => {
        return (
            <div ref={ref} className="p-12 bg-white text-black min-h-screen print:p-8">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-10">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tighter uppercase italic">LUCY <span className="text-zinc-400 not-italic">Institutional Library</span></h1>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] mt-2 text-zinc-500">{title}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Inventory Sync Date</p>
                        <p className="text-sm font-bold">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-black text-[10px] font-bold uppercase tracking-widest text-left">
                            <th className="py-4 px-2 w-12">#</th>
                            <th className="py-4 px-2">Catalog No.</th>
                            <th className="py-4 px-2">Book Title & Metadata</th>
                            <th className="py-4 px-2">Subject</th>
                            <th className="py-4 px-2">Category</th>
                            <th className="py-4 px-2 text-right">Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        {books.map((book, idx) => (
                            <tr key={book.id} className="border-b border-zinc-100 text-xs">
                                <td className="py-4 px-2 text-zinc-400 font-mono">{idx + 1}</td>
                                <td className="py-4 px-2 font-bold tracking-tight">{book.isbn || 'N/A'}</td>
                                <td className="py-4 px-2 font-bold uppercase">
                                    {book.title}
                                    <div className="text-[8px] font-medium text-zinc-400 normal-case tracking-normal">Author: {book.author || 'Institutional'}</div>
                                </td>
                                <td className="py-4 px-2 text-zinc-500 font-medium">{book.subject || '-'}</td>
                                <td className="py-4 px-2 text-zinc-500 font-medium uppercase tracking-widest">{book.category || '-'}</td>
                                <td className="py-4 px-2 text-right font-mono font-bold">{book.totalCopies}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="mt-20 flex justify-between items-center text-[8px] font-bold text-zinc-300 uppercase tracking-[0.4em]">
                    <span>LUCY System Protocol :: Library Export</span>
                    <span>Institutional Verification Required</span>
                </div>
            </div>
        );
    }
);

LibraryPrint.displayName = "LibraryPrint";
