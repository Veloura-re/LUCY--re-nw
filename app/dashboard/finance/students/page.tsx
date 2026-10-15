'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Search, ArrowLeft, User, BookOpen, Clock, 
    AlertCircle, CheckCircle, Wallet, FileText, ChevronRight, 
    Download, Image as ImageIcon, Eye, ExternalLink, ShieldCheck, 
    Receipt, Sparkles, X, Loader2, Check, DollarSign, PlusCircle, 
    CreditCard, Building2, Smartphone, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function StudentFinanceDossier() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [school, setSchool] = useState<any>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    
    // Filters
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 50;

    // Selected student for detail view
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [zoomImage, setZoomImage] = useState<string | null>(null);

    // Payment Confirmation Modal State
    const [recordingPayment, setRecordingPayment] = useState<{
        open: boolean;
        student: any;
        invoiceId: string;
        amount: string;
        method: string;
        reference: string;
    } | null>(null);

    // New Invoice Billing Modal State
    const [billingInvoice, setBillingInvoice] = useState<{
        open: boolean;
        student: any;
        name: string;
        amount: string;
        dueDate: string;
        description: string;
    } | null>(null);

    const [actionLoading, setActionLoading] = useState(false);
    const [verifyLoadingId, setVerifyLoadingId] = useState<string | null>(null);

    // Debounce search
    useEffect(() => { 
        const t = setTimeout(() => setDebouncedSearch(search), 350); 
        return () => clearTimeout(t); 
    }, [search]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                search: debouncedSearch,
                classId,
                gradeId,
                status
            });
            const res = await fetch(`/api/school/finance/student-dossier?${params}`);
            const data = await res.json() as any;
            
            if (res.ok) {
                const fetchedStudents = data.students || [];
                setStudents(fetchedStudents);
                setTotal(data.total || 0);
                setClasses(data.classes || []);
                setGrades(data.grades || []);
                setSchool(data.school || null);

                // If a student is currently selected in modal, keep their data live
                if (selectedStudent) {
                    const updated = fetchedStudents.find((s: any) => s.id === selectedStudent.id);
                    if (updated) setSelectedStudent(updated);
                }
            }
        } catch (err) {
            console.error("Failed to fetch student dossiers:", err);
            toast.error("Could not load financial dossiers");
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, classId, gradeId, status, selectedStudent]);

    useEffect(() => {
        fetchData();
    }, [page, debouncedSearch, classId, gradeId, status]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, classId, gradeId, status]);

    const totalPages = Math.ceil(total / limit);

    const getStatusColor = (st: string) => {
        switch (st) {
            case 'PAID': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'OVERDUE': return 'text-red-600 dark:text-red-500 bg-red-500/10 border-red-200 dark:border-red-500/20';
            case 'PENDING': return 'text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-zinc-600 dark:text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
        }
    };

    // Open Payment Modal for a student & specific invoice
    const openRecordPaymentModal = (student: any, invoice?: any) => {
        const unpaidInvoice = invoice || (student.financials.invoices || []).find((inv: any) => inv.status !== 'PAID') || (student.financials.invoices || [])[0];
        const defaultAmount = invoice ? String(invoice.amount) : (unpaidInvoice ? String(unpaidInvoice.amount) : (student.financials.balance > 0 ? String(student.financials.balance) : '100'));
        
        setRecordingPayment({
            open: true,
            student,
            invoiceId: unpaidInvoice?.id || '',
            amount: defaultAmount,
            method: 'CASH',
            reference: ''
        });
    };

    // Submit Payment Confirmation
    const handleConfirmPaymentSubmit = async () => {
        if (!recordingPayment || !recordingPayment.invoiceId) {
            toast.error("Please select an invoice to settle");
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch('/api/school/finance/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: recordingPayment.invoiceId,
                    method: recordingPayment.method,
                    reference: recordingPayment.reference || `Direct In-Person Confirmation by Director`,
                    amount: Number(recordingPayment.amount)
                })
            });

            const data = await res.json() as any;

            if (res.ok) {
                toast.success(`Payment of $${recordingPayment.amount} confirmed successfully! Invoice marked PAID.`);
                setRecordingPayment(null);
                await fetchData();
            } else {
                toast.error(data.error || data.message || "Failed to confirm payment");
            }
        } catch (e: any) {
            toast.error("Network error while recording payment");
        } finally {
            setActionLoading(false);
        }
    };

    // Approve / Reject a pending payment submission
    const handleVerifyPendingPayment = async (paymentId: string, targetStatus: 'SUCCESS' | 'FAILED') => {
        setVerifyLoadingId(paymentId);
        try {
            const res = await fetch('/api/school/finance/pay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId,
                    status: targetStatus,
                    reason: targetStatus === 'SUCCESS' ? 'Director in-person verification' : 'Invalid payment proof'
                })
            });

            if (res.ok) {
                toast.success(targetStatus === 'SUCCESS' ? "Payment approved and marked as PAID!" : "Payment rejected.");
                await fetchData();
            } else {
                const err = (await res.json().catch(() => ({}))) as any;
                toast.error(err.error || "Failed to verify payment");
            }
        } catch (e) {
            toast.error("Failed to verify transaction");
        } finally {
            setVerifyLoadingId(null);
        }
    };

    // Create a new invoice for a student
    const handleCreateInvoiceSubmit = async () => {
        if (!billingInvoice || !billingInvoice.amount || !billingInvoice.name) {
            toast.error("Please enter fee title and amount");
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch('/api/school/finance/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: billingInvoice.student.id,
                    name: billingInvoice.name,
                    amount: Number(billingInvoice.amount),
                    description: billingInvoice.description,
                    dueDate: billingInvoice.dueDate || undefined
                })
            });

            const data = await res.json() as any;

            if (res.ok) {
                toast.success(`Invoice for "${billingInvoice.name}" billed successfully!`);
                const studentRef = billingInvoice.student;
                setBillingInvoice(null);
                await fetchData();
                // Prompt to immediately record payment if desired
                if (data.invoice?.id) {
                    openRecordPaymentModal(studentRef, data.invoice);
                }
            } else {
                toast.error(data.error || "Failed to bill invoice");
            }
        } catch (e) {
            toast.error("Network error creating invoice");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && students.length === 0) {
        return <div className="min-h-screen flex items-center justify-center"><SpringingLoader message="Synthesizing Financial Dossiers..." /></div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 relative z-10 pb-20 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-8">
                <div>
                    <button onClick={() => router.push('/dashboard/finance')} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-4">
                        <ArrowLeft className="w-3 h-3" /> Back to Ledger
                    </button>
                    <h1 className="text-4xl font-medium tracking-tighter text-zinc-900 dark:text-white uppercase italic">
                        Student <span className="text-eduGreen-500 not-italic">Dossiers</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-2">
                        {school?.name || "Campus"} &bull; Confirm Payments, Settle Invoices & Inspect Receipts
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-white/40 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-900/50 backdrop-blur-md">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <Input 
                        placeholder="Search student name, ID, or email..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-12 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl focus:border-eduGreen-500 font-medium text-xs text-zinc-900 dark:text-white"
                    />
                </div>
                
                <select 
                    value={classId} 
                    onChange={(e) => setClassId(e.target.value)}
                    className="h-12 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 outline-none"
                >
                    <option value="">All Classes</option>
                    {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-12 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 outline-none"
                >
                    <option value="">All Statuses</option>
                    <option value="PAID">Paid</option>
                    <option value="PENDING">Pending</option>
                    <option value="OVERDUE">Overdue</option>
                </select>
            </div>

            {/* Dossier Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900/60 rounded-3xl p-6 animate-pulse">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                                    <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl mb-4" />
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 pt-3 border-t border-zinc-200 dark:border-zinc-900" />
                        </Card>
                    ))
                ) : students.length === 0 ? (
                    <div className="col-span-full py-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 bg-white/20 dark:bg-zinc-950/20">
                        <User className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">No Student Dossiers Found</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Try adjusting your search query or grade/class filters.</p>
                    </div>
                ) : (
                    students.map((student) => {
                        const fin = student.financials;
                        const receipts = fin.receiptScreenshots || [];
                        const hasUnpaid = fin.balance > 0 || (fin.invoices || []).some((inv: any) => inv.status !== 'PAID');

                        return (
                            <Card 
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900/60 rounded-3xl p-6 hover:border-eduGreen-500/40 transition-all cursor-pointer group hover:shadow-2xl flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 shrink-0">
                                                {student.firstName[0]}
                                            </div>
                                            <div className="overflow-hidden">
                                                <h3 className="font-bold text-base text-zinc-900 dark:text-white uppercase truncate group-hover:text-eduGreen-500 transition-colors">
                                                    {student.firstName} {student.lastName}
                                                </h3>
                                                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{student.studentCode}</p>
                                            </div>
                                        </div>
                                        <span className={cn("px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-widest border", getStatusColor(fin.overallStatus))}>
                                            {fin.overallStatus}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-100/50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800/40 text-xs mb-4">
                                        <div>
                                            <span className="text-[9px] font-mono text-zinc-500 uppercase block">Total Billed</span>
                                            <strong className="text-zinc-900 dark:text-white">${fin.totalBilled.toLocaleString()}</strong>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-mono text-zinc-500 uppercase block">Balance Due</span>
                                            <strong className={fin.balance > 0 ? "text-amber-500" : "text-emerald-500"}>${fin.balance.toLocaleString()}</strong>
                                        </div>
                                    </div>

                                    {/* Proof Screenshots Badge */}
                                    {receipts.length > 0 && (
                                        <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-eduGreen-500/10 border border-eduGreen-500/20 text-[10px] font-bold text-eduGreen-600 dark:text-eduGreen-400 mb-3">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            <span>{receipts.length} Payment Proof{receipts.length > 1 ? 's' : ''} Attached</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-900">
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                        <span>{student.class?.name || student.grade?.name || 'Class Cohort'}</span>
                                        <span className="text-eduGreen-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                            Inspect Dossier <ChevronRight className="w-3.5 h-3.5" />
                                        </span>
                                    </div>

                                    {/* Quick Confirm Payment Action Button directly on Card */}
                                    {hasUnpaid && (
                                        <Button 
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openRecordPaymentModal(student);
                                            }}
                                            className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" /> Confirm Payment
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Modal Detail View with Full Invoices, Confirm Payment, & Screenshot Preview */}
            <AnimatePresence>
                {selectedStudent && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => setSelectedStudent(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }} 
                            animate={{ scale: 1, y: 0 }} 
                            exit={{ scale: 0.95, y: 20 }} 
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-[#0e0e0e] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl space-y-6"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-900 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-eduGreen-600/20 border border-eduGreen-500/30 flex items-center justify-center text-eduGreen-500 font-black text-xl">
                                        {selectedStudent.firstName[0]}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-mono font-bold text-eduGreen-500 uppercase tracking-widest">
                                            {school?.name || "Campus Institution"} &bull; {selectedStudent.class?.name || 'Class Cohort'}
                                        </span>
                                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                            {selectedStudent.firstName} {selectedStudent.lastName}
                                        </h2>
                                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{selectedStudent.studentCode} &bull; {selectedStudent.email || 'No email registered'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedStudent(null)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-2">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Vitals Ribbon */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                    <span className="text-[9px] font-mono text-zinc-500 uppercase block">Total Billed</span>
                                    <strong className="text-base text-zinc-900 dark:text-white">${selectedStudent.financials.totalBilled.toLocaleString()}</strong>
                                </div>
                                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                    <span className="text-[9px] font-mono text-zinc-500 uppercase block">Total Paid</span>
                                    <strong className="text-base text-emerald-500">${selectedStudent.financials.totalPaid.toLocaleString()}</strong>
                                </div>
                                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                    <span className="text-[9px] font-mono text-zinc-500 uppercase block">Balance Due</span>
                                    <strong className={selectedStudent.financials.balance > 0 ? "text-amber-500" : "text-emerald-500"}>
                                        ${selectedStudent.financials.balance.toLocaleString()}
                                    </strong>
                                </div>
                                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                    <span className="text-[9px] font-mono text-zinc-500 uppercase block">Ledger Status</span>
                                    <strong className="text-base uppercase text-eduGreen-500">{selectedStudent.financials.overallStatus}</strong>
                                </div>
                            </div>

                            {/* PRIMARY ACTIONS BAR FOR DIRECTOR */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <Wallet className="w-4 h-4 text-emerald-500" />
                                        Confirm Payment & Settle Invoices
                                    </h4>
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        Confirm in-person cash, bank transfers, or mobile money payments to immediately update the student ledger.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => openRecordPaymentModal(selectedStudent)}
                                        className="h-10 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Confirm Payment
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setBillingInvoice({
                                            open: true,
                                            student: selectedStudent,
                                            name: 'Term Tuition Fee',
                                            amount: '250',
                                            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                            description: 'Academic fee billing'
                                        })}
                                        className="h-10 px-4 rounded-xl border-zinc-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> + Bill New Fee
                                    </Button>
                                </div>
                            </div>

                            {/* INVOICES & FEE SCHEDULE BREAKDOWN */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-eduGreen-500" />
                                        Invoices & Fee Schedule
                                    </h3>
                                    <span className="text-[10px] font-mono text-zinc-500">
                                        {(selectedStudent.financials.invoices || []).length} Invoices on record
                                    </span>
                                </div>

                                {(selectedStudent.financials.invoices || []).length === 0 ? (
                                    <div className="p-6 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-xs text-zinc-500">
                                        No invoices issued for this student yet. Click <strong>&quot;+ Bill New Fee&quot;</strong> to generate an invoice.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedStudent.financials.invoices.map((inv: any) => {
                                            const isPaid = inv.status === 'PAID';
                                            const itemName = (inv.items && inv.items[0]?.name) || 'Academic Fee / Tuition';
                                            const itemDesc = (inv.items && inv.items[0]?.description) || '';

                                            return (
                                                <div 
                                                    key={inv.id}
                                                    className="p-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-zinc-900 dark:text-white">${inv.amount.toFixed(2)}</span>
                                                            <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase border", getStatusColor(inv.status))}>
                                                                {inv.status}
                                                            </span>
                                                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">&bull; {itemName}</span>
                                                        </div>
                                                        <div className="text-[10px] font-mono text-zinc-500 space-x-2">
                                                            <span>Invoice #{inv.id.slice(0, 8).toUpperCase()}</span>
                                                            <span>&bull;</span>
                                                            <span>Created: {new Date(inv.createdAt).toLocaleDateString()}</span>
                                                            {inv.dueDate && (
                                                                <>
                                                                    <span>&bull;</span>
                                                                    <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {itemDesc && <p className="text-[9px] text-zinc-400">{itemDesc}</p>}
                                                    </div>

                                                    {/* Action for this invoice */}
                                                    <div>
                                                        {isPaid ? (
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                                                                <Check className="w-3.5 h-3.5" /> Settle & Paid
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => openRecordPaymentModal(selectedStudent, inv)}
                                                                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm"
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" /> Confirm Paid
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* PAYMENT PROOFS & TRANSACTION HISTORY */}
                            <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-900">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                        <Receipt className="w-4 h-4 text-eduGreen-500" />
                                        Recorded Transactions & Proof Proofs
                                    </h3>
                                    <span className="text-[10px] font-mono text-zinc-500">
                                        {selectedStudent.financials.payments.length} Transactions
                                    </span>
                                </div>

                                {selectedStudent.financials.payments.length === 0 ? (
                                    <div className="p-6 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-xs text-zinc-500">
                                        No payment transactions on record. Click <strong>&quot;Confirm Payment&quot;</strong> above to record a payment.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedStudent.financials.payments.map((p: any) => {
                                            const isPending = p.status === 'PENDING';
                                            const isSuccess = p.status === 'SUCCESS';

                                            return (
                                                <div 
                                                    key={p.id} 
                                                    className="p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-zinc-900 dark:text-white">${p.amount.toFixed(2)}</span>
                                                            <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase border", 
                                                                isSuccess ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : 
                                                                isPending ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                                                                "bg-red-500/10 text-red-500 border-red-500/30"
                                                            )}>
                                                                {p.status}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 uppercase">
                                                                {p.paymentMethod || 'MANUAL'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] font-mono text-zinc-500 space-x-2">
                                                            <span>Payer / Submitter: <strong>{p.submitterName}</strong></span>
                                                            <span>&bull;</span>
                                                            <span>Date: {new Date(p.paidAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="text-[9px] font-mono text-zinc-400">
                                                            Ref: {p.referenceId}
                                                        </div>
                                                    </div>

                                                    {/* Actions: View Screenshot & Direct Approve/Reject */}
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {isPending && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Button 
                                                                    size="sm"
                                                                    disabled={verifyLoadingId === p.id}
                                                                    onClick={() => handleVerifyPendingPayment(p.id, 'SUCCESS')}
                                                                    className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                                                                >
                                                                    {verifyLoadingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                    Approve
                                                                </Button>
                                                                <Button 
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={verifyLoadingId === p.id}
                                                                    onClick={() => handleVerifyPendingPayment(p.id, 'FAILED')}
                                                                    className="h-8 px-3 text-red-500 border-red-200 dark:border-red-900/50 hover:bg-red-500/10 rounded-xl text-[9px] font-bold uppercase tracking-wider"
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {p.screenshotUrl || p.receiptUrl ? (
                                                            <Button 
                                                                size="sm"
                                                                onClick={() => setZoomImage(p.screenshotUrl || p.receiptUrl)}
                                                                className="h-8 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
                                                            >
                                                                <Eye className="w-3 h-3" /> View Proof
                                                            </Button>
                                                        ) : (
                                                            <span className="text-[9px] font-mono text-zinc-500 italic">Direct Receipt</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* RECORD / CONFIRM PAYMENT MODAL */}
            <AnimatePresence>
                {recordingPayment?.open && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => !actionLoading && setRecordingPayment(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl space-y-5"
                        >
                            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-zinc-900 dark:text-white uppercase tracking-tight">Confirm Payment</h3>
                                        <p className="text-[10px] font-mono text-zinc-500 uppercase">
                                            Student: {recordingPayment.student.firstName} {recordingPayment.student.lastName} ({recordingPayment.student.studentCode})
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setRecordingPayment(null)} disabled={actionLoading} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 text-xs">
                                {/* Invoice Selection */}
                                <div>
                                    <label className="block text-[10px] font-mono uppercase font-bold text-zinc-500 mb-1.5">Target Invoice</label>
                                    <select
                                        value={recordingPayment.invoiceId}
                                        onChange={(e) => {
                                            const invId = e.target.value;
                                            const found = (recordingPayment.student.financials.invoices || []).find((i: any) => i.id === invId);
                                            setRecordingPayment({
                                                ...recordingPayment,
                                                invoiceId: invId,
                                                amount: found ? String(found.amount) : recordingPayment.amount
                                            });
                                        }}
                                        className="w-full h-11 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 font-semibold text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-500"
                                    >
                                        {(recordingPayment.student.financials.invoices || []).map((inv: any) => (
                                            <option key={inv.id} value={inv.id}>
                                                #{inv.id.slice(0, 8).toUpperCase()} &bull; ${(Number(inv.amount)).toFixed(2)} &bull; {inv.status} &bull; {(inv.items && inv.items[0]?.name) || 'Tuition'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Payment Method Selector */}
                                <div>
                                    <label className="block text-[10px] font-mono uppercase font-bold text-zinc-500 mb-1.5">Payment Method</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {[
                                            { id: 'CASH', label: 'Cash (Desk)', icon: DollarSign },
                                            { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
                                            { id: 'TELEBIRR', label: 'Telebirr', icon: Smartphone },
                                            { id: 'CBE_BIRR', label: 'CBE Birr', icon: Smartphone },
                                            { id: 'CARD', label: 'Card / POS', icon: CreditCard },
                                            { id: 'CHECK', label: 'Cheque', icon: FileText },
                                        ].map(m => {
                                            const Icon = m.icon;
                                            const selected = recordingPayment.method === m.id;
                                            return (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => setRecordingPayment({ ...recordingPayment, method: m.id })}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2.5 rounded-xl border text-[11px] font-bold transition-all text-left",
                                                        selected 
                                                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" 
                                                            : "bg-zinc-100/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
                                                    )}
                                                >
                                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">{m.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Amount */}
                                <div>
                                    <label className="block text-[10px] font-mono uppercase font-bold text-zinc-500 mb-1.5">Amount Confirmed ($ / ETB)</label>
                                    <Input 
                                        type="number"
                                        step="any"
                                        placeholder="Amount received"
                                        value={recordingPayment.amount}
                                        onChange={(e) => setRecordingPayment({ ...recordingPayment, amount: e.target.value })}
                                        className="h-11 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl font-bold text-sm text-zinc-900 dark:text-white"
                                    />
                                </div>

                                {/* Reference Code / Slip Number */}
                                <div>
                                    <label className="block text-[10px] font-mono uppercase font-bold text-zinc-500 mb-1.5">Reference / Slip Number / Bank Tx ID (Optional)</label>
                                    <Input 
                                        placeholder="e.g. CBE-TX-984210 or Cash Receipt #402"
                                        value={recordingPayment.reference}
                                        onChange={(e) => setRecordingPayment({ ...recordingPayment, reference: e.target.value })}
                                        className="h-11 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl font-mono text-xs text-zinc-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                <Button 
                                    variant="ghost" 
                                    disabled={actionLoading}
                                    onClick={() => setRecordingPayment(null)}
                                    className="h-11 px-5 text-zinc-500 rounded-xl text-xs font-bold uppercase tracking-widest"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    disabled={actionLoading || !recordingPayment.amount || !recordingPayment.invoiceId}
                                    onClick={handleConfirmPaymentSubmit}
                                    className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Confirm Payment & Settle
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ISSUE NEW INVOICE MODAL */}
            <AnimatePresence>
                {billingInvoice?.open && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => !actionLoading && setBillingInvoice(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl space-y-5"
                        >
                            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-eduGreen-500/20 text-eduGreen-500 flex items-center justify-center font-bold">
                                        <PlusCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-zinc-900 dark:text-white uppercase tracking-tight">Bill New Fee</h3>
                                        <p className="text-[10px] font-mono text-zinc-500 uppercase">
                                            Student: {billingInvoice.student.firstName} {billingInvoice.student.lastName}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setBillingInvoice(null)} disabled={actionLoading} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-[10px] font-mono uppercase font-bold text-zinc-500 mb-1.5">Fee Title</label>
                                    <Input 
                                        placeholder="e.g. Term Tuition Fee, Lab Fee, Uniform & Books"
                                        value={billingInvoice.name}
                                        onChange={(e) => setBillingInvoice({ ...billingInvoice, name: e.target.value })}
                                        className="h-11 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl font-bold text-xs text-zinc-900 dark:text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-mono uppercase font-bold text-zinc-500 mb-1.5">Amount ($ / ETB)</label>
                                        <Input 
                                            type="number"
                                            step="any"
                                            placeholder="250"
                                            value={billingInvoice.amount}
                                            onChange={(e) => setBillingInvoice({ ...billingInvoice, amount: e.target.value })}
                                            className="h-11 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl font-bold text-sm text-zinc-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono uppercase font-bold text-zinc-500 mb-1.5">Due Date</label>
                                        <Input 
                                            type="date"
                                            value={billingInvoice.dueDate}
                                            onChange={(e) => setBillingInvoice({ ...billingInvoice, dueDate: e.target.value })}
                                            className="h-11 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl font-medium text-xs text-zinc-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-mono uppercase font-bold text-zinc-500 mb-1.5">Notes / Memo (Optional)</label>
                                    <Input 
                                        placeholder="Academic term billing or custom fee breakdown"
                                        value={billingInvoice.description}
                                        onChange={(e) => setBillingInvoice({ ...billingInvoice, description: e.target.value })}
                                        className="h-11 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl font-medium text-xs text-zinc-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                <Button 
                                    variant="ghost" 
                                    disabled={actionLoading}
                                    onClick={() => setBillingInvoice(null)}
                                    className="h-11 px-5 text-zinc-500 rounded-xl text-xs font-bold uppercase tracking-widest"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    disabled={actionLoading || !billingInvoice.amount || !billingInvoice.name}
                                    onClick={handleCreateInvoiceSubmit}
                                    className="h-11 px-6 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg"
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                    Create & Bill Invoice
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LIGHTBOX IMAGE ZOOM MODAL */}
            <AnimatePresence>
                {zoomImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
                        onClick={() => setZoomImage(null)}
                    >
                        <div className="relative max-w-4xl max-h-[90vh] bg-zinc-950 p-2 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <button 
                                onClick={() => setZoomImage(null)}
                                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center border border-white/20 hover:scale-110 transition-transform"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <img 
                                src={zoomImage} 
                                alt="Payment Proof" 
                                className="max-h-[80vh] w-auto object-contain rounded-2xl mx-auto"
                            />
                            <div className="p-3 text-center text-xs font-mono text-zinc-400">
                                Verified Uploaded Receipt Screenshot &bull; Click anywhere outside to close
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
