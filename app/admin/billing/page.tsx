'use client';

import { useState, useEffect } from "react";
import {
    School, Loader2, History, FileText, Search, SlidersHorizontal, CreditCard, Gift, Compass
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SchoolType {
    id: string;
    name: string;
    schoolCode: string;
    createdAt: string;
    trialEndsAt: string | null;
    subscriptionStatus: string | null;
}

interface BillingReceiptType {
    id: string;
    schoolId: string;
    amount: string;
    reference: string;
    receiptUrl: string;
    status: string;
    createdAt: string;
    school: {
        name: string;
    };
    submittedBy: {
        name: string;
        email: string;
    };
}

export default function BillingControlsPage() {
    const [schools, setSchools] = useState<SchoolType[]>([]);
    const [billingReceipts, setBillingReceipts] = useState<BillingReceiptType[]>([]);
    const [isLoadingBilling, setIsLoadingBilling] = useState(true);
    const [isLoadingSchools, setIsLoadingSchools] = useState(true);

    // Filter & Search States
    const [receiptSearch, setReceiptSearch] = useState("");
    const [receiptFilter, setReceiptFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
    
    const [schoolSearch, setSchoolSearch] = useState("");
    const [schoolFilter, setSchoolFilter] = useState<'ALL' | 'PAYING' | 'NON_PAYING'>('ALL');

    useEffect(() => {
        fetchSchools();
        fetchBillingReceipts();
    }, []);

    const fetchSchools = async () => {
        setIsLoadingSchools(true);
        try {
            const res = await fetch('/api/admin/schools');
            if (!res.ok) throw new Error('Failed to fetch schools');
            const data = (await res.json()) as any;
            setSchools(data.schools || []);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch schools');
        } finally {
            setIsLoadingSchools(false);
        }
    };

    const fetchBillingReceipts = async () => {
        setIsLoadingBilling(true);
        try {
            const res = await fetch('/api/admin/billing/receipts');
            if (!res.ok) throw new Error('Failed to fetch billing receipts');
            const data = (await res.json()) as any;
            setBillingReceipts(data.receipts || []);
        } catch (err: any) {
            console.error(err.message);
            toast.error('Failed to fetch billing receipts');
        } finally {
            setIsLoadingBilling(false);
        }
    };

    const handleResolveReceipt = async (receiptId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => {
        try {
            const res = await fetch(`/api/admin/billing/receipts/${receiptId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes }),
            });
            if (!res.ok) throw new Error('Failed to resolve receipt');
            toast.success(`Receipt ${status.toLowerCase()} successfully`);
            fetchBillingReceipts();
            fetchSchools();
        } catch (err: any) {
            toast.error(err.message || "Failed to resolve receipt");
        }
    };

    const handleUpdateBillingStatus = async (schoolId: string, subscriptionStatus: string | null) => {
        try {
            const res = await fetch(`/api/admin/schools/${schoolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionStatus }),
            });
            if (!res.ok) throw new Error('Failed to update billing status');
            toast.success('Billing status updated successfully');
            fetchSchools();
        } catch (err: any) {
            toast.error(err.message || "Failed to update billing status");
        }
    };

    const handleExtendTrial = async (schoolId: string, days: number) => {
        try {
            const targetSchool = schools.find(s => s.id === schoolId) as any;
            const currentTrial = targetSchool?.trialEndsAt ? new Date(targetSchool.trialEndsAt).getTime() : 0;
            const baseTime = Math.max(Date.now(), currentTrial);
            const newTrial = new Date(baseTime + days * 24 * 60 * 60 * 1000);
            
            const res = await fetch(`/api/admin/schools/${schoolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trialEndsAt: newTrial.toISOString() }),
            });
            if (!res.ok) throw new Error('Failed to extend trial');
            toast.success(`Trial extended by ${days} days`);
            fetchSchools();
        } catch (err: any) {
            toast.error(err.message || "Failed to extend trial");
        }
    };

    // Client-side filtering of Receipts
    const filteredReceipts = billingReceipts.filter(r => {
        const matchesSearch = (r.school?.name || '').toLowerCase().includes(receiptSearch.toLowerCase()) || 
                              (r.reference || '').toLowerCase().includes(receiptSearch.toLowerCase()) ||
                              (r.submittedBy?.name || '').toLowerCase().includes(receiptSearch.toLowerCase());
        const matchesStatus = receiptFilter === 'ALL' || r.status === receiptFilter;
        return matchesSearch && matchesStatus;
    });

    // Client-side filtering of Schools
    const filteredSchools = schools.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(schoolSearch.toLowerCase()) || 
                              s.schoolCode.toLowerCase().includes(schoolSearch.toLowerCase());
        const isPaying = s.subscriptionStatus === 'active';
        const matchesBilling = schoolFilter === 'ALL' || 
                               (schoolFilter === 'PAYING' && isPaying) || 
                               (schoolFilter === 'NON_PAYING' && !isPaying);
        return matchesSearch && matchesBilling;
    });

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            {/* Header section */}
            <div>
                <h1 className="text-2xl font-bold font-orbitron tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-eduGreen-500" />
                    BILLING & LICENSE CONTROL
                </h1>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest font-medium mt-1">
                    Approve manual receipts, override licenses, and audit transaction records
                </p>
            </div>

            {/* Manual Receipts verification section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                        <History className="w-5 h-5 text-emerald-500" />
                        Bank Wire Verifications
                    </h2>
                </div>

                {/* Receipts Filters */}
                <div className="bg-zinc-100/40 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-600 dark:text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search receipts by school, submitter, reference..."
                            value={receiptSearch}
                            onChange={e => setReceiptSearch(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl h-10 pl-9 pr-4 text-xs text-zinc-900 dark:text-white focus:border-eduGreen-500 focus:outline-none placeholder-zinc-600"
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                        <SlidersHorizontal className="w-4 h-4 text-zinc-600 dark:text-zinc-500 mr-2 flex-shrink-0" />
                        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setReceiptFilter(status)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                                    receiptFilter === status
                                        ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-400 dark:border-zinc-700"
                                        : "bg-transparent text-zinc-600 dark:text-zinc-500 border-transparent hover:text-zinc-400"
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {isLoadingBilling ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 opacity-60" />
                    </div>
                ) : filteredReceipts.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-900 text-zinc-600 text-xs">
                        No billing receipts found matching filters.
                    </div>
                ) : (
                    <div className="rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden">
                        <div className="overflow-x-auto scrollbar-thin">
                            <div className="min-w-[760px]">
                                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-200 dark:bg-white/5 border-b border-zinc-200 dark:border-white/5 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">
                                    <div className="col-span-3">School Node</div>
                                    <div className="col-span-2">Submitter</div>
                                    <div className="col-span-2 text-center">Amount</div>
                                    <div className="col-span-2">Reference ID</div>
                                    <div className="col-span-1 text-center">Receipt</div>
                                    <div className="col-span-2 text-right">Actions</div>
                                </div>
                                <div className="divide-y divide-white/5 bg-white dark:bg-black">
                                    {filteredReceipts.map((receipt) => (
                                        <div key={receipt.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-200 dark:hover:bg-zinc-900/30 items-center transition-colors text-xs text-zinc-900 dark:text-white">
                                            <div className="col-span-3 font-semibold">
                                                {receipt.school?.name || 'Unknown School'}
                                            </div>
                                            <div className="col-span-2 text-zinc-600 dark:text-zinc-400">
                                                {receipt.submittedBy?.name || 'Unknown User'}
                                            </div>
                                            <div className="col-span-2 text-center font-bold text-emerald-400">
                                                ${parseFloat(receipt.amount).toFixed(2)}
                                            </div>
                                            <div className="col-span-2 font-mono text-zinc-700 dark:text-zinc-300 truncate select-all">
                                                {receipt.reference}
                                            </div>
                                            <div className="col-span-1 text-center">
                                                <a 
                                                    href={receipt.receiptUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="inline-flex text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-white uppercase font-bold tracking-widest"
                                                >
                                                    View
                                                </a>
                                            </div>
                                            <div className="col-span-2 flex items-center justify-end gap-2">
                                                {receipt.status === 'PENDING' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleResolveReceipt(receipt.id, 'APPROVED')}
                                                            className="px-2.5 py-1 rounded-md bg-emerald-950/20 border border-emerald-900/50 hover:bg-emerald-900/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt('Rejection reason (optional):') || '';
                                                                handleResolveReceipt(receipt.id, 'REJECTED', reason);
                                                            }}
                                                            className="px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className={cn(
                                                        "px-2.5 py-0.5 rounded text-[9px] font-bold uppercase border",
                                                        receipt.status === 'APPROVED' 
                                                            ? "border-emerald-900/30 text-emerald-500 bg-emerald-950/10" 
                                                            : "border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-500 bg-red-950/10"
                                                    )}>
                                                        {receipt.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* School License Ledger section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                    <School className="w-5 h-5 text-emerald-500" />
                    School License Ledger
                </h2>

                {/* School License Filters */}
                <div className="bg-zinc-100/40 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-600 dark:text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search schools by name or code..."
                            value={schoolSearch}
                            onChange={e => setSchoolSearch(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl h-10 pl-9 pr-4 text-xs text-zinc-900 dark:text-white focus:border-eduGreen-500 focus:outline-none placeholder-zinc-600"
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                        <SlidersHorizontal className="w-4 h-4 text-zinc-600 dark:text-zinc-500 mr-2 flex-shrink-0" />
                        {(['ALL', 'PAYING', 'NON_PAYING'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setSchoolFilter(f)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                                    schoolFilter === f
                                        ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-400 dark:border-zinc-700"
                                        : "bg-transparent text-zinc-600 dark:text-zinc-500 border-transparent hover:text-zinc-400"
                                )}
                            >
                                {f.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {isLoadingSchools ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 opacity-60" />
                    </div>
                ) : filteredSchools.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-900 text-zinc-600 text-xs">
                        No schools discovered matching filters.
                    </div>
                ) : (
                    <div className="rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden">
                        <div className="overflow-x-auto scrollbar-thin">
                            <div className="min-w-[760px]">
                                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-200 dark:bg-white/5 border-b border-zinc-200 dark:border-white/5 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">
                                    <div className="col-span-3">School Name</div>
                                    <div className="col-span-2">Trial Ends</div>
                                    <div className="col-span-2 text-center">Remaining</div>
                                    <div className="col-span-2 text-center">Billing State</div>
                                    <div className="col-span-3 text-right">Billing Actions</div>
                                </div>
                                <div className="divide-y divide-white/5 bg-white dark:bg-black">
                                    {filteredSchools.map((school) => {
                                        const now = new Date();
                                        let trialEndsAt = school.trialEndsAt ? new Date(school.trialEndsAt) : null;
                                        
                                        // Default to 120 days from creation if no explicit trial date is set
                                        if (!trialEndsAt && school.createdAt) {
                                            trialEndsAt = new Date(school.createdAt);
                                            trialEndsAt.setDate(trialEndsAt.getDate() + 120);
                                        }
                                        
                                        const remainingDays = trialEndsAt 
                                            ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                                            : 0;
                                        const expired = trialEndsAt ? now > trialEndsAt : false;
                                        const activeSub = school.subscriptionStatus === 'active';

                                        return (
                                            <div key={school.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-200 dark:hover:bg-zinc-900/30 items-center transition-colors text-xs text-zinc-900 dark:text-white">
                                                <div className="col-span-3">
                                                    <div className="font-semibold">{school.name}</div>
                                                    <div className="text-[9px] text-zinc-600 dark:text-zinc-500 font-mono mt-0.5 select-all">{school.schoolCode}</div>
                                                </div>
                                                <div className="col-span-2 font-mono text-zinc-600 dark:text-zinc-400">
                                                    {trialEndsAt ? trialEndsAt.toLocaleDateString() : 'N/A (120d Default)'}
                                                </div>
                                                <div className="col-span-2 text-center font-mono">
                                                    {activeSub ? (
                                                        <span className="text-emerald-500 font-bold">UNLIMITED</span>
                                                    ) : expired ? (
                                                        <span className="text-red-600 dark:text-red-500 font-bold">EXPIRED</span>
                                                    ) : (
                                                        <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{remainingDays} days</span>
                                                    )}
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                                                        activeSub 
                                                            ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400" 
                                                            : "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-500"
                                                    )}>
                                                        {activeSub ? 'Paying' : 'Non-paying'}
                                                    </span>
                                                </div>
                                                <div className="col-span-3 flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleUpdateBillingStatus(school.id, activeSub ? 'trialing' : 'active')}
                                                        className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-emerald-900/30 hover:text-emerald-400 text-zinc-600 dark:text-zinc-500 text-[10px] font-semibold uppercase tracking-wider transition-all"
                                                    >
                                                        {activeSub ? 'Set Non-paying' : 'Set Paying'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleExtendTrial(school.id, 30)}
                                                        className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-600 dark:text-zinc-500 text-[10px] font-semibold uppercase tracking-wider transition-all"
                                                    >
                                                        +30 Days
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
