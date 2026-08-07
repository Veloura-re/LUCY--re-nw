'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Search, ArrowLeft, User, BookOpen, Clock, 
    AlertCircle, CheckCircle, Wallet, FileText, ChevronRight, 
    Download, Image as ImageIcon, Eye, ExternalLink, ShieldCheck, 
    Receipt, Sparkles, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { useRouter } from "next/navigation";

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
                setStudents(data.students || []);
                setTotal(data.total || 0);
                setClasses(data.classes || []);
                setGrades(data.grades || []);
                setSchool(data.school || null);
            }
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, classId, gradeId, status]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                        {school?.name || "Campus"} &bull; Transaction Logs & Proof Screenshots
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
                {students.map((student) => {
                    const fin = student.financials;
                    const receipts = fin.receiptScreenshots || [];
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
                                        <span>{receipts.length} Payment Screenshot{receipts.length > 1 ? 's' : ''} Attached</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 pt-3 border-t border-zinc-200 dark:border-zinc-900">
                                <span>{student.class?.name || student.grade?.name || 'Class Cohort'}</span>
                                <span className="text-eduGreen-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Inspect Dossier <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Modal Detail View with Full Screenshot Preview */}
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
                            className="bg-white dark:bg-[#0e0e0e] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-900 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-eduGreen-600/20 border border-eduGreen-500/30 flex items-center justify-center text-eduGreen-500 font-black text-xl">
                                        {selectedStudent.firstName[0]}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-mono font-bold text-eduGreen-500 uppercase tracking-widest">
                                            {school?.name || "Campus Institution"}
                                        </span>
                                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                            {selectedStudent.firstName} {selectedStudent.lastName}
                                        </h2>
                                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{selectedStudent.studentCode}</p>
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

                            {/* 📸 PAYMENT PROOFS & SCREENSHOT GALLERY */}
                            <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-900">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                        <Receipt className="w-4 h-4 text-eduGreen-500" />
                                        Uploaded Payment Receipts & Screenshots
                                    </h3>
                                    <span className="text-[10px] font-mono text-zinc-500">
                                        {selectedStudent.financials.payments.length} Transactions
                                    </span>
                                </div>

                                {selectedStudent.financials.payments.length === 0 ? (
                                    <div className="p-6 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-xs text-zinc-500">
                                        No payment receipts or uploaded screenshots on record.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedStudent.financials.payments.map((p: any) => (
                                            <div key={p.id} className="p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-zinc-900 dark:text-white">${p.amount.toFixed(2)}</span>
                                                        <span className="px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                                                            {p.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] font-mono text-zinc-500 space-x-2">
                                                        <span>Submitter: <strong>{p.submitterName}</strong></span>
                                                        <span>&bull;</span>
                                                        <span>School: <strong>{p.schoolName}</strong></span>
                                                    </div>
                                                    <div className="text-[9px] font-mono text-zinc-400">
                                                        Ref: {p.referenceId} &bull; {new Date(p.paidAt).toLocaleDateString()}
                                                    </div>
                                                </div>

                                                {/* Screenshot / Proof Action */}
                                                {p.screenshotUrl || p.receiptUrl ? (
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => setZoomImage(p.screenshotUrl || p.receiptUrl)}
                                                        className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1.5" /> View Receipt Image
                                                    </Button>
                                                ) : (
                                                    <span className="text-[9px] font-mono text-zinc-500 italic">Electronic Transaction</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🔍 LIGHTBOX IMAGE ZOOM MODAL */}
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
