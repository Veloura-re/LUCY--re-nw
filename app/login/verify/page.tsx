"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AlertCircle, ArrowRight, MailCheck } from "lucide-react";

const RESEND_SECONDS = 60;

function VerifyContent() {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [rememberDevice, setRememberDevice] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(RESEND_SECONDS);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setNotice(null);
        let destination = '/dashboard';
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, rememberDevice }),
            });
            const data = (await res.json().catch(() => ({}))) as { error?: string; attemptsLeft?: number; redirectUrl?: string };
            if (data.redirectUrl) destination = data.redirectUrl;
            if (!res.ok) {
                if (res.status === 401) {
                    router.push('/login?error=Your sign-in expired. Please sign in again.');
                    return;
                }
                const left = typeof data.attemptsLeft === 'number' ? ` ${data.attemptsLeft} attempts left.` : '';
                setError((data.error || 'We could not check your code.') + left);
                setIsLoading(false);
                return;
            }
        } catch {
            setError('We could not check your code. Please try again.');
            setIsLoading(false);
            return;
        }
        router.refresh();
        router.push(destination);
    };

    const handleResend = async () => {
        setError(null);
        setNotice(null);
        const res = await fetch('/api/auth/resend-otp', { method: 'POST' });
        const data = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number };
        if (res.ok) {
            setNotice('A new code is on its way.');
            setCooldown(RESEND_SECONDS);
        } else if (res.status === 401) {
            router.push('/login?error=Your sign-in expired. Please sign in again.');
        } else {
            setError(data.error || 'We could not send a new code.');
            if (data.retryAfter) setCooldown(data.retryAfter);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 font-sans text-slate-900 dark:text-white">
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>
            <Card className="w-full max-w-md bg-white/90 dark:bg-zinc-900/90 border-slate-200 dark:border-zinc-800 shadow-xl rounded-2xl sm:rounded-3xl">
                <CardHeader className="space-y-1.5 items-center text-center pt-6 sm:pt-8 px-4 sm:px-6">
                    <div className="mx-auto flex justify-center mb-3 sm:mb-4">
                        <Logo className="w-12 h-12 sm:w-16 sm:h-16" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl font-medium tracking-tight">Check your email</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        We sent a 6-digit code to your email. It expires in 10 minutes.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 pb-6">
                    <form onSubmit={handleVerify} className="space-y-4 sm:space-y-5">
                        <Input
                            label="Sign-in code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="123456"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            icon={<MailCheck className="w-4 h-4" />}
                            className="tracking-[0.5em] text-center font-mono text-lg"
                            required
                        />

                        {error && (
                            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p className="font-medium leading-relaxed">{error}</p>
                            </div>
                        )}
                        {notice && <p className="text-xs text-emerald-600 dark:text-emerald-400">{notice}</p>}

                        <label className="flex items-start gap-3 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={rememberDevice}
                                onChange={(e) => setRememberDevice(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded accent-eduGreen-500"
                            />
                            Trust this device for 30 days (skip the code next time on this browser)
                        </label>

                        <Button
                            type="submit"
                            className="w-full bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-11 sm:h-14 text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl group"
                            isLoading={isLoading}
                            disabled={isLoading || code.length !== 6}
                        >
                            Verify and continue
                            <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </form>

                    <div className="mt-5 flex items-center justify-between text-xs">
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={cooldown > 0}
                            className="text-emerald-600 dark:text-eduGreen-500 font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                        </button>
                        <Link href="/logout" className="text-zinc-500 hover:underline">Use a different account</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white dark:bg-black" />}>
            <VerifyContent />
        </Suspense>
    );
}
