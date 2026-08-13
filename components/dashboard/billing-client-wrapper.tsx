'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    CreditCard, 
    ShieldCheck, 
    AlertCircle, 
    Loader2, 
    Compass, 
    CheckCircle, 
    Upload, 
    History, 
    FileText, 
    DollarSign,
    WifiOff,
    RefreshCw,
    AlertTriangle,
    ShieldAlert,
    School
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';

const CACHE_KEY = 'lucy_billing_school_cache';
const TIMEOUT_MS = 10000;

// Helper: fetch with AbortController timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(id);
    }
}

interface BillingClientWrapperProps {
    initialSchool?: any;
    initialReceipts?: any[];
    me?: any;
}

export default function BillingClientWrapper({
    initialSchool,
    initialReceipts = [],
    me
}: BillingClientWrapperProps) {
    const [loading, setLoading] = useState(!initialSchool);
    const [isRetrying, setIsRetrying] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [isUsingCache, setIsUsingCache] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [submittingReceipt, setSubmittingReceipt] = useState(false);
    const [schoolInfo, setSchoolInfo] = useState<any>(initialSchool || null);
    
    // Tab State
    const [paymentMode, setPaymentMode] = useState<'STRIPE' | 'CHAPA' | 'BANK'>('STRIPE');
    
    // Manual Payment Form States
    const [amount, setAmount] = useState('49.00');
    const [reference, setReference] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [pastReceipts, setPastReceipts] = useState<any[]>(initialReceipts || []);

    const retryCountRef = useRef(0);

    // Save initial school to local cache if present
    useEffect(() => {
        if (initialSchool && initialSchool.id) {
            try {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(initialSchool));
            } catch {
                /* non-blocking */
            }
        }
    }, [initialSchool]);

    // Monitor online/offline browser state
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            fetchSchoolBillingAndReceipts();
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOffline(!navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Load initial cache from sessionStorage if initialSchool was absent
    useEffect(() => {
        if (!initialSchool) {
            try {
                const cached = sessionStorage.getItem(CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed && parsed.id) {
                        setSchoolInfo(parsed);
                        setIsUsingCache(true);
                        setLoading(false);
                    }
                }
            } catch {
                /* ignore cache parse failure */
            }
        }
    }, [initialSchool]);

    const fetchSchoolBillingAndReceipts = useCallback(async (isManualRetry = false) => {
        if (isManualRetry) {
            setIsRetrying(true);
        }

        try {
            // Parallel fetch for speed & resilience on slow connections
            const [settingsResult, receiptsResult] = await Promise.allSettled([
                (async () => {
                    // Try /api/school/settings first
                    try {
                        const res = await fetchWithTimeout('/api/school/settings');
                        if (res.ok) {
                            const data = (await res.json()) as any;
                            if (data?.school) return data.school;
                        }
                    } catch (e) {
                        console.warn('[Billing] /api/school/settings fetch failed, attempting fallback...', e);
                    }

                    // Fallback to /api/user/settings
                    try {
                        const resUser = await fetchWithTimeout('/api/user/settings');
                        if (resUser.ok) {
                            const dataUser = (await resUser.json()) as any;
                            if (dataUser?.user?.school) return dataUser.user.school;
                        }
                    } catch (e) {
                        console.warn('[Billing] /api/user/settings fetch failed:', e);
                    }
                    return null;
                })(),
                (async () => {
                    try {
                        const res = await fetchWithTimeout('/api/school/billing/receipt');
                        if (res.ok) {
                            const data = (await res.json()) as any;
                            return data?.receipts || [];
                        }
                    } catch (e) {
                        console.warn('[Billing] /api/school/billing/receipt fetch failed:', e);
                    }
                    return [];
                })()
            ]);

            let resolvedSchool: any = null;
            if (settingsResult.status === 'fulfilled' && settingsResult.value) {
                resolvedSchool = settingsResult.value;
                setSchoolInfo(resolvedSchool);
                setConnectionError(null);
                setIsUsingCache(false);
                retryCountRef.current = 0;

                try {
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify(resolvedSchool));
                } catch { /* non-blocking */ }
            }

            if (receiptsResult.status === 'fulfilled' && receiptsResult.value?.length > 0) {
                setPastReceipts(receiptsResult.value);
            }

            // If we still don't have school info, check if it's a network issue
            if (!resolvedSchool && !schoolInfo) {
                if (settingsResult.status === 'rejected' || !navigator.onLine) {
                    throw new Error('Network connection timed out or unstable.');
                }
            }
        } catch (err: any) {
            console.error('Billing fetch error:', err);
            
            // Auto-retry once on transient network errors if no manual retry
            if (!isManualRetry && retryCountRef.current < 2) {
                retryCountRef.current += 1;
                const backoffDelay = retryCountRef.current * 1500;
                setTimeout(() => {
                    fetchSchoolBillingAndReceipts();
                }, backoffDelay);
                return;
            }

            // Only mark connection error if we have no school info at all
            if (!schoolInfo) {
                setConnectionError(err.message || 'Connection to institutional ledger stalled.');
            }
            if (isManualRetry) {
                toast.error('Unable to reconnect. Please check your network connection.');
            }
        } finally {
            setLoading(false);
            setIsRetrying(false);
        }
    }, [schoolInfo]);

    useEffect(() => {
        // Silent background sync
        fetchSchoolBillingAndReceipts();
    }, [fetchSchoolBillingAndReceipts]);

    const handleStripeCheckout = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/school/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json() as any;
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else {
                toast.error(data.error || 'Failed to initialize secure checkout.');
                setSubmitting(false);
            }
        } catch (err) {
            toast.error('Checkout initialization failed.');
            setSubmitting(false);
        }
    };

    const handleChapaCheckout = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/school/billing/chapa-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json() as any;
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else {
                toast.error(data.error || 'Failed to initialize Chapa checkout.');
                setSubmitting(false);
            }
        } catch (err) {
            toast.error('Chapa checkout initialization failed.');
            setSubmitting(false);
        }
    };

    const handleManualReceiptSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reference.trim()) {
            toast.error('Please input your bank transfer reference ID.');
            return;
        }
        if (!receiptUrl) {
            toast.error('Please upload your bank transfer receipt proof.');
            return;
        }

        setSubmittingReceipt(true);
        try {
            const res = await fetch('/api/school/billing/receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    reference,
                    receiptUrl,
                    notes
                })
            });
            
            const data = await res.json() as any;
            if (data.success) {
                toast.success('Receipt submitted successfully for review!');
                setReference('');
                setReceiptUrl('');
                setNotes('');
                await fetchSchoolBillingAndReceipts(true);
            } else {
                toast.error(data.error || 'Failed to submit receipt.');
            }
        } catch (err) {
            toast.error('Receipt submission failed.');
        } finally {
            setSubmittingReceipt(false);
        }
    };

    // Initial Loading Skeleton (shown only when no school data exists anywhere)
    if (loading && !schoolInfo) {
        return (
            <div className="min-h-[55vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                <div className="relative mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-eduGreen-500 animate-spin" />
                    </div>
                </div>
                <p className="text-zinc-900 dark:text-white font-orbitron font-bold text-sm tracking-wider uppercase">Querying Institutional Ledger...</p>
                <p className="text-zinc-500 text-xs mt-1 max-w-sm">Establishing secure link with subscription node.</p>
            </div>
        );
    }

    // Connection Interrupted State (shown only when no school data is cached/available and network failed)
    if (connectionError && !schoolInfo) {
        return (
            <div className="max-w-xl mx-auto mt-12 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
                
                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-500/20">
                    {isOffline ? (
                        <WifiOff className="w-7 h-7 text-amber-500" />
                    ) : (
                        <AlertTriangle className="w-7 h-7 text-amber-500" />
                    )}
                </div>

                <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-500/20 inline-block mb-3">
                    {isOffline ? 'Network Offline' : 'Connection Latency Detected'}
                </span>

                <h1 className="text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white mb-2 font-orbitron">
                    Ledger Connection Stalled
                </h1>

                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed mb-6 max-w-md mx-auto">
                    We encountered network latency or packet loss while contacting your school&apos;s subscription ledger. Your institutional records remain safely linked.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={() => fetchSchoolBillingAndReceipts(true)}
                        disabled={isRetrying}
                        className="w-full sm:w-auto px-6 py-3 bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-eduGreen-600/20 active:scale-95"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                        {isRetrying ? 'Reconnecting...' : 'Retry Connection'}
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full sm:w-auto px-5 py-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    // Genuine Empty State (Only if account literally has zero school association across DB & relations)
    if (!schoolInfo) {
        return (
            <div className="max-w-xl mx-auto mt-12 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center shadow-xl animate-in fade-in duration-300">
                <div className="w-14 h-14 bg-eduGreen-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-eduGreen-500/20">
                    <School className="w-7 h-7 text-eduGreen-500" />
                </div>
                <h1 className="text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white mb-2 font-orbitron">No Institution Linked</h1>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed mb-6">
                    This account is not currently linked to an active school ledger. Please refresh your session or contact your school administrator to link your account.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={() => fetchSchoolBillingAndReceipts(true)}
                        disabled={isRetrying}
                        className="px-5 py-2.5 bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all inline-flex items-center gap-2"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                        {isRetrying ? 'Checking...' : 'Refresh Session'}
                    </button>
                    <a
                        href="/dashboard"
                        className="px-5 py-2.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                        Return to Overview
                    </a>
                </div>
            </div>
        );
    }

    const now = new Date();
    const createdAt = new Date(schoolInfo.createdAt || now);
    const trialEndsAt = schoolInfo.trialEndsAt 
        ? new Date(schoolInfo.trialEndsAt) 
        : new Date(createdAt.getTime() + 120 * 24 * 60 * 60 * 1000);

    const totalTrialDuration = 120 * 24 * 60 * 60 * 1000;
    const timeElapsed = Math.max(0, now.getTime() - createdAt.getTime());
    const trialPercentElapsed = Math.min(100, Math.max(0, (timeElapsed / totalTrialDuration) * 100));

    const msRemaining = trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const isExpired = msRemaining <= 0;
    const isSubscribed = schoolInfo.subscriptionStatus === 'active';
    
    // Check if there are any pending manual receipts
    const hasPendingReceipt = pastReceipts.some((r: any) => r.status === 'PENDING');

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {/* Cached / Offline Banner */}
            {(isUsingCache || isOffline || connectionError) && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <div className="text-xs">
                            <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider block">
                                {isOffline ? 'Offline Mode Active' : 'Cached Ledger Loaded'}
                            </span>
                            <span className="text-zinc-600 dark:text-zinc-400">
                                {isOffline 
                                    ? 'You are currently working offline. Reconnect to sync live payment records.'
                                    : 'Network connection is slow. Displaying local data while syncing live updates.'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchSchoolBillingAndReceipts(true)}
                        disabled={isRetrying}
                        className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0"
                    >
                        <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                        {isRetrying ? 'Syncing...' : 'Sync Live'}
                    </button>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-3xl font-black font-orbitron tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-eduGreen-500" />
                    BILLING & SUBSCRIPTION
                </h1>
                <p className="text-zinc-600 dark:text-zinc-500 text-xs tracking-widest uppercase font-medium mt-1">
                    Manage institutional access ledger for {schoolInfo.name}
                </p>
            </div>

            {/* Expired Alert */}
            {isExpired && !isSubscribed && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/30 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-red-950/40 rounded-xl flex items-center justify-center border border-red-200 dark:border-red-500/20">
                            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-zinc-900 dark:text-white font-bold text-sm uppercase tracking-tighter">Trial Period Concluded</h3>
                            <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-1">
                                Access to your school dashboard has been restricted. Complete billing setup to reactivate services.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Receipt Notification Banner */}
            {hasPendingReceipt && !isSubscribed && (
                <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-500/30 rounded-2xl p-6 flex gap-4 items-center shadow-sm">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 rounded-xl flex items-center justify-center border border-amber-300 dark:border-amber-500/20 shrink-0">
                        <Loader2 className="w-6 h-6 text-amber-600 dark:text-amber-500 animate-spin" />
                    </div>
                    <div>
                        <h3 className="text-zinc-900 dark:text-white font-bold text-sm uppercase tracking-tighter">Receipt Review In Progress</h3>
                        <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-1">
                            Your uploaded bank transfer receipt is currently pending review by our administration. We will activate your license shortly.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Billing Config Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Columns - Overview & Input Forms */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Status & Trial Card */}
                    <div className="bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-300 dark:border-zinc-800 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(20,122,82,0.03)_2px,rgba(20,122,82,0.03)_4px)] mix-blend-screen pointer-events-none" />
                        
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 rounded-full">
                                    Account License Node
                                </span>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mt-3 font-orbitron">{schoolInfo.name}</h2>
                            </div>
                            <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${
                                isSubscribed 
                                    ? 'bg-eduGreen-950/20 border-eduGreen-500/30 text-eduGreen-500' 
                                    : hasPendingReceipt
                                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500/30 text-amber-600 dark:text-amber-500'
                                        : isExpired
                                            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-500'
                                            : 'bg-zinc-200/80 dark:bg-zinc-800/80 border-zinc-400 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                            }`}>
                                {isSubscribed ? 'Active' : hasPendingReceipt ? 'Verification' : isExpired ? 'Expired' : 'Free Trial'}
                            </span>
                        </div>

                        {!isSubscribed && (
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                    <span>120-Day Trial Progress</span>
                                    <span>{isExpired ? 'Expired' : `${daysRemaining} days remaining`}</span>
                                </div>
                                <div className="w-full bg-white dark:bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-800/50">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${
                                            isExpired ? 'bg-red-500' : daysRemaining < 10 ? 'bg-yellow-500' : 'bg-eduGreen-500'
                                        }`}
                                        style={{ width: `${trialPercentElapsed}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">
                                    Trial Concludes: {trialEndsAt.toLocaleDateString()}
                                </p>
                            </div>
                        )}

                        {isSubscribed && (
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between gap-3 text-eduGreen-500 bg-eduGreen-950/10 border border-eduGreen-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="w-6 h-6 flex-shrink-0" />
                                        <div className="text-xs">
                                            <span className="font-bold block uppercase tracking-tight">Active Node License</span>
                                            {isExpired ? 'License expired. Please submit monthly payment.' : `License valid through ${trialEndsAt.toLocaleDateString()} (${daysRemaining} days remaining).`}
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full bg-eduGreen-500/10 border border-eduGreen-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                                        {daysRemaining}d Active
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="bg-white/40 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-300 dark:border-zinc-800">
                                        <span className="text-zinc-600 dark:text-zinc-500 block uppercase text-[10px] tracking-wider font-mono">Customer ID</span>
                                        <code className="text-zinc-900 dark:text-white text-[11px] font-mono mt-1 block select-all truncate">{schoolInfo.stripeCustomerId || 'cus_manual_ledger'}</code>
                                    </div>
                                    <div className="bg-white/40 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-300 dark:border-zinc-800">
                                        <span className="text-zinc-600 dark:text-zinc-500 block uppercase text-[10px] tracking-wider font-mono">Next Renewal Due</span>
                                        <code className="text-zinc-900 dark:text-white text-[11px] font-mono mt-1 block select-all truncate">{trialEndsAt.toLocaleDateString()}</code>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Subscription Setup Area */}
                    <div className="bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-2xl overflow-hidden">
                        {/* Inner Tab Header */}
                        <div className="flex border-b border-zinc-200 dark:border-white/5">
                            <button
                                onClick={() => setPaymentMode('STRIPE')}
                                className={`flex-1 py-4 text-xs font-black uppercase tracking-wider font-orbitron transition-all border-b-2 flex items-center justify-center gap-2 ${
                                    paymentMode === 'STRIPE'
                                        ? 'border-eduGreen-500 bg-eduGreen-950/5 text-zinc-900 dark:text-white'
                                        : 'border-transparent text-zinc-600 dark:text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                <CreditCard className="w-4 h-4" />
                                Stripe Gateway
                            </button>
                            <button
                                onClick={() => setPaymentMode('CHAPA')}
                                className={`flex-1 py-4 text-xs font-black uppercase tracking-wider font-orbitron transition-all border-b-2 flex items-center justify-center gap-2 ${
                                    paymentMode === 'CHAPA'
                                        ? 'border-eduGreen-500 bg-eduGreen-950/5 text-zinc-900 dark:text-white'
                                        : 'border-transparent text-zinc-600 dark:text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                <DollarSign className="w-4 h-4" />
                                Telebirr / CBE
                            </button>
                            <button
                                onClick={() => setPaymentMode('BANK')}
                                className={`flex-1 py-4 text-xs font-black uppercase tracking-wider font-orbitron transition-all border-b-2 flex items-center justify-center gap-2 ${
                                    paymentMode === 'BANK'
                                        ? 'border-eduGreen-500 bg-eduGreen-950/5 text-zinc-900 dark:text-white'
                                        : 'border-transparent text-zinc-600 dark:text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                <Upload className="w-4 h-4" />
                                Manual Bank Transfer
                            </button>
                        </div>

                        {/* Stripe Setup View */}
                        {paymentMode === 'STRIPE' && (
                            <div className="p-6 space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-tight">Connect with Stripe Gateway</h3>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
                                        Authorize pre-approved credit card debits directly through Stripe&apos;s secure portal. You will be billed <strong>$49.00 per month</strong> to sustain platform operations.
                                    </p>
                                </div>
                                <button
                                    onClick={handleStripeCheckout}
                                    disabled={submitting}
                                    className="w-full py-4 bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CreditCard className="w-4 h-4" />
                                    )}
                                    Establish Stripe Connection &amp; Subscribe
                                </button>
                            </div>
                        )}

                        {/* Chapa Setup View */}
                        {paymentMode === 'CHAPA' && (
                            <div className="p-6 space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-tight">Pay via Telebirr or CBE</h3>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
                                        Pay locally using Ethiopian Birr (ETB). Selecting this option will open the secure Chapa checkout portal where you can pay using Telebirr, CBE, or local bank cards. Your subscription activates immediately upon payment.
                                    </p>
                                </div>
                                <button
                                    onClick={handleChapaCheckout}
                                    disabled={submitting}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <DollarSign className="w-4 h-4" />
                                    )}
                                    Pay with Telebirr / CBE
                                </button>
                            </div>
                        )}

                        {/* Bank Transfer View */}
                        {paymentMode === 'BANK' && (
                            <form onSubmit={handleManualReceiptSubmit} className="p-6 space-y-6 animate-in fade-in duration-300">
                                {/* Bank Details */}
                                <div className="bg-white/60 dark:bg-zinc-950/60 border border-zinc-300 dark:border-zinc-800 rounded-xl p-4 space-y-4 text-xs">
                                    <h4 className="font-bold text-zinc-900 dark:text-white uppercase tracking-tight text-[10px] text-eduGreen-500">Official Payment Methods</h4>
                                    
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-y-1 text-zinc-600 dark:text-zinc-400">
                                            <span>Method:</span> <span className="text-zinc-900 dark:text-white font-semibold">Telebirr</span>
                                            <span>Account / Phone:</span> <span className="text-zinc-900 dark:text-white font-semibold">0997267373</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-y-1 text-zinc-600 dark:text-zinc-400">
                                            <span>Method:</span> <span className="text-zinc-900 dark:text-white font-semibold">Commercial Bank of Ethiopia (CBE)</span>
                                            <span>Account:</span> <span className="text-zinc-600 dark:text-zinc-500 italic">...pending</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-1 text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-300 dark:border-zinc-800/50">
                                        <span>Transfer Reason / Memo:</span> <span className="text-eduGreen-400 font-bold select-all">{schoolInfo.schoolCode}</span>
                                    </div>
                                </div>

                                {/* Receipt Form Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Transfer Amount</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-zinc-600 dark:text-zinc-500" />
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={e => setAmount(e.target.value)}
                                                required
                                                min="0"
                                                step="0.01"
                                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl h-11 pl-9 pr-4 text-xs text-zinc-900 dark:text-white focus:border-eduGreen-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Wire/Reference ID</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. TXN-10029388"
                                            value={reference}
                                            onChange={e => setReference(e.target.value)}
                                            required
                                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl h-11 px-4 text-xs text-zinc-900 dark:text-white focus:border-eduGreen-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Notes / Additional Info</label>
                                    <textarea
                                        placeholder="Optional remarks about the transfer..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-900 dark:text-white focus:border-eduGreen-500 focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Upload Receipt Image / Proof</label>
                                    <ImageUpload
                                        value={receiptUrl}
                                        onChange={url => setReceiptUrl(url)}
                                        bucket="receipts"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submittingReceipt || !receiptUrl || !reference}
                                    className="w-full py-4 bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                                >
                                    {submittingReceipt ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    Submit Receipt for System Review
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Receipt Submission Ledger */}
                    {pastReceipts.length > 0 && (
                        <div className="bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                            <h3 className="text-xs font-black font-orbitron text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <History className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                                Payment Receipt History
                            </h3>
                            <div className="divide-y divide-zinc-800/60 overflow-hidden">
                                {pastReceipts.map((receipt) => (
                                    <div key={receipt.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                                                <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-zinc-900 dark:text-white select-all">{receipt.reference}</span>
                                                    <span className="text-zinc-600 dark:text-zinc-500 font-mono">•</span>
                                                    <span className="text-eduGreen-400 font-bold">${parseFloat(receipt.amount).toFixed(2)}</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-wider mt-0.5">
                                                    Uploaded: {new Date(receipt.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <a 
                                                href={receipt.receiptUrl} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all text-[10px] uppercase font-bold tracking-wider"
                                            >
                                                View Receipt
                                            </a>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                                receipt.status === 'APPROVED' 
                                                    ? 'bg-eduGreen-950/20 border-eduGreen-900/50 text-eduGreen-400' 
                                                    : receipt.status === 'REJECTED'
                                                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400'
                                                        : 'bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-500'
                                            }`}>
                                                {receipt.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Columns - Details info */}
                <div className="bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-300 dark:border-zinc-800 rounded-2xl p-6 flex flex-col justify-between h-fit relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3">
                        <Compass className="w-5 h-5 text-zinc-700 group-hover:text-eduGreen-500 transition-colors" />
                    </div>

                    <div className="space-y-4">
                        <span className="text-zinc-600 dark:text-zinc-500 text-[10px] font-black uppercase tracking-wider block">
                            Enterprise Node Tier
                        </span>
                        
                        <div className="flex items-baseline gap-2 text-zinc-900 dark:text-white">
                            <span className="text-4xl font-extrabold tracking-tight font-orbitron text-eduGreen-500">$49</span>
                            <span className="text-lg line-through text-zinc-600 dark:text-zinc-500 font-medium">$250</span>
                            <span className="ml-1 text-sm font-semibold text-zinc-600 dark:text-zinc-400">/month</span>
                        </div>

                        <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-300 dark:border-zinc-800/80">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-eduGreen-500 flex-shrink-0" />
                                Unlimited students &amp; staff
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-eduGreen-500 flex-shrink-0" />
                                3D presentation deck &amp; custom logs
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-eduGreen-500 flex-shrink-0" />
                                Full academic analytics suite
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-eduGreen-500 flex-shrink-0" />
                                Core AI assistant &amp; automated grading
                            </li>
                        </ul>
                    </div>

                    <div className="mt-8 pt-4 border-t border-zinc-300 dark:border-zinc-800/80 text-[10px] text-zinc-600 dark:text-zinc-500 leading-relaxed">
                        Need payment support? Direct bank wire confirmations can take up to 24 hours to review. Stripe subscriptions activate immediately.
                    </div>
                </div>
            </div>
        </div>
    );
}
