'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Key, Mail, ArrowRight, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center font-mono text-zinc-500 text-xs">INITIALIZING SECURE GATEWAY...</div>}>
            <AdminLoginForm />
        </Suspense>
    );
}

function AdminLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get('from');
    const reason = searchParams.get('reason');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
    const [challengeId, setChallengeId] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Authentication rejected.');
                setLoading(false);
                return;
            }

            if (data.requiresOtp && data.challengeId) {
                setChallengeId(data.challengeId);
                setMaskedEmail(data.maskedEmail || email);
                setStep('otp');
            }
        } catch {
            setError('Connection failure communicating with authentication gateway.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId, code: otpCode.trim() }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Verification code rejected.');
                setLoading(false);
                return;
            }

            // Success: navigate to role destination
            const target = from || data.redirectUrl || '/';
            router.push(target);
        } catch {
            setError('Verification request failed. Please retry.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800/80 rounded-xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-mono text-lg font-bold text-zinc-100 tracking-wider">
                            4xctrl // ADMIN
                        </h1>
                        <p className="text-xs text-zinc-400 font-mono">
                            Isolated Platform Governance Portal
                        </p>
                    </div>
                </div>

                {reason === 'expired' && (
                    <div className="mb-6 p-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Previous session expired after 30 minutes of inactivity. Please authenticate.</span>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {step === 'credentials' ? (
                    <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                                Administrator Email
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@5-cn.net"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Authenticating...' : 'Proceed to 2FA Verification'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleOtpSubmit} className="space-y-5">
                        <div className="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300">
                            <span className="font-semibold text-emerald-400 block mb-1">Mandatory 2FA Challenge</span>
                            Enter the 6-digit code sent to <span className="font-mono text-zinc-100">{maskedEmail}</span>. Code expires in 10 minutes.
                        </div>

                        <div>
                            <label className="block text-xs font-mono text-zinc-400 mb-1.5 text-center">
                                6-Digit Verification Code
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                required
                                autoFocus
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full py-3 text-center text-2xl font-mono tracking-widest bg-zinc-900 border border-zinc-800 rounded-lg text-emerald-400 placeholder-zinc-700 focus:outline-none focus:border-emerald-500 font-bold"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => { setStep('credentials'); setOtpCode(''); }}
                                className="w-1/3 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-mono transition-colors"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading || otpCode.length !== 6}
                                className="w-2/3 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Authenticate'}
                                <CheckCircle2 className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-8 pt-4 border-t border-zinc-900 text-center text-[11px] font-mono text-zinc-500">
                    ADMIN // STRICT ROLE-BASED ACCESS
                </div>
            </div>
        </div>
    );
}
