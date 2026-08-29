"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Lock, ShieldCheck, ArrowRight, Loader2, AlertCircle, Shield, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Turnstile } from '@marsidev/react-turnstile';
import { InteractiveParticleSimulation } from "@/components/public/animations";

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div
            whileHover={{ rotateX: 5, rotateY: -5 }}
            transition={{ type: "spring", stiffness: 150, damping: 20 }}
            style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const errorParam = searchParams.get('error');
    const resetParam = searchParams.get('reset');
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState<string | null>(errorParam);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!turnstileToken) {
            setError("Security check in progress. Please wait a moment and try again.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, turnstileToken })
            });

            const data = (await res.json()) as { error?: string };

            if (!res.ok) {
                setError(data.error || "Authentication failed");
                setIsLoading(false);
                return;
            }
        } catch (e: any) {
            setError("Internal Server Error");
            setIsLoading(false);
            return;
        }

        router.refresh();
        router.push("/dashboard");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 font-sans text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-300">
            <InteractiveParticleSimulation count={110} interactive={true} burstOnLoad={true} fullScreen={true} connectionDistance={145} showTriangles={true} />

            {/* Top Right Controls */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 dark:bg-eduGreen-500/20 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />
            </div>

            <TiltCard className="w-full max-w-md">
                <Card className="w-full max-w-md bg-white/90 dark:bg-zinc-900/90 border-slate-200 dark:border-zinc-800 shadow-xl dark:shadow-2xl relative z-10 overflow-hidden backdrop-blur-xl rounded-2xl sm:rounded-3xl">
                    <CardHeader className="space-y-1.5 items-center text-center pb-2 pt-6 sm:pt-8 px-4 sm:px-6">
                        <div className="mx-auto flex justify-center mb-3 sm:mb-4">
                            <Logo className="w-12 h-12 sm:w-16 sm:h-16" />
                        </div>
                        <CardTitle className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
                            Welcome Back
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-zinc-500 font-medium text-xs sm:text-sm">
                            Access your workspace
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                        {resetParam === 'success' && (
                            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                                <span>Password updated successfully! Please log in with your new credentials.</span>
                            </div>
                        )}
                        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="name@school.edu"
                                icon={<Mail className="w-4 h-4" />}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <div className="space-y-1">
                                <Input
                                    label="Password"
                                    type="password"
                                    placeholder="••••••••"
                                    icon={<Lock className="w-4 h-4" />}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <div className="flex justify-end p-1">
                                    <Link href="/forgot-password" title="Recover your password" className="text-[10px] text-zinc-600 hover:text-eduGreen-500 transition-colors font-medium uppercase tracking-widest">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 sm:p-4 bg-red-950/10 border border-red-900/20 rounded-xl sm:rounded-2xl text-[10px] text-red-600 dark:text-red-500 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 font-medium uppercase tracking-wider">
                                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                    <p className="font-medium leading-relaxed">{error}</p>
                                </div>
                            )}

                            <div className="flex justify-center">
                                {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                                    <Turnstile
                                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                                        onSuccess={(token) => setTurnstileToken(token)}
                                        options={{ theme: 'auto', size: 'invisible' }}
                                    />
                                ) : null}
                            </div>

                            <div className="flex items-start space-x-3 pt-1 pb-1 sm:pt-2 sm:pb-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-eduGreen-600 accent-eduGreen-500 checked:bg-eduGreen-600 focus:ring-eduGreen-500 cursor-pointer transition-all"
                                />
                                <label htmlFor="terms" className="text-xs text-zinc-600 dark:text-zinc-400 leading-tight cursor-pointer select-none">
                                    I agree to the <Link href="/terms" target="_blank" className="text-eduGreen-500 hover:underline font-semibold">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-eduGreen-500 hover:underline font-semibold">Privacy Policy</Link>.
                                </label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-11 sm:h-14 text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl group"
                                isLoading={isLoading}
                                disabled={isLoading || !agreedToTerms}
                            >
                                Sign In
                                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3 sm:gap-4 border-t border-slate-200/80 dark:border-zinc-800 py-4 sm:py-6 px-4 sm:px-6 justify-center bg-slate-50/80 dark:bg-zinc-950/40">
                        <div className="text-xs text-center text-slate-600 dark:text-zinc-500 font-medium">
                            New to LUCY?{" "}
                            <Link href="/register" className="text-emerald-600 dark:text-eduGreen-500 font-medium hover:underline">
                                Create an account
                            </Link>
                        </div>
                        <div className="text-[9px] text-center text-slate-400 dark:text-zinc-600 flex items-center justify-center gap-2 px-4 sm:px-8 font-medium">
                            <Shield className="w-3 h-3 text-emerald-600 dark:text-eduGreen-900/50" />
                            <span className="uppercase tracking-tighter">Secure Educational Platform • AES-256 Encryption</span>
                        </div>
                    </CardFooter>
                </Card>
            </TiltCard>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 font-sans text-zinc-900 dark:text-white">
                <Loader2 className="w-8 h-8 animate-spin text-eduGreen-500" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}

