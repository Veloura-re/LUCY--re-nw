"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    CreditCard,
    ArrowRight,
    CheckCircle2,
    Clock,
    AlertCircle,
    User,
    GraduationCap,
    ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';

import { InputModal, ConfirmationModal } from "@/components/ui/confirmation-modal";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { InvoicePrint } from "./invoice-print";
import { FileDown, Printer, Loader2 } from "lucide-react";

interface ParentBillingViewProps {
    user: any;
    students: any[];
    school?: any;
}

export function ParentBillingView({ user, students }: ParentBillingViewProps) {
    const [activeTab, setActiveTab] = React.useState<'invoices' | 'receipts'>('invoices');
    const [processingId, setProcessingId] = React.useState<string | null>(null);
    const [selectingPaymentId, setSelectingPaymentId] = React.useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = React.useState<string>("BANK_TRANSFER");
    const [showConfirmation, setShowConfirmation] = React.useState(false);
    const [receiptImage, setReceiptImage] = React.useState<string | null>(null);
    const [printInvoice, setPrintInvoice] = React.useState<any>(null);
    const [printStudent, setPrintStudent] = React.useState<any>(null);
    const [printingId, setPrintingId] = React.useState<string | null>(null);

    const printRef = React.useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Receipt_${printInvoice?.id?.slice(0, 8) || 'Official'}`,
        onAfterPrint: () => {
            setPrintingId(null);
        }
    });

    const triggerPrint = (invoice: any, student: any) => {
        setPrintInvoice(invoice);
        setPrintStudent(student);
        setPrintingId(invoice.id);
    };

    React.useEffect(() => {
        if (printingId && printInvoice && printRef.current) {
            const timer = setTimeout(() => {
                try {
                    if (typeof handlePrint === 'function') {
                        handlePrint();
                    } else {
                        window.print();
                    }
                } catch (err) {
                    console.error("Parent print failure:", err);
                    window.print();
                } finally {
                    setTimeout(() => setPrintingId(null), 1000);
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [printingId, printInvoice, handlePrint]);

    const handleInitialPay = (invoiceId: string) => {
        setSelectingPaymentId(invoiceId);
        setReceiptImage(null);
        setShowConfirmation(true);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File must be less than 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setReceiptImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleConfirmPayment = async (reference: string) => {
        if (!selectingPaymentId) return;
        if (!receiptImage) {
            toast.error("Please upload a receipt to proceed.");
            return;
        }
        setProcessingId(selectingPaymentId);
        setShowConfirmation(false);
        try {
            const res = await fetch('/api/school/finance/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: selectingPaymentId,
                    method: paymentMethod,
                    reference: reference,
                    receiptImage: receiptImage
                })
            });
            const data: any = await res.json();
            if (res.ok) {
                toast.success(data.pending ? "Payment submitted for verification" : "Payment successful");
                // Delay for effect then reload
                setTimeout(() => window.location.reload(), 1500);
            } else {
                toast.error(data.error || "Payment Failed");
            }
        } catch (e) {
            console.error(e);
            toast.error("Internal sync error");
        } finally {
            setProcessingId(null);
            setSelectingPaymentId(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10 pb-20">
            {/* Header ... */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white uppercase italic">
                        Transactions
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Family Financial Overview</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="flex w-full sm:w-auto bg-white dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-900 shadow-xl">
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all",
                                activeTab === 'invoices'
                                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg"
                                    : "text-zinc-600 hover:text-zinc-900 dark:hover:text-white"
                            )}
                        >
                            Active Invoices
                        </button>
                        <button
                            onClick={() => setActiveTab('receipts')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all",
                                activeTab === 'receipts'
                                    ? "bg-eduGreen-600 text-white shadow-lg shadow-eduGreen-900/20"
                                    : "text-zinc-600 hover:text-eduGreen-600"
                            )}
                        >
                            Receipts
                        </button>
                    </div>
                    <div className="px-5 py-3 rounded-2xl bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-900 flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-eduGreen-500" />
                        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Institutional Ledger</span>
                    </div>
                </div>
            </div>

            {students.length === 0 ? (
                <div className="py-32 text-center bg-white/20 dark:bg-zinc-950/20 rounded-[3rem] border border-dashed border-zinc-200 dark:border-zinc-900">
                    <div className="w-16 h-16 bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-900 mx-auto mb-6">
                        <User className="w-8 h-8 text-zinc-800 dark:text-zinc-200" />
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 font-medium uppercase tracking-[0.3em] text-[10px]">No Active Student Records Found</p>
                </div>
            ) : (
                <div className="grid gap-12">
                    {students.map((student) => (
                        <div key={student.id} className="space-y-8">
                            <div className="flex items-center gap-4 ml-4">
                                <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center shadow-xl">
                                    <span className="text-xl font-medium text-eduGreen-500">{student?.firstName?.[0] || 'S'}</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight leading-none">{student?.firstName || 'Student'} {student?.lastName || ''}</h2>
                                    <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-1">ID: {student?.studentCode || '---'} • Grade {student?.grade?.level || "N/A"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {(() => {
                                    const filteredInvoices = (student?.invoices || []).filter((invoice: any) => {
                                        if (activeTab === 'receipts') {
                                            return invoice?.status === 'PAID';
                                        } else {
                                            return invoice?.status !== 'PAID';
                                        }
                                    });

                                    if (filteredInvoices.length === 0) {
                                        return (
                                            <div className="col-span-full py-16 text-center bg-white/10 dark:bg-zinc-950/10 rounded-[2rem] border border-zinc-200/50 dark:border-zinc-900/50">
                                                <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest">
                                                    {activeTab === 'receipts' ? "No verified receipts found." : "All tuition and invoices are currently settled."}
                                                </p>
                                            </div>
                                        );
                                    }

                                    return filteredInvoices.map((invoice: any) => {
                                        const hasPendingPayment = (invoice?.payments || []).some((p: any) => p?.status === 'PENDING');
                                        const items = invoice?.items || [];
                                        return (
                                            <Card key={invoice.id} className="group bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] overflow-hidden hover:border-eduGreen-900/30 transition-all border-t-zinc-800/10 shadow-2xl relative">
                                                <div className={cn(
                                                    "absolute top-0 left-0 w-full h-[2px] transition-opacity",
                                                    invoice.status === 'PAID' ? "bg-eduGreen-500" : (hasPendingPayment ? "bg-amber-400" : "bg-zinc-200 dark:bg-zinc-800 opacity-60 group-hover:opacity-100")
                                                )} />

                                                <CardHeader className="p-8 pb-4">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className={cn(
                                                            "p-3 rounded-xl border transition-all",
                                                            invoice.status === 'PAID'
                                                                ? "bg-eduGreen-100 dark:bg-eduGreen-950/20 border-eduGreen-300 dark:border-eduGreen-900/30 text-eduGreen-700 dark:text-eduGreen-400"
                                                                : (hasPendingPayment
                                                                    ? "bg-amber-100/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 shadow-sm"
                                                                    : "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-500")
                                                        )}>
                                                            {invoice.status === 'PAID' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                                        </div>
                                                        <div className="text-right flex flex-col items-end gap-2">
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    disabled={printingId === invoice.id}
                                                                    onClick={() => triggerPrint(invoice, student)}
                                                                    className="h-8 w-8 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-500 hover:text-eduGreen-500 rounded-lg active:scale-95 transition-all"
                                                                    title="Print Official Receipt"
                                                                >
                                                                    {printingId === invoice.id ? (
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-eduGreen-500" />
                                                                    ) : (
                                                                        <Printer className="w-4 h-4" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                            <div className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tighter">${Number(invoice?.amount || 0).toLocaleString()}</div>
                                                            <div className={cn(
                                                                "text-[8px] font-medium uppercase tracking-widest mt-1 px-2.5 py-0.5 rounded-full inline-block border",
                                                                invoice.status === 'PAID'
                                                                    ? "bg-eduGreen-100 dark:bg-eduGreen-950/80 text-eduGreen-700 dark:text-eduGreen-400 border-eduGreen-300 dark:border-eduGreen-800/50"
                                                                    : (hasPendingPayment
                                                                        ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50 animate-pulse font-bold"
                                                                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800")
                                                            )}>
                                                                {hasPendingPayment ? "Pending Verification" : invoice.status}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white tracking-tight leading-none mb-4 whitespace-nowrap overflow-hidden text-ellipsis">
                                                        {activeTab === 'receipts' ? "Official Receipt" : "Institutional Dues"}
                                                    </h3>
                                                    <div className="space-y-2">
                                                        {items.slice(0, 3).map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center text-[10px] font-medium text-zinc-600">
                                                                <span className="uppercase tracking-widest truncate mr-2">{item?.name || 'Fee'}</span>
                                                                <span className="text-zinc-600 dark:text-zinc-500 flex-shrink-0">${Number(item?.amount || 0).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        {items.length > 3 && (
                                                            <p className="text-[8px] text-zinc-700 uppercase tracking-widest pt-1">+{items.length - 3} more items</p>
                                                        )}
                                                    </div>
                                                </CardHeader>

                                                <CardContent className="p-8 pt-0">
                                                    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-900/50">
                                                        <div className="flex justify-between items-center mb-6">
                                                            <p className="text-[8px] font-medium text-zinc-700 uppercase tracking-widest">Deadline</p>
                                                            <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                                                                {invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '---'}
                                                            </p>
                                                        </div>

                                                        {invoice.status !== 'PAID' && !hasPendingPayment ? (
                                                            <Button
                                                                disabled={!!processingId}
                                                                onClick={() => handleInitialPay(invoice.id)}
                                                                className="w-full h-14 bg-white text-black hover:bg-zinc-200 rounded-2xl font-medium text-[10px] uppercase tracking-widest transition-all"
                                                            >
                                                                {processingId === invoice.id ? "Syncing..." : "Initiate Settlement"}
                                                            </Button>
                                                        ) : (
                                                            <div className="flex flex-col gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    className={cn(
                                                                        "w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest cursor-default border transition-all",
                                                                        invoice.status === 'PAID'
                                                                            ? "bg-eduGreen-50 dark:bg-eduGreen-950/20 text-eduGreen-700 dark:text-eduGreen-400 border-eduGreen-200 dark:border-eduGreen-900/30"
                                                                            : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30"
                                                                    )}
                                                                >
                                                                    {invoice.status === 'PAID' ? "Transaction Verified" : "Verification in Progress"}
                                                                </Button>
                                                                {hasPendingPayment && (
                                                                    <p className="text-[8px] text-amber-700 dark:text-zinc-400 font-semibold text-center uppercase tracking-widest">Awaiting Admin Confirmation</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <InputModal
                isOpen={showConfirmation}
                onClose={() => setShowConfirmation(false)}
                title="Secure Settlement Portal"
                description="Select method and provide transaction reference code."
                confirmText="Submit for Verification"
                onConfirm={handleConfirmPayment}
                placeholder="Enter Transaction Reference / Bank Ref"
                footerElement={
                    <div className="flex flex-col gap-4 mt-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                                className={cn(
                                    "h-14 rounded-xl border border-zinc-300 dark:border-zinc-800 text-[9px] font-medium uppercase tracking-widest transition-all",
                                    paymentMethod === "BANK_TRANSFER" ? "bg-eduGreen-950/20 border-eduGreen-500 text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-500"
                                )}
                            >
                                Bank Transfer
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setPaymentMethod("MOBILE_MONEY")}
                                className={cn(
                                    "h-14 rounded-xl border border-zinc-300 dark:border-zinc-800 text-[9px] font-medium uppercase tracking-widest transition-all",
                                    paymentMethod === "MOBILE_MONEY" ? "bg-eduGreen-950/20 border-eduGreen-500 text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-500"
                                )}
                            >
                                Mobile Money
                            </Button>
                        </div>

                        {/* Account Details Box */}
                        <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-2 text-left">
                            <div className="text-[10px] font-bold text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest">
                                {paymentMethod === "BANK_TRANSFER" ? "Commercial Bank of Ethiopia (CBE)" : "Telebirr"}
                            </div>
                            <div className="text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                                <p><span className="text-zinc-500 text-[10px] uppercase tracking-wider">{paymentMethod === "BANK_TRANSFER" ? "Account Number:" : "Phone Number:"}</span> <strong className="font-mono text-zinc-900 dark:text-white select-all">{paymentMethod === "BANK_TRANSFER" ? "1000790420393" : "0997267373"}</strong></p>
                                <p><span className="text-zinc-500 text-[10px] uppercase tracking-wider">Account Name:</span> <strong className="text-zinc-900 dark:text-white">Abdullahi Abdulwasie Abrar</strong></p>
                            </div>
                        </div>
                        
                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Upload Receipt (Required)</label>
                            <div className="relative">
                                <Input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="h-12 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs file:bg-zinc-200 dark:bg-zinc-800 file:text-zinc-700 dark:text-zinc-300 file:border-0 file:mr-4 file:px-4 file:rounded-lg hover:file:bg-zinc-700 cursor-pointer"
                                />
                                {receiptImage && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <CheckCircle2 className="w-4 h-4 text-eduGreen-500" />
                                    </div>
                                )}
                            </div>
                            <p className="text-[8px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">An administrator will manually verify your receipt after submission.</p>
                        </div>
                    </div>
                }
            />

            {/* Hidden Print Template */}
            <div className="fixed -left-[99999px] top-0 opacity-0 pointer-events-none print:opacity-100 print:static print:left-0 print:pointer-events-auto" aria-hidden="true">
                <div ref={printRef}>
                    {printInvoice && (
                        <InvoicePrint
                            invoice={printInvoice}
                            student={printStudent}
                            school={students[0]?.school || (user as any)?.school}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

