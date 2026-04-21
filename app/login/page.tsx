"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Lock, ShieldCheck, ArrowRight, Loader2, AlertCircle, Shield } from "lucide-react";
import Link from "next/link";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const errorParam = searchParams.get('error');
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(errorParam);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setIsLoading(false);
            return;
        }

        router.refresh();
        router.push("/dashboard");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans text-white relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-eduGreen-500/20 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />
            </div>

            <Card className="w-full max-w-md bg-zinc-900/90 border-zinc-800 shadow-2xl relative z-10 overflow-hidden">
                <CardHeader className="space-y-2 items-center text-center pb-2 pt-8">
                    <div className="mx-auto flex justify-center mb-4">
                        {/* Cyberpunk Mark Wrapper */}
                        <div className="relative flex items-center bg-zinc-950 border-r-2 border-eduGreen-500 pr-3 overflow-hidden group">
                            {/* Glitch Overlay Effect */}
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(20,122,82,0.1)_2px,rgba(20,122,82,0.1)_4px)] opacity-0 group-hover:opacity-100 transition-opacity mix-blend-screen" />

                            <span className="text-eduGreen-500 font-orbitron font-black text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">[</span>
                            <span className="relative text-3xl font-black tracking-[0.2em] font-orbitron text-white ml-2">
                                LUCY
                                <span className="absolute -top-1 -right-2 text-[10px] text-eduGreen-500 tracking-tighter">OS</span>
                            </span>
                            <span className="text-eduGreen-500 font-orbitron font-black text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity ml-2">]</span>
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-medium text-white tracking-tight">
                        Welcome Back
                    </CardTitle>
                    <CardDescription className="text-zinc-500 font-medium text-sm">
                        Access your workspace
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                    <form onSubmit={handleLogin} className="space-y-5">
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
                            <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-2xl text-[10px] text-red-500 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 font-medium uppercase tracking-wider">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="font-medium leading-relaxed">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-eduGreen-600 hover:bg-eduGreen-500 text-white py-7 text-base font-medium rounded-2xl group"
                            isLoading={isLoading}
                        >
                            Sign In
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex flex-col gap-4 border-t border-zinc-800 py-6 justify-center bg-zinc-950/40">
                    <div className="text-xs text-center text-zinc-500 font-medium">
                        New to LUCY?{" "}
                        <Link href="/register" className="text-eduGreen-500 font-medium hover:underline">
                            Create an account
                        </Link>
                    </div>
                    <div className="text-[9px] text-center text-zinc-600 flex items-center justify-center gap-2 px-8 font-medium">
                        <Shield className="w-3 h-3 text-eduGreen-900/50" />
                        <span className="uppercase tracking-tighter">Secure Educational Platform • AES-256 Encryption</span>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 font-sans text-white">
                <Loader2 className="w-8 h-8 animate-spin text-eduGreen-500" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}

