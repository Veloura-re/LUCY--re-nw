"use client";

import React from 'react';
import { format } from 'date-fns';

interface InvoicePrintProps {
    invoice: any;
    student: any;
    school: any;
}

const safeFormatDate = (dateVal: any, fallbackStr = 'N/A') => {
    if (!dateVal) return fallbackStr;
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return fallbackStr;
        return format(d, 'PPP');
    } catch {
        return fallbackStr;
    }
};

export const InvoicePrint = React.forwardRef<HTMLDivElement, InvoicePrintProps>(({ invoice, student, school }, ref) => {
    if (!invoice) return null;

    const safeStudent = student || invoice.student || {
        firstName: "Enrolled",
        lastName: "Scholar",
        studentCode: "N/A"
    };

    const totalAmount = Number(invoice.amount || invoice.totalAmount || 0);
    const paymentsList = Array.isArray(invoice.payments) ? invoice.payments : [];
    const paidAmount = Number(
        invoice.paidAmount ??
        paymentsList.reduce((acc: number, p: any) => {
            const isSettled = p.status === 'PAID' || p.status === 'SETTLED' || p.status === 'SUCCESS' || !p.status;
            return isSettled ? acc + Number(p.amount || 0) : acc;
        }, 0)
    );
    const balanceDue = Math.max(0, totalAmount - paidAmount);

    const items = (Array.isArray(invoice.items) && invoice.items.length > 0)
        ? invoice.items
        : [
            {
                name: invoice.title || invoice.name || invoice.description || 'Institutional Tuition & Academic Fee Protocol',
                amount: totalAmount
            }
        ];

    const invoiceCode = typeof invoice.id === 'string'
        ? invoice.id.slice(-8).toUpperCase()
        : 'REC-001';

    return (
        <div ref={ref} className="p-10 md:p-14 bg-white text-zinc-900 font-sans min-h-[297mm] max-w-[210mm] mx-auto print:m-0 print:p-8 print:w-full print:max-w-none print:shadow-none shadow-xl border border-zinc-200 print:border-none">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-zinc-200 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase italic mb-1">
                        LUCY <span className="text-zinc-600 not-italic">Institutional</span>
                    </h1>
                    <p className="text-xs font-bold text-zinc-700 uppercase tracking-widest">
                        {school?.name || "Educational Institution"}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                        {school?.address || "Campus Digital Ledger Infrastructure"}
                    </p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-black uppercase tracking-widest text-zinc-900">
                        Official Academic Receipt
                    </h2>
                    <p className="text-xs font-mono font-bold text-zinc-600 mt-1 italic">
                        #{invoiceCode}
                    </p>
                    <div className="mt-3 text-[10px] font-mono text-zinc-600 uppercase tracking-wider space-y-0.5">
                        <p>Issued: {safeFormatDate(invoice.createdAt, 'Current Term')}</p>
                        <p className="text-zinc-900 font-bold">Due Date: {safeFormatDate(invoice.dueDate, 'On Record')}</p>
                    </div>
                </div>
            </div>

            {/* Bill To & Status Ribbon */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Scholar Profile</h3>
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                        <p className="font-bold text-base text-zinc-900">
                            {safeStudent.firstName} {safeStudent.lastName}
                        </p>
                        <p className="text-xs text-zinc-600 mt-0.5 font-mono">
                            Student ID: {safeStudent.studentCode}
                        </p>
                        <p className="text-xs text-zinc-600 font-medium mt-0.5">
                            Grade: {safeStudent.grade?.name || safeStudent.grade?.level || "Enrolled Tier"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col justify-end items-end">
                    <div className="text-right">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Settlement Status</h3>
                        <div className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-widest border ${
                            invoice.status === 'PAID' || balanceDue === 0
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                : "bg-amber-50 border-amber-300 text-amber-800"
                        }`}>
                            {invoice.status === 'PAID' || balanceDue === 0 ? "PAID / SETTLED" : (invoice.status || "PENDING")}
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8">
                <thead>
                    <tr className="border-b-2 border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        <th className="py-3 text-left">Protocol Item</th>
                        <th className="py-3 text-right">Qty</th>
                        <th className="py-3 text-right">Unit Price</th>
                        <th className="py-3 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                    {items.map((item: any, idx: number) => {
                        const itmAmount = Number(item.amount || 0);
                        return (
                            <tr key={idx}>
                                <td className="py-3 font-medium text-zinc-900 uppercase">
                                    {item.name || item.description || "Tuition Allocation"}
                                </td>
                                <td className="py-3 text-right font-mono text-zinc-600">1</td>
                                <td className="py-3 text-right font-mono text-zinc-600">${itmAmount.toFixed(2)}</td>
                                <td className="py-3 text-right font-mono text-zinc-900 font-bold">${itmAmount.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Totals Section */}
            <div className="flex justify-end mb-12">
                <div className="w-72 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Subtotal</span>
                        <span className="font-mono font-medium text-zinc-900">${totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Institution Subsidy</span>
                        <span className="font-mono font-medium text-zinc-900">$0.00</span>
                    </div>
                    <div className="pt-2 border-t-2 border-zinc-200 flex justify-between items-center">
                        <span className="text-zinc-900 font-bold uppercase tracking-wider text-xs">Total Invoiced</span>
                        <span className="text-lg font-mono font-bold text-zinc-900">${totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <span className="font-bold uppercase tracking-widest text-[9px]">Amount Paid</span>
                        <span className="font-mono font-bold">-${paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                        <span className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">Balance Due</span>
                        <span className="text-base font-mono font-bold text-zinc-900">${balanceDue.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-8 border-t border-zinc-200 text-center">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-1">
                    Institutional Verification & Audit Record
                </p>
                <p className="text-[8px] text-zinc-400 leading-relaxed max-w-md mx-auto uppercase tracking-widest">
                    This document serves as an official institutional academic receipt. Issued by LUCY Digital Infrastructure.
                </p>
            </div>
        </div>
    );
});

InvoicePrint.displayName = 'InvoicePrint';
