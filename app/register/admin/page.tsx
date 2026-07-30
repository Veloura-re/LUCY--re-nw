"use client";


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, KeyRound, Mail, Lock, User, Check, AlertCircle } from "lucide-react";

export default function AdminRegister() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // 1. Verify Secret Key with API BEFORE creating Auth user to prevent spam
        // Actually, we can do it in parallel or just handle cleanup. 
        // Let's create Auth user first, then sync. If sync fails (bad key), we delete auth user? 
        // Better: Allow anyone to be 'created' in Auth, but only give SUPERADMIN role in DB if key matches.

        // Step 1: SignUp
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name, role: 'SUPERADMIN' } // This metadata is insecure for RLS, strictly for UI
            }
        });

        if (authError) {
            setError(authError.message);
            setIsLoading(false);
            return;
        }

        if (authData.user) {
            // Step 2: Validate Key and Create DB Record
            const res = await fetch('/api/auth/register-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: authData.user.id,
                    email,
                    name,
                    secretKey
                })
            });

            const data = await res.json() as { error?: string };

            if (res.ok) {
                router.push('/admin/dashboard');
            } else {
                setError(data.error || "Registration failed.");
                // Optional: Delete supabase user if DB failed? 
                // For now, let's just leave it. They can't do anything without DB record.
            }
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4 font-sans text-zinc-900 dark:text-white">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-eduGreen-500/20 blur-[120px] rounded-full" />
            </div>

            <Card className="w-full max-w-md bg-zinc-100/90 dark:bg-zinc-900/90 border-zinc-300 dark:border-zinc-800 shadow-2xl relative z-10">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto flex justify-center mb-4">
                        {/* Cyberpunk Mark Wrapper */}
                        <div className="relative flex items-center bg-white dark:bg-zinc-950 border-r-2 border-eduGreen-500 pr-3 overflow-hidden group">
                            {/* Glitch Overlay Effect */}
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(20,122,82,0.1)_2px,rgba(20,122,82,0.1)_4px)] opacity-0 group-hover:opacity-100 transition-opacity mix-blend-screen" />

                            <span className="text-eduGreen-500 font-orbitron font-black text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">[</span>
                            <span className="relative text-3xl font-black tracking-[0.2em] font-orbitron text-zinc-900 dark:text-white ml-2">
                                LUCY
                                <span className="absolute -top-1 -right-2 text-[10px] text-eduGreen-500 tracking-tighter">OS</span>
                            </span>
                            <span className="text-eduGreen-500 font-orbitron font-black text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity ml-2">]</span>
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white">Super Admin Access</CardTitle>
                    <CardDescription className="text-zinc-600 dark:text-zinc-400">
                        Restricted registration. Requires Master Key.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-4">
                            <Input
                                label="Admin Name"
                                icon={<User className="w-4 h-4 text-zinc-600 dark:text-zinc-500" />}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                placeholder="System Administrator"
                                className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-600"
                            />
                            <Input
                                label="Email"
                                type="email"
                                icon={<Mail className="w-4 h-4 text-zinc-600 dark:text-zinc-500" />}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="admin@lucy.edu"
                                className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-600"
                            />
                            <Input
                                label="Password"
                                type="password"
                                icon={<Lock className="w-4 h-4 text-zinc-600 dark:text-zinc-500" />}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-600"
                            />
                            <div className="pt-2">
                                <Input
                                    label="Master Secret Key"
                                    type="password"
                                    icon={<KeyRound className="w-4 h-4 text-eduGreen-500" />}
                                    value={secretKey}
                                    onChange={e => setSecretKey(e.target.value)}
                                    required
                                    placeholder="ENTER_SECRET_KEY"
                                    className="bg-eduGreen-950/20 border-eduGreen-900/50 text-eduGreen-200 placeholder:text-eduGreen-800/50 focus:border-eduGreen-500"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-sm text-red-400 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}

                        <div className="flex items-start space-x-3 pt-2 pb-2">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-eduGreen-600 focus:ring-eduGreen-600"
                            />
                            <label htmlFor="terms" className="text-xs text-zinc-600 dark:text-zinc-400 leading-tight">
                                I agree to the <Link href="/terms" target="_blank" className="text-eduGreen-500 hover:underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-eduGreen-500 hover:underline">Privacy Policy</Link>. I understand the strict penalties for platform abuse.
                            </label>
                        </div>

                        <Button type="submit" disabled={!agreedToTerms || isLoading} className="w-full bg-eduGreen-600 hover:bg-eduGreen-500 text-white py-6 mt-2" isLoading={isLoading}>
                            Initialize Admin Account
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center border-t border-zinc-300 dark:border-zinc-800 py-4">
                    <Link href="/login" className="text-zinc-600 dark:text-zinc-500 hover:text-white text-sm transition-colors">
                        Return to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}

