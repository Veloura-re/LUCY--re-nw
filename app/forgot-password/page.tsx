"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, ArrowLeft, KeyRound, CheckCircle2, Shield } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json() as any;

            if (!res.ok) {
                setError(data.error || "Failed to initiate password recovery.");
                setIsLoading(false);
                return;
            }

            setIsSubmitted(true);
        } catch (err: any) {
            setError(err.message || "An unexpected connection error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4 font-sans text-zinc-900 dark:text-white relative overflow-hidden">
            {/* Immersive Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-eduGreen-500/20 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />
            </div>

            <Card className="w-full max-w-md bg-zinc-100/90 dark:bg-zinc-900/90 border-zinc-300 dark:border-zinc-800 shadow-2xl relative z-10 overflow-hidden">
                {!isSubmitted ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <CardHeader className="space-y-2 items-center text-center pb-2 pt-8">
                            <div className="mx-auto flex justify-center mb-4">
                                <Logo className="w-14 h-14" />
                            </div>
                            <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight">
                                Recover Access
                            </CardTitle>
                            <CardDescription className="text-zinc-600 dark:text-zinc-500 font-medium text-sm">
                                Enter your email to reset your <span className="text-eduGreen-500">LUCY</span> password
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pt-6">
                            <form onSubmit={handleReset} className="space-y-6">
                                <Input
                                    label="Registered Email"
                                    type="email"
                                    placeholder="your-account@school.edu"
                                    icon={<Mail className="w-4 h-4" />}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />

                                {error && (
                                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-3">
                                        <p className="font-medium leading-relaxed">{error}</p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-eduGreen-600 hover:bg-eduGreen-500 text-white py-7 text-base font-medium rounded-2xl group"
                                    isLoading={isLoading}
                                >
                                    Send Reset Link
                                </Button>
                            </form>
                        </CardContent>
                    </div>
                ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-300 p-8 text-center space-y-6">
                        <div className="mx-auto w-20 h-20 bg-eduGreen-900/20 rounded-full flex items-center justify-center border border-eduGreen-500/30">
                            <CheckCircle2 className="w-10 h-10 text-eduGreen-500" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white">Check your Inbox</CardTitle>
                            <p className="text-zinc-600 dark:text-zinc-500 text-sm font-medium leading-relaxed">
                                We've sent password reset instructions to <br />
                                <span className="text-zinc-900 dark:text-white font-medium">{email}</span>
                            </p>
                        </div>
                        <Link href="/login" className="block w-full">
                            <Button variant="secondary" className="w-full py-7 font-medium rounded-2xl">
                                Back to Log In
                            </Button>
                        </Link>
                    </div>
                )}

                <CardFooter className="flex flex-col gap-4 border-t border-zinc-300 dark:border-zinc-800 py-6 justify-center bg-white/40 dark:bg-zinc-950/40">
                    {!isSubmitted && (
                        <Link href="/login" className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-500 font-medium hover:text-eduGreen-500 transition-colors uppercase tracking-widest">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Sign In
                        </Link>
                    )}
                    <div className="text-[9px] text-center text-zinc-600 flex items-center justify-center gap-2 px-8 font-medium">
                        <Shield className="w-3 h-3 text-eduGreen-900/50" />
                        <span className="uppercase tracking-tighter">Secure Password Recovery</span>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

