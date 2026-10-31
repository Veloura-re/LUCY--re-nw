"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LEGAL_VERSION } from "@/lib/legal-versions";

export default function AcceptTermsPage() {
    const router = useRouter();
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const accept = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/accept-terms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ acceptedTerms: true }),
            });
            if (res.status === 401) {
                router.replace("/login");
                return;
            }
            if (!res.ok) {
                const data = (await res.json().catch(() => ({}))) as { error?: string };
                setError(data.error || "Could not record your acceptance. Please try again.");
                setIsLoading(false);
                return;
            }
            router.replace("/dashboard");
        } catch {
            setError("Network error. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#0a0a0a] p-4 font-sans selection:bg-eduGreen-500/30">
            {/* Background Ambient Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-eduGreen-600/10 rounded-[100%] blur-[120px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-[100%] blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="mb-8 text-center flex flex-col items-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-800 shadow-2xl mb-6 backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-eduGreen-500/10 to-transparent" />
                        <ShieldCheck className="w-10 h-10 text-eduGreen-500 relative z-10 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]" />
                    </div>
                    <h1 className="text-3xl font-medium tracking-tight text-zinc-900 dark:text-white mb-2">Updated Terms</h1>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Revised {LEGAL_VERSION}</p>
                </div>

                <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-3xl border-zinc-200 dark:border-zinc-900 shadow-2xl overflow-hidden rounded-[2.5rem] border-t-zinc-800/50 relative">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-eduGreen-500/30 to-transparent" />

                    <CardHeader className="text-center pb-2 pt-10 px-8">
                        <CardTitle className="text-xl font-medium text-zinc-900 dark:text-white">Review and Accept</CardTitle>
                        <CardDescription className="text-zinc-600 dark:text-zinc-500 text-sm mt-2">
                            Our Terms of Service and Privacy Policy need your acceptance before you continue to your workspace.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-8 pb-10 pt-6 space-y-6">
                        <div className="flex items-start space-x-3">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-950 accent-eduGreen-500 cursor-pointer focus-visible:ring-2 focus-visible:ring-eduGreen-500"
                            />
                            <label htmlFor="terms" className="text-xs text-zinc-600 dark:text-zinc-400 leading-tight cursor-pointer select-none">
                                I agree to the <Link href="/terms" target="_blank" className="text-eduGreen-500 hover:underline font-semibold">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-eduGreen-500 hover:underline font-semibold">Privacy Policy</Link>.
                            </label>
                        </div>

                        {error && (
                            <div role="alert" className="p-4 bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex gap-3 text-red-600 dark:text-red-400 items-start shadow-inner">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <p className="text-[13px] leading-relaxed font-medium">{error}</p>
                            </div>
                        )}

                        <Button
                            onClick={accept}
                            isLoading={isLoading}
                            disabled={isLoading || !agreed}
                            className="w-full h-14 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl text-sm font-semibold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(34,197,94,0.15)] hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                        >
                            Accept and Continue
                        </Button>
                    </CardContent>
                </Card>

                <div className="mt-8 text-center flex justify-center gap-6 text-[10px] uppercase tracking-widest font-semibold text-zinc-600">
                    <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
                </div>
            </div>
        </div>
    );
}
