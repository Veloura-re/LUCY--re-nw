"use client";


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, KeyRound, Mail, Lock, User, Check, AlertCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function DirectorRegister() {
    const [step, setStep] = useState(1); // 1: Validate Key, 2: Register Details
    const [key, setKey] = useState("");
    const [schoolName, setSchoolName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    const handleValidateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/validate-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });

            const data = await res.json() as { schoolName?: string; email?: string; error?: string };

            if (res.ok) {
                setSchoolName(data.schoolName || "");
                setEmail(data.email || "");
                setStep(2);
            } else {
                setError(data.error || "Invalid deployment key.");
            }
        } catch (err) {
            setError("Failed to validate key. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // 1. SignUp with Supabase
            let authUser = null;
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        role: 'PRINCIPAL'
                    }
                }
            });

            if (authError) {
                if (authError.message.toLowerCase().includes("already registered")) {
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email,
                        password
                    });
                    if (signInError) throw new Error("Email already registered. Please use correct password.");
                    authUser = signInData.user;
                } else {
                    throw authError;
                }
            } else {
                authUser = authData.user;
            }

            if (authUser) {
                // 2. Complete registration on server (burn token, link user)
                const res = await fetch('/api/dir/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: key,
                        userId: authUser.id,
                        name,
                        email
                    })
                });

                if (res.ok) {
                    await supabase.auth.signInWithPassword({
                        email,
                        password
                    });
                    router.push('/dashboard');
                } else {
                    const data = await res.json() as { error?: string };
                    throw new Error(data.error || "Failed to finalize registration.");
                }
            }
        } catch (err: any) {
            setError(err.message || "Registration failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 font-sans text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-300">
            {/* Top Right Theme Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            {/* Immersive Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 dark:bg-eduGreen-500/10 blur-[140px] rounded-full" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-600/5 dark:bg-eduGreen-600/5 blur-[100px] rounded-full" />

                {/* Subtle Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            </div>

            <Card className="w-full max-w-md bg-white/90 dark:bg-zinc-950/50 backdrop-blur-2xl border-slate-200/80 dark:border-zinc-900 shadow-xl dark:shadow-2xl relative z-10 rounded-2xl sm:rounded-[2.5rem] overflow-hidden">
                <CardHeader className="text-center pb-2 pt-6 sm:pt-10 px-4 sm:px-6">
                    <div className="mx-auto flex justify-center mb-4 sm:mb-6">
                        {/* Cyberpunk Mark Wrapper */}
                        <div className="relative flex items-center bg-slate-100 dark:bg-zinc-950 border-r-2 border-emerald-600 dark:border-eduGreen-500 pr-3 overflow-hidden group rounded-lg p-1">
                            {/* Glitch Overlay Effect */}
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(20,122,82,0.1)_2px,rgba(20,122,82,0.1)_4px)] opacity-0 group-hover:opacity-100 transition-opacity mix-blend-screen" />

                            <span className="text-emerald-600 dark:text-eduGreen-500 font-orbitron font-black text-2xl sm:text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">[</span>
                            <span className="relative text-2xl sm:text-3xl font-black tracking-[0.2em] font-orbitron text-slate-900 dark:text-white ml-2">
                                LUCY
                                <span className="absolute -top-1 -right-2 text-[9px] sm:text-[10px] text-emerald-600 dark:text-eduGreen-500 tracking-tighter">OS</span>
                            </span>
                            <span className="text-emerald-600 dark:text-eduGreen-500 font-orbitron font-black text-2xl sm:text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity ml-2">]</span>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/50 text-[9px] sm:text-[10px] font-medium text-emerald-600 dark:text-eduGreen-500 uppercase tracking-[0.2em] mb-3 sm:mb-4">
                        <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-emerald-600 dark:fill-eduGreen-500" />
                        <span>Institutional Access</span>
                    </div>

                    <CardTitle className="text-2xl sm:text-3xl font-medium text-slate-900 dark:text-zinc-100 tracking-tighter">
                        {step === 1 ? "Deploy Institution" : "Finalize Setup"}
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-zinc-600 font-medium uppercase tracking-widest text-[9px] sm:text-[10px] mt-2">
                        {step === 1
                            ? "Enter your Master Deployment Key"
                            : `Environment: ${schoolName}`}
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-5 sm:px-10 pb-6 sm:pb-10 pt-4 sm:pt-6">
                    {step === 1 ? (
                        <form onSubmit={handleValidateKey} className="space-y-6 sm:space-y-8">
                            <div className="space-y-2 sm:space-y-3">
                                <label className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-zinc-700 uppercase tracking-[0.3em] ml-2">Deployment Key</label>
                                <Input
                                    icon={<KeyRound className="w-4 h-4 text-emerald-600 dark:text-eduGreen-500" />}
                                    value={key}
                                    onChange={e => setKey(e.target.value)}
                                    required
                                    placeholder="inv_xxxxxxxxxxxx"
                                    className="bg-slate-50 dark:bg-zinc-900/30 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-eduGreen-400 placeholder:text-slate-400 dark:placeholder:text-zinc-700 font-mono h-12 sm:h-16 rounded-xl sm:rounded-[1.25rem] focus:border-emerald-600 focus:bg-slate-100 dark:focus:bg-zinc-100/50 dark:bg-zinc-900/50 transition-all border-2 text-sm sm:text-base"
                                />
                            </div>

                            {error && (
                                <div className="p-3 sm:p-4 bg-red-950/10 border border-red-900/20 rounded-xl sm:rounded-2xl text-[10px] text-red-600 dark:text-red-500 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 font-medium uppercase tracking-wider">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-12 sm:h-16 rounded-xl sm:rounded-[1.25rem] font-medium text-xs uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-900/20 group border-t border-zinc-200 dark:border-white/5"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        Verify Key
                                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4 sm:space-y-6">
                            <div className="space-y-4 sm:space-y-5">
                                <div className="space-y-2 sm:space-y-3">
                                    <label className="text-[9px] sm:text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Director Name</label>
                                    <Input
                                        icon={<User className="w-4 h-4 text-zinc-600" />}
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                        placeholder="Enter full name"
                                        className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white dark:text-zinc-100 h-12 sm:h-16 rounded-xl sm:rounded-[1.25rem] focus:border-eduGreen-600 transition-all border-2 text-sm sm:text-base"
                                    />
                                </div>

                                <div className="space-y-2 sm:space-y-3">
                                    <label className="text-[9px] sm:text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Director Email</label>
                                    <Input
                                        type="email"
                                        icon={<Mail className="w-4 h-4 text-zinc-600" />}
                                        value={email}
                                        disabled
                                        className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-900 text-zinc-700 h-12 sm:h-16 rounded-xl sm:rounded-[1.25rem] cursor-not-allowed opacity-50 font-medium text-sm sm:text-base"
                                    />
                                </div>

                                <div className="space-y-2 sm:space-y-3">
                                    <label className="text-[9px] sm:text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Set Password</label>
                                    <Input
                                        type="password"
                                        icon={<Lock className="w-4 h-4 text-zinc-600" />}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white dark:text-zinc-100 h-12 sm:h-16 rounded-xl sm:rounded-[1.25rem] focus:border-eduGreen-600 transition-all border-2 text-sm sm:text-base"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 sm:p-4 bg-red-950/10 border border-red-900/20 rounded-xl sm:rounded-2xl text-[10px] text-red-600 dark:text-red-500 flex items-center gap-3 animate-in fade-in font-medium uppercase tracking-wider">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="flex items-start space-x-3 pt-1 pb-1 sm:pt-2 sm:pb-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-eduGreen-600 focus:ring-eduGreen-600"
                                />
                                <label htmlFor="terms" className="text-xs text-zinc-600 dark:text-zinc-400 leading-tight">
                                    I agree to the <Link href="/terms" target="_blank" className="text-eduGreen-500 hover:underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-eduGreen-500 hover:underline">Privacy Policy</Link>.
                                </label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-12 sm:h-16 rounded-xl sm:rounded-[1.25rem] font-medium text-xs uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-900/20 border-t border-zinc-200 dark:border-white/5"
                                disabled={isLoading || !agreedToTerms}
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Setup"}
                            </Button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-[9px] font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-[0.3em] hover:text-zinc-600 transition-colors py-2"
                            >
                                Use Different Key
                            </button>
                        </form>
                    )}
                </CardContent>

                <CardFooter className="justify-center border-t border-zinc-200 dark:border-zinc-900 py-5 sm:py-8 bg-white/20 dark:bg-zinc-950/20">
                    <Link href="/login" className="text-zinc-800 dark:text-zinc-200 hover:text-zinc-500 text-[9px] font-medium uppercase tracking-[0.4em] transition-all">
                        Return to Portal
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}

