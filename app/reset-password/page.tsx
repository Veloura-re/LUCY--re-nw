"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, ArrowLeft, CheckCircle2, Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        let isSubscribed = true;

        // 1. Listen for Supabase auth events (e.g. PASSWORD_RECOVERY or SIGNED_IN)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!isSubscribed) return;
            if (session) {
                setIsCheckingAuth(false);
            }
        });

        // 2. Initial session check with 2.5s grace period for hash token parsing
        async function checkSession() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    if (isSubscribed) setIsCheckingAuth(false);
                    return;
                }
                
                // Allow grace period for hash fragment hydration
                setTimeout(async () => {
                    if (!isSubscribed) return;
                    const { data: { session: delayedSession } } = await supabase.auth.getSession();
                    if (!delayedSession) {
                        setIsCheckingAuth(false);
                    } else {
                        setIsCheckingAuth(false);
                    }
                }, 2500);
            } catch (err) {
                console.error("Session check error:", err);
                if (isSubscribed) setIsCheckingAuth(false);
            }
        }

        checkSession();

        return () => {
            isSubscribed = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    // Password strength metrics
    const hasMinLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const isValid = hasMinLength && hasUppercase && hasNumber && hasSpecial && newPassword === confirmPassword;

    const getStrengthScore = () => {
        let score = 0;
        if (hasMinLength) score += 25;
        if (hasUppercase) score += 25;
        if (hasNumber) score += 25;
        if (hasSpecial) score += 25;
        return score;
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setIsLoading(true);
        setError(null);

        try {
            // Update password via Supabase Auth
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                setError(updateError.message || "Failed to update password.");
                setIsLoading(false);
                return;
            }

            // Also sync via API route if present
            await fetch("/api/user/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword })
            }).catch(() => {});

            setIsSuccess(true);
            
            // Sign out recovery session and redirect after brief pause
            setTimeout(async () => {
                await supabase.auth.signOut();
                router.push("/login?reset=success");
            }, 1800);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during password update.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4">
                <div className="flex items-center gap-3 text-sm font-mono text-zinc-500 animate-pulse">
                    <KeyRound className="w-5 h-5 text-emerald-500 animate-spin" />
                    <span>verifying_recovery_session...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4 font-sans text-zinc-900 dark:text-white relative overflow-hidden">
            {/* Ambient Backlit Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/15 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px]" />
            </div>

            <Card className="w-full max-w-md bg-zinc-50/90 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 shadow-2xl relative z-10 overflow-hidden rounded-3xl">
                {!isSuccess ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <CardHeader className="space-y-2 items-center text-center pb-2 pt-8">
                            <div className="mx-auto flex justify-center mb-2">
                                <Logo className="w-12 h-12" />
                            </div>
                            <CardTitle className="text-2xl font-bold uppercase tracking-tight font-mono">
                                reset_password
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
                                Enter your new secure credentials below to access your LUCY OS account.
                            </CardDescription>
                        </CardHeader>

                        <form onSubmit={handlePasswordUpdate}>
                            <CardContent className="space-y-4 pt-4">
                                {error && (
                                    <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* New Password Field */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            className="pl-10 pr-10 h-11 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 font-mono text-sm focus:border-emerald-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password Field */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="pl-10 h-11 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 font-mono text-sm focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* Password Strength Meter */}
                                {newPassword.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center justify-between text-[10px] font-mono">
                                            <span className="text-zinc-500">Security Score</span>
                                            <span className={cn(
                                                getStrengthScore() === 100 ? "text-emerald-400" : "text-amber-400"
                                            )}>
                                                {getStrengthScore()}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-300",
                                                    getStrengthScore() <= 25 ? "bg-red-500" :
                                                    getStrengthScore() <= 50 ? "bg-orange-500" :
                                                    getStrengthScore() <= 75 ? "bg-amber-500" : "bg-emerald-500"
                                                )}
                                                style={{ width: `${getStrengthScore()}%` }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono pt-1 text-zinc-500">
                                            <span className={cn("flex items-center gap-1", hasMinLength && "text-emerald-400 font-bold")}>
                                                {hasMinLength ? "✓" : "○"} 8+ Characters
                                            </span>
                                            <span className={cn("flex items-center gap-1", hasUppercase && "text-emerald-400 font-bold")}>
                                                {hasUppercase ? "✓" : "○"} Uppercase (A-Z)
                                            </span>
                                            <span className={cn("flex items-center gap-1", hasNumber && "text-emerald-400 font-bold")}>
                                                {hasNumber ? "✓" : "○"} Number (0-9)
                                            </span>
                                            <span className={cn("flex items-center gap-1", hasSpecial && "text-emerald-400 font-bold")}>
                                                {hasSpecial ? "✓" : "○"} Special Char (!@#)
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="flex flex-col gap-4 pb-8">
                                <Button
                                    type="submit"
                                    disabled={isLoading || !isValid}
                                    className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-black font-bold font-mono uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {isLoading ? "Updating Credentials..." : "Update Password"}
                                </Button>

                                <Link href="/login" className="w-full">
                                    <Button variant="ghost" type="button" className="w-full text-xs font-mono text-zinc-500 hover:text-zinc-300">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Cancel & Return to Login
                                    </Button>
                                </Link>
                            </CardFooter>
                        </form>
                    </div>
                ) : (
                    <div className="p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold font-mono uppercase text-emerald-400">
                            Password Updated!
                        </h3>
                        <p className="text-xs text-zinc-400 font-sans max-w-xs mx-auto">
                            Your password has been changed successfully. Redirecting you to login...
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );
}
