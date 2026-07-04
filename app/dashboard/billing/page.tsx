'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, AlertCircle, Loader2, Compass, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BillingPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [schoolInfo, setSchoolInfo] = useState<any>(null);

    useEffect(() => {
        async function fetchSchoolBilling() {
            try {
                const res = await fetch('/api/user/settings'); // settings returns user and school
                const data = await res.json();
                if (data.user && data.user.school) {
                    setSchoolInfo(data.user.school);
                } else {
                    // Fallback to fetch settings directly
                    const resDirect = await fetch('/api/school/settings');
                    const dataDirect = await resDirect.json();
                    if (dataDirect.school) {
                        setSchoolInfo(dataDirect.school);
                    }
                }
            } catch (err) {
                console.error('Failed to load school billing:', err);
                toast.error('Failed to load subscription details.');
            } finally {
                setLoading(false);
            }
        }
        fetchSchoolBilling();
    }, []);

    const handleSubscribeSimulation = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/school/billing/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Stripe link established! Subscription activated.');
                // Refresh local state
                setSchoolInfo((prev: any) => ({
                    ...prev,
                    subscriptionStatus: 'active',
                    stripeCustomerId: 'cus_simulated_stripe',
                    stripeSubscriptionId: 'sub_simulated_stripe',
                    trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                }));
                // Force page refresh or reload dashboard layout auth cache
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
        : new Date(createdAt.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days default

    const totalTrialDuration = 60 * 24 * 60 * 60 * 1000;
    const timeElapsed = now.getTime() - createdAt.getTime();
    const trialPercentElapsed = Math.min(100, Math.max(0, (timeElapsed / totalTrialDuration) * 100));

    const msRemaining = trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const isExpired = msRemaining <= 0;
    const isSubscribed = schoolInfo.subscriptionStatus === 'active';

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

            {/* Expired / Warning alert */}
            {isExpired && !isSubscribed && (
                <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-red-950/40 rounded-xl flex items-center justify-center border border-red-500/20">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm uppercase tracking-tighter">Trial Period Concluded</h3>
                            <p className="text-zinc-400 text-xs mt-1">
                                Access to your school dashboard has been restricted. Link a payment profile to resume system services.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSubscribeSimulation}
                        disabled={submitting}
                        className="w-full md:w-auto px-6 py-3 bg-red-500 hover:bg-red-600 active:scale-95 disabled:scale-100 disabled:opacity-50 text-black text-[10px] font-bold tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                        ) : (
                            <CreditCard className="w-4 h-4 text-black" />
                        )}
                        Activate Billing
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Card */}
                <div className="md:col-span-2 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 space-y-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(20,122,82,0.03)_2px,rgba(20,122,82,0.03)_4px)] mix-blend-screen pointer-events-none" />
                    
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="px-2.5 py-1 bg-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400 rounded-full">
                                Account Node Type: Institution
                            </span>
                            <h2 className="text-xl font-bold text-white mt-3 font-orbitron">{schoolInfo.name}</h2>
                        </div>
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${
                            isSubscribed 
                                ? 'bg-eduGreen-950/20 border-eduGreen-500/30 text-eduGreen-500' 
                                : isExpired
                                    ? 'bg-red-950/20 border-red-500/30 text-red-500'
                                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
                        }`}>
                            {isSubscribed ? 'Subscribed' : isExpired ? 'Expired' : 'Free Trial'}
                        </span>
                    </div>

                    {/* Progress details */}
                    {!isSubscribed && (
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-semibold text-zinc-400">
                                <span>60-Day Trial Status</span>
                                <span>{daysRemaining} days remaining</span>
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
                                Started: {createdAt.toLocaleDateString()} • Trial Concludes: {trialEndsAt.toLocaleDateString()}
                            </p>
                        </div>
                    )}

                    {isSubscribed && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-3 text-eduGreen-500 bg-eduGreen-950/10 border border-eduGreen-500/20 rounded-xl p-4">
                                <ShieldCheck className="w-6 h-6 flex-shrink-0" />
                                <div className="text-xs">
                                    <span className="font-bold block uppercase tracking-tight">Active Node License</span>
                                    Your system subscription is live. Stripe auto-debits on a monthly basis.
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
                                    <span className="text-zinc-500 block uppercase text-[10px] tracking-wider">Customer ID</span>
                                    <code className="text-white text-[11px] font-mono mt-1 block select-all">{schoolInfo.stripeCustomerId || 'cus_simulated_stripe'}</code>
                                </div>
                                <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
                                    <span className="text-zinc-500 block uppercase text-[10px] tracking-wider">Subscription ID</span>
                                    <code className="text-white text-[11px] font-mono mt-1 block select-all">{schoolInfo.stripeSubscriptionId || 'sub_simulated_stripe'}</code>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Plan Pricing Card */}
                <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3">
                        <Compass className="w-5 h-5 text-zinc-700 group-hover:text-eduGreen-500 transition-colors" />
                    </div>

                    <div className="space-y-4">
                        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider block">
                            Enterprise Tier
                        </span>
                        
                        <div className="flex items-baseline text-white">
                            <span className="text-4xl font-extrabold tracking-tight font-orbitron">$250</span>
                            <span className="ml-1 text-sm font-semibold text-zinc-400">/mo</span>
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

                    <div className="mt-6 pt-4 border-t border-zinc-800/80">
                        {isSubscribed ? (
                            <div className="w-full py-3 bg-zinc-800 text-zinc-400 text-[10px] font-bold tracking-widest uppercase rounded-xl text-center border border-zinc-700/50 cursor-default">
                                Active Subscription
                            </div>
                        ) : (
                            <button
                                onClick={handleSubscribeSimulation}
                                disabled={submitting}
                                className="w-full py-3 bg-eduGreen-600 hover:bg-eduGreen-500 text-white active:scale-95 disabled:scale-100 disabled:opacity-50 text-[10px] font-bold tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Connect Stripe Account'
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
