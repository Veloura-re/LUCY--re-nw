"use client";

import React from 'react';
import { format } from 'date-fns';

interface InvoicePrintProps {
    invoice: any;
    student: any;
    school: any;
}

export const InvoicePrint = React.forwardRef<HTMLDivElement, InvoicePrintProps>(({ invoice, student, school }, ref) => {
    if (!invoice || !student) return null;

    const totalAmount = Number(invoice.amount);
    const paidAmount = invoice.payments?.reduce((acc: number, p: any) => p.status === 'PAID' ? acc + Number(p.amount) : acc, 0) || 0;
    const balanceDue = totalAmount - paidAmount;

    return (
        <div ref={ref} className="p-12 bg-white text-black font-sans min-h-[297mm]">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-zinc-200 pb-8 mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tighter text-zinc-900 uppercase italic mb-2">
                        LUCY <span className="text-zinc-400 not-italic">Institutional</span>
                    </h1>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{school?.name || "Educational Institution"}</p>
                    <p className="text-[10px] text-zinc-400 mt-1">{school?.address || "Campus Infrastructure Hub"}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold uppercase tracking-widest text-zinc-900">Official Invoice</h2>
                    <p className="text-sm font-bold text-zinc-500 mt-1 italic">#{invoice.id.slice(-8).toUpperCase()}</p>
                    <div className="mt-4 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                        <p>Issued: {format(new Date(invoice.createdAt), 'PPP')}</p>
                        <p className="text-zinc-900 font-bold mt-1">Due Date: {format(new Date(invoice.dueDate), 'PPP')}</p>
                    </div>
                </div>
            </div>

            {/* Bill To & Details */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3">Bill To:</h3>
                    <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                        <p className="font-bold text-lg text-zinc-900">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-zinc-600 mt-1 uppercase font-medium">Student ID: {student.studentCode}</p>
                        <p className="text-xs text-zinc-600 uppercase font-medium">Grade {student.grade?.level || "N/A"}</p>
                    </div>
                </div>
                <div className="flex flex-col justify-end items-end">
                    <div className="text-right">
                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">Status:</h3>
                        <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border ${invoice.status === 'PAID' ? "bg-green-50 border-green-200 text-green-700" : "bg-zinc-50 border-zinc-200 text-zinc-700"
                            }`}>
                            {invoice.status}
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-12">
                <thead>
                    <tr className="border-b-2 border-zinc-900">
                        <th className="py-4 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Description</th>
                        <th className="py-4 text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Quantity</th>
                        <th className="py-4 text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Unit Price</th>
                        <th className="py-4 text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {invoice.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="py-4 text-sm font-medium text-zinc-900 uppercase tracking-tight">{item.name}</td>
                            <td className="py-4 text-right text-sm text-zinc-600">1</td>
                            <td className="py-4 text-right text-sm text-zinc-600">${Number(item.amount).toFixed(2)}</td>
                            <td className="py-4 text-right text-sm font-bold text-zinc-900">${Number(item.amount).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals Section */}
            <div className="flex justify-end">
                <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-500 font-medium uppercase tracking-widest text-[10px]">Subtotal</span>
                        <span className="font-medium text-zinc-900">${totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-500 font-medium uppercase tracking-widest text-[10px]">Applied Credits</span>
                        <span className="font-medium text-zinc-900">$0.00</span>
                    </div>
                    <div className="pt-3 border-t-2 border-zinc-900 flex justify-between items-center">
                        <span className="text-zinc-900 font-bold uppercase tracking-[0.2em] text-xs">Total Amount</span>
                        <span className="text-xl font-bold text-zinc-900">${totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-700 bg-green-50 p-2 rounded-lg mt-2">
                        <span className="font-bold uppercase tracking-widest text-[8px]">Amount Paid</span>
                        <span className="font-bold">-${paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Balance Due</span>
                        <span className="text-lg font-bold text-zinc-900">${balanceDue.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-24 border-t border-zinc-100 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em] mb-2">Institutional Protocol Notification</p>
                <p className="text-[8px] text-zinc-400 leading-relaxed max-w-lg mx-auto uppercase tracking-widest">
                    This document serves as an official academic financial record. All payments are subject to institutional verification.
                    LUCY Digital Infrastructure - Secure Transaction Vault.
                </p>
            </div>
        </div>
    );
});

InvoicePrint.displayName = 'InvoicePrint';
