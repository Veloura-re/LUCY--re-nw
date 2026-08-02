"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { User, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function InviteForm({ token, email, schoolName, role, prefilledName }: { token: string, email: string, schoolName: string, role: string, prefilledName?: string }) {
    const [password, setPassword] = useState("");
    const [name, setName] = useState(prefilledName || "");
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setStatusText("Securing your credentials...");

        const supabase = createClient();
        let userId = "";

        // 1. Attempt SignUp with Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: role,
                }
            }
        });

        if (authError) {
            // Check if the error is because the user already exists (e.g. from a previous stuck attempt)
            if (authError.message.toLowerCase().includes("user already registered") || authError.message.toLowerCase().includes("already exists")) {
                setStatusText("Account detected. Authenticating...");
                
                // Fallback: Authenticate the user to get their ID
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (signInError) {
                    setError("Account exists but password incorrect. Please use your existing password, or contact admin to reset it.");
                    setIsLoading(false);
                    return;
                }

                if (!signInData.user) {
                    setError("Failed to retrieve user session. Please try again.");
                    setIsLoading(false);
                    return;
                }

                userId = signInData.user.id;
            } else {
                setError(authError.message);
                setIsLoading(false);
                return;
            }
        } else {
            if (!authData.user) {
                setError("No user data returned.");
                setIsLoading(false);
                return;
            }
            userId = authData.user.id;
        }

        setStatusText("Synchronizing with institutional records...");

        // 2. Call API to link User, School, and Burn Token
        const res = await fetch('/api/dir/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token,
                userId,
                name,
                email
            })
        });

        if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as any;
            setError(data.error || "Failed to complete registration on server.");
            setIsLoading(false);
            return;
        }

        setStatusText("Establishing secure session...");

        // Ensure session is explicitly established
        await supabase.auth.signInWithPassword({
            email,
            password
        });

        setStatusText("Access Granted. Redirecting...");
        router.push('/dashboard');
    };

    return (
        <div className="pt-2">
            <form onSubmit={handleRegister} className="space-y-6">
                
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Assigned Email</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-4 w-4 text-zinc-600 dark:text-zinc-500" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full h-12 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-xl pl-11 pr-4 text-sm text-zinc-600 dark:text-zinc-400 cursor-not-allowed"
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <ShieldCheck className="h-4 w-4 text-eduGreen-500/70" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest ml-1">Full Legal Name</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-zinc-600 dark:text-zinc-500 group-focus-within:text-eduGreen-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="e.g. Dr. Jane Smith"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                className="w-full h-12 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl pl-11 pr-4 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-500 focus:ring-1 focus:ring-eduGreen-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest ml-1">Secure Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-zinc-600 dark:text-zinc-500 group-focus-within:text-eduGreen-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full h-12 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl pl-11 pr-4 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-500 focus:ring-1 focus:ring-eduGreen-500 transition-all outline-none"
                            />
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex gap-3 text-red-600 dark:text-red-400 items-start shadow-inner">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <p className="text-[13px] leading-relaxed font-medium">{error}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl text-sm font-semibold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(34,197,94,0.15)] hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] group relative overflow-hidden"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {statusText}
                            </>
                        ) : (
                            <>
                                Initialize Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </span>
                    {!isLoading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    )}
                </Button>
                
                <p className="text-center text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest font-medium mt-6">
                    Protected by Institutional Access Control
                </p>
            </form>
        </div>
    );
}
