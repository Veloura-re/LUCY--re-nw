'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Search, ArrowLeft, User, BookOpen, Clock, 
    AlertCircle, CheckCircle, Wallet, FileText, ChevronRight, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { useRouter } from "next/navigation";

export default function StudentFinanceDossier() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [summary, setSummary] = useState<any[]>([]);
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
                setSummary(data.summary || []);
            }
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, classId, gradeId, status]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, classId, gradeId, status]);

    const totalPages = Math.ceil(total / limit);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'OVERDUE': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'PENDING': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-zinc-600 dark:text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
        }
    };

    if (loading && students.length === 0) {
        return <div className="min-h-screen flex items-center justify-center"><SpringingLoader message="Loading Dossiers" /></div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 relative z-10 pb-20 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-8">
                <div>
                    <button onClick={() => router.push('/dashboard/finance')} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-500 hover:text-white transition-colors mb-4">
                        <ArrowLeft className="w-3 h-3" /> Back to Finance Nexus
                    </button>
                    <h1 className="text-4xl font-medium tracking-tighter text-zinc-900 dark:text-white uppercase italic">
                        Student <span className="text-eduGreen-500 not-italic">Dossiers</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-2">Individual Account Summaries</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-white/40 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-900/50 backdrop-blur-md">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <Input 
                        placeholder="Search student name, ID, email..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-12 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 rounded-xl focus:border-eduGreen-500 font-medium text-xs text-zinc-900 dark:text-white"
                    />
                </div>
                
                <select 
                    value={gradeId} 
                    onChange={e => setGradeId(e.target.value)}
                    className="h-12 px-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:border-eduGreen-500 outline-none appearance-none cursor-pointer min-w-[140px]"
                >
                    <option value="">All Grades</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>

                <select 
                    value={classId} 
                    onChange={e => setClassId(e.target.value)}
                    className="h-12 px-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:border-eduGreen-500 outline-none appearance-none cursor-pointer min-w-[140px]"
                >
                    <option value="">All Classes</option>
                    {classes.filter(c => !gradeId || c.gradeId === gradeId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value)}
                    className="h-12 px-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:border-eduGreen-500 outline-none appearance-none cursor-pointer min-w-[140px]"
                >
                    <option value="">All Statuses</option>
                    <option value="PAID">Cleared (Paid)</option>
                    <option value="PENDING">Pending Balance</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="NO_INVOICE">No Invoices</option>
                </select>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map(student => {
                    const fin = student.financials;
                    return (
                        <Card 
                            key={student.id} 
                            className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2rem] p-6 hover:border-eduGreen-900/50 transition-all cursor-pointer group"
                            onClick={() => setSelectedStudent(student)}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-300 dark:border-zinc-800 font-medium text-zinc-600 dark:text-zinc-500 group-hover:text-eduGreen-500 group-hover:border-eduGreen-900/50 transition-colors">
                                        {student.firstName[0]}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">{student.firstName} {student.lastName}</div>
                                        <div className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mt-1">
                                            {student.studentCode} • {student.class?.name || student.grade?.name}
                                        </div>
                                    </div>
                                </div>
                                <div className={cn("px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-widest", getStatusColor(fin.overallStatus))}>
                                    {fin.overallStatus.replace('_', ' ')}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="space-y-1">
                                    <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <Wallet className="w-3 h-3" /> Balance Due
                                    </div>
                                    <div className="text-lg font-bold text-zinc-900 dark:text-white">${fin.balance.toLocaleString()}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <FileText className="w-3 h-3" /> Total Billed
                                    </div>
                                    <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mt-1">${fin.totalBilled.toLocaleString()}</div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {students.length === 0 && !loading && (
                <div className="py-20 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl">
                    <User className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">No students found</h3>
                    <p className="text-sm text-zinc-600 mt-1">Try adjusting your filters</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white/40 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-900/50 backdrop-blur-md">
                    <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-800 hover:text-white"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-800 hover:text-white"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Modal Detail View */}
            <AnimatePresence>
                {selectedStudent && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSelectedStudent(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }} 
                            animate={{ scale: 1, y: 0 }} 
                            exit={{ scale: 0.95, y: 20 }} 
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0e0e0e] border border-zinc-300 dark:border-white/10 rounded-3xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-300 dark:border-zinc-800 font-medium text-xl text-zinc-600 dark:text-zinc-500">
                                        {selectedStudent.firstName[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{selectedStudent.firstName} {selectedStudent.lastName}</h2>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{selectedStudent.studentCode}</span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{selectedStudent.class?.name || selectedStudent.grade?.name}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedStudent(null)} className="text-zinc-600 dark:text-zinc-500 hover:text-white text-2xl leading-none">&times;</button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-300 dark:border-zinc-800/50">
                                    <div className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Total Billed</div>
                                    <div className="text-lg font-bold text-zinc-900 dark:text-white">${selectedStudent.financials.totalBilled.toLocaleString()}</div>
                                </div>
                                <div className="bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-300 dark:border-zinc-800/50">
                                    <div className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Total Paid</div>
                                    <div className="text-lg font-bold text-emerald-500">${selectedStudent.financials.totalPaid.toLocaleString()}</div>
                                </div>
                                <div className="bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-300 dark:border-zinc-800/50">
                                    <div className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Overdue</div>
                                    <div className="text-lg font-bold text-red-500">${selectedStudent.financials.totalOverdue.toLocaleString()}</div>
                                </div>
                                <div className="bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-300 dark:border-zinc-800/50">
                                    <div className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Total Invoices</div>
                                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{selectedStudent.financials.invoiceCount}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-900 pb-2">Latest Invoice Summary</h3>
                                {selectedStudent.financials.latestInvoice ? (
                                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-5 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-zinc-900 dark:text-white">Invoice #{selectedStudent.financials.latestInvoice.id.slice(0, 8).toUpperCase()}</div>
                                            <div className="text-xs text-zinc-600 dark:text-zinc-500 mt-1">Created: {new Date(selectedStudent.financials.latestInvoice.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-zinc-900 dark:text-white">${selectedStudent.financials.latestInvoice.amount.toLocaleString()}</div>
                                            <div className={cn("text-[9px] font-bold uppercase tracking-widest mt-1", 
                                                selectedStudent.financials.latestInvoice.status === 'PAID' ? 'text-emerald-500' : 
                                                selectedStudent.financials.latestInvoice.status === 'OVERDUE' ? 'text-red-500' : 'text-amber-500'
                                            )}>
                                                {selectedStudent.financials.latestInvoice.status}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-zinc-600 italic p-4 bg-zinc-100/30 dark:bg-zinc-900/30 rounded-xl">No invoices found for this student.</div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
