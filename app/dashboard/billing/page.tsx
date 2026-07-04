'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, AlertCircle, Loader2, Compass, CheckCircle, Upload, History, FileText, CheckCircle2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';

export default function BillingPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submittingReceipt, setSubmittingReceipt] = useState(false);
    const [schoolInfo, setSchoolInfo] = useState<any>(null);
    
    // Tab State
    const [paymentMode, setPaymentMode] = useState<'STRIPE' | 'BANK'>('STRIPE');
    
    // Manual Payment Form States
    const [amount, setAmount] = useState('250.00');
    const [reference, setReference] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [pastReceipts, setPastReceipts] = useState<any[]>([]);

    const fetchSchoolBillingAndReceipts = async () => {
        try {
            // Fetch school settings
            const resSettings = await fetch('/api/school/settings');
            const dataSettings = await resSettings.json() as any;
            if (dataSettings.school) {
                setSchoolInfo(dataSettings.school);
            } else {
                const resUser = await fetch('/api/user/settings');
                const dataUser = await resUser.json() as any;
                if (dataUser.user && dataUser.user.school) {
                    setSchoolInfo(dataUser.user.school);
                }
            }

            // Fetch billing receipts
            const resReceipts = await fetch('/api/school/billing/receipt');
            const dataReceipts = await resReceipts.json() as any;
            if (dataReceipts.receipts) {
                setPastReceipts(dataReceipts.receipts);
            }
        } catch (err) {
            console.error('Failed to load billing details:', err);
            toast.error('Failed to load subscription details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchoolBillingAndReceipts();
    }, []);

    const handleSubscribeSimulation = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/school/billing/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json() as any;
            if (data.success) {
                toast.success('Stripe link established! Subscription activated.');
                // Refresh data
                await fetchSchoolBillingAndReceipts();
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                toast.error(data.error || 'Failed to simulate Stripe link.');
            }
        } catch (err) {
            toast.error('Simulation server connection failed.');
        } finally {
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
                await fetchSchoolBillingAndReceipts();
            } else {
                toast.error(data.error || 'Failed to submit receipt.');
            }
        } catch (err) {
            toast.error('Receipt submission failed.');
        } finally {
            setSubmittingReceipt(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-eduGreen-500 animate-spin mb-4" />
                <p className="text-zinc-500 font-orbitron text-xs tracking-widest uppercase">Querying Ledger...</p>
            </div>
        );
    }

    if (!schoolInfo) {
        return (
            <div className="max-w-xl mx-auto mt-12 bg-zinc-900 border border-red-950/50 rounded-2xl p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold uppercase tracking-tighter text-white mb-2">No Institution Linked</h1>
                <p className="text-zinc-400 text-sm">
                    This account is not currently linked to any active educational institution node.
                </p>
            </div>
        );
    }

    const now = new Date();
    const createdAt = new Date(schoolInfo.createdAt);
    const trialEndsAt = schoolInfo.trialEndsAt 
        ? new Date(schoolInfo.trialEndsAt) 
        : new Date(createdAt.getTime() + 60 * 24 * 60 * 60 * 1000);

    const totalTrialDuration = 60 * 24 * 60 * 60 * 1000;
    const timeElapsed = now.getTime() - createdAt.getTime();
    const trialPercentElapsed = Math.min(100, Math.max(0, (timeElapsed / totalTrialDuration) * 100));

    const msRemaining = trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const isExpired = msRemaining <= 0;
    const isSubscribed = schoolInfo.subscriptionStatus === 'active';
    
    // Check if there are any pending manual receipts
    const hasPendingReceipt = pastReceipts.some((r: any) => r.status === 'PENDING');

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black font-orbitron tracking-tight text-white flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-eduGreen-500" />
                    BILLING & SUBSCRIPTION
                </h1>
                <p className="text-zinc-500 text-xs tracking-widest uppercase font-medium mt-1">
                    Manage institutional access ledger for {schoolInfo.name}
                </p>
            </div>

            {/* Expired Alert */}
            {isExpired && !isSubscribed && (
                <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-red-950/40 rounded-xl flex items-center justify-center border border-red-500/20">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm uppercase tracking-tighter">Trial Period Concluded</h3>
                            <p className="text-zinc-400 text-xs mt-1">
                                Access to your school dashboard has been restricted. Complete billing setup to reactivate services.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Receipt Notification Banner */}
            {hasPendingReceipt && !isSubscribed && (
                <div className="bg-amber-950/25 border border-amber-500/30 rounded-2xl p-6 flex gap-4 items-center">
                    <div className="w-12 h-12 bg-amber-950/40 rounded-xl flex items-center justify-center border border-amber-500/20">
                        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm uppercase tracking-tighter">Receipt Review In Progress</h3>
                        <p className="text-zinc-400 text-xs mt-1">
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
                    <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(20,122,82,0.03)_2px,rgba(20,122,82,0.03)_4px)] mix-blend-screen pointer-events-none" />
                        
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="px-2.5 py-1 bg-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400 rounded-full">
                                    Account License Node
                                </span>
                                <h2 className="text-xl font-bold text-white mt-3 font-orbitron">{schoolInfo.name}</h2>
                            </div>
                            <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${
                                isSubscribed 
                                    ? 'bg-eduGreen-950/20 border-eduGreen-500/30 text-eduGreen-500' 
                                    : hasPendingReceipt
                                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-500'
                                        : isExpired
                                            ? 'bg-red-950/20 border-red-500/30 text-red-500'
                                            : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
                            }`}>
                                {isSubscribed ? 'Active' : hasPendingReceipt ? 'Verification' : isExpired ? 'Expired' : 'Free Trial'}
                            </span>
                        </div>

                        {!isSubscribed && (
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-semibold text-zinc-400">
                                    <span>60-Day Trial Progress</span>
                                    <span>{isExpired ? 'Expired' : `${daysRemaining} days remaining`}</span>
                                </div>
                                <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800/50">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${
                                            isExpired ? 'bg-red-500' : daysRemaining < 10 ? 'bg-yellow-500' : 'bg-eduGreen-500'
                                        }`}
                                        style={{ width: `${trialPercentElapsed}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                    Trial Concludes: {trialEndsAt.toLocaleDateString()}
                                </p>
                            </div>
                        )}

                        {isSubscribed && (
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-3 text-eduGreen-500 bg-eduGreen-950/10 border border-eduGreen-500/20 rounded-xl p-4">
                                    <ShieldCheck className="w-6 h-6 flex-shrink-0" />
                                    <div className="text-xs">
                                        <span className="font-bold block uppercase tracking-tight">Active Node License</span>
                                        Your system subscription is live. Auto-debits occur monthly.
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
                                        <span className="text-zinc-500 block uppercase text-[10px] tracking-wider font-mono">Customer ID</span>
                                        <code className="text-white text-[11px] font-mono mt-1 block select-all truncate">{schoolInfo.stripeCustomerId || 'cus_manual_ledger'}</code>
                                    </div>
                                    <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
                                        <span className="text-zinc-500 block uppercase text-[10px] tracking-wider font-mono">Subscription ID</span>
                                        <code className="text-white text-[11px] font-mono mt-1 block select-all truncate">{schoolInfo.stripeSubscriptionId || 'sub_manual_ledger'}</code>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Subscription Setup Area */}
                    {!isSubscribed && (
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                            {/* Inner Tab Header */}
                            <div className="flex border-b border-zinc-800 bg-zinc-950/50">
                                <button
                                    onClick={() => setPaymentMode('STRIPE')}
                                    className={`flex-1 py-4 text-xs font-black uppercase tracking-wider font-orbitron transition-all border-b-2 flex items-center justify-center gap-2 ${
                                        paymentMode === 'STRIPE'
                                            ? 'border-eduGreen-500 bg-eduGreen-950/5 text-white'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Stripe Payment Gateway
                                </button>
                                <button
                                    onClick={() => setPaymentMode('BANK')}
                                    className={`flex-1 py-4 text-xs font-black uppercase tracking-wider font-orbitron transition-all border-b-2 flex items-center justify-center gap-2 ${
                                        paymentMode === 'BANK'
                                            ? 'border-eduGreen-500 bg-eduGreen-950/5 text-white'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
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
                                        <h3 className="text-sm font-semibold text-white uppercase tracking-tight">Connect with Stripe Gateway</h3>
                                        <p className="text-zinc-400 text-xs leading-relaxed">
                                            Authorize pre-approved credit card debits directly through Stripe's secure portal. You will be billed **$250.00 per month** to sustain platform operations.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleSubscribeSimulation}
                                        disabled={submitting}
                                        className="w-full py-4 bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CreditCard className="w-4 h-4" />
                                        )}
                                        Establish Stripe Connection & Subscribe
                                    </button>
                                </div>
                            )}

                            {/* Bank Transfer View */}
                            {paymentMode === 'BANK' && (
                                <form onSubmit={handleManualReceiptSubmit} className="p-6 space-y-6 animate-in fade-in duration-300">
                                    {/* Bank Details */}
                                    <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs">
                                        <h4 className="font-bold text-white uppercase tracking-tight text-[10px] text-eduGreen-500">Official Bank Wire Details</h4>
                                        <div className="grid grid-cols-2 gap-y-1 text-zinc-400">
                                            <span>Bank:</span> <span className="text-white font-semibold">LUCY ACADEMIA LEDGER CORP</span>
                                            <span>Account:</span> <span className="text-white font-semibold">1003-8842-1985</span>
                                            <span>Route/Swift:</span> <span className="text-white font-semibold">LUCYACXX</span>
                                            <span>Memo Reference:</span> <span className="text-eduGreen-400 font-bold select-all">{schoolInfo.schoolCode}</span>
                                        </div>
                                    </div>

                                    {/* Receipt Form Inputs */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">Transfer Amount (USD)</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={e => setAmount(e.target.value)}
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-11 pl-9 pr-4 text-xs text-white focus:border-eduGreen-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">Wire/Reference ID</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. TXN-10029388"
                                                value={reference}
                                                onChange={e => setReference(e.target.value)}
                                                required
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-11 px-4 text-xs text-white focus:border-eduGreen-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">Notes / Additional Info</label>
                                        <textarea
                                            placeholder="Optional remarks about the transfer..."
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            rows={2}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-eduGreen-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">Upload Receipt Image / Proof</label>
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
                    )}

                    {/* Receipt Submission Ledger */}
                    {pastReceipts.length > 0 && (
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
                            <h3 className="text-xs font-black font-orbitron text-white uppercase tracking-widest flex items-center gap-2">
                                <History className="w-4 h-4 text-zinc-400" />
                                Payment Receipt History
                            </h3>
                            <div className="divide-y divide-zinc-800/60 overflow-hidden">
                                {pastReceipts.map((receipt) => (
                                    <div key={receipt.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
                                                <FileText className="w-5 h-5 text-zinc-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white select-all">{receipt.reference}</span>
                                                    <span className="text-zinc-500 font-mono">•</span>
                                                    <span className="text-eduGreen-400 font-bold">${parseFloat(receipt.amount).toFixed(2)}</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-0.5">
                                                    Uploaded: {new Date(receipt.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <a 
                                                href={receipt.receiptUrl} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white transition-all text-[10px] uppercase font-bold tracking-wider"
                                            >
                                                View Receipt
                                            </a>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                                receipt.status === 'APPROVED' 
                                                    ? 'bg-eduGreen-950/20 border-eduGreen-900/50 text-eduGreen-400' 
                                                    : receipt.status === 'REJECTED'
                                                        ? 'bg-red-950/20 border-red-900/50 text-red-400'
                                                        : 'bg-zinc-950 border-zinc-800 text-zinc-500'
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
                <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between h-fit relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3">
                        <Compass className="w-5 h-5 text-zinc-700 group-hover:text-eduGreen-500 transition-colors" />
                    </div>

                    <div className="space-y-4">
                        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider block">
                            Enterprise Node Tier
                        </span>
                        
                        <div className="flex items-baseline text-white">
                            <span className="text-4xl font-extrabold tracking-tight font-orbitron text-eduGreen-500">$250</span>
                            <span className="ml-1 text-sm font-semibold text-zinc-400">/month</span>
                        </div>

                        <ul className="space-y-2 text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-eduGreen-500 flex-shrink-0" />
                                Unlimited students & staff
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-eduGreen-500 flex-shrink-0" />
                                3D presentation deck & custom logs
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-eduGreen-500 flex-shrink-0" />
                                Full academic analytics suite
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-eduGreen-500 flex-shrink-0" />
                                Core AI assistant & automated grading
                            </li>
                        </ul>
                    </div>

                    <div className="mt-8 pt-4 border-t border-zinc-800/80 text-[10px] text-zinc-500 leading-relaxed">
                        Need payment support? Direct bank wire confirmations can take up to 24 hours to review. Stripe subscriptions activate immediately.
                    </div>
                </div>
            </div>
        </div>
    );
}
