"use client";


import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowRight, ShieldCheck, KeyRound, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentRegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Code, 2: Details
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const [formData, setFormData] = useState({
        studentCode: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error("Security Keyphrase mismatch");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/register/student", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentCode: formData.studentCode,
                    email: formData.email,
                    password: formData.password
                }),
            });

            const data = await res.json() as { error?: string };

            if (!res.ok) {
                throw new Error(data.error || "Registration failed");
            }

            toast.success("Identity Verified. Access Granted.");
            router.push("/dashboard");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-white dark:via-black to-white dark:to-black" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-eduGreen-500/50 to-transparent opacity-50" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo Section */}
                <div className="text-center mb-6 sm:mb-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-eduGreen-900/20 rounded-xl sm:rounded-2xl border border-eduGreen-500/30 flex items-center justify-center mx-auto mb-3 sm:mb-4 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,115,0.1)]">
                        <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-eduGreen-500" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-medium text-zinc-900 dark:text-white tracking-tighter uppercase">Student Portal</h1>
                    <p className="text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-[0.2em] text-[10px] sm:text-xs mt-1 sm:mt-2">Secure Student Access</p>
                </div>

                <Card className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl border-zinc-200 dark:border-zinc-900 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-eduGreen-600 to-eduGreen-400" />

                    <CardHeader className="p-5 sm:p-8 border-b border-zinc-200 dark:border-zinc-900/50">
                        <CardTitle className="text-lg sm:text-xl font-medium text-zinc-900 dark:text-white uppercase tracking-wide">
                            Activation Process
                        </CardTitle>
                        <CardDescription className="text-zinc-600 font-medium text-[10px] sm:text-xs uppercase tracking-widest mt-1">
                            Enter your credentials to initialize your workspace
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 sm:p-8">
                        <form onSubmit={handleRegister} className="space-y-4 sm:space-y-6">
                            <AnimatePresence mode="wait">
                                {step === 1 ? (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-4 sm:space-y-6"
                                    >
                                        <div className="space-y-2 sm:space-y-3">
                                            <Label className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-500 ml-1">Student Invite Token</Label>
                                            <div className="relative group">
                                                <KeyRound className="absolute left-3.5 sm:left-4 top-3.5 sm:top-4 w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 group-focus-within:text-eduGreen-500 transition-colors" />
                                                <Input
                                                    value={formData.studentCode}
                                                    onChange={(e) => setFormData({ ...formData, studentCode: e.target.value.toUpperCase() })}
                                                    placeholder="STU-XXXX-XXXX"
                                                    className="pl-10 sm:pl-12 h-12 sm:h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono font-medium text-sm sm:text-lg tracking-widest uppercase focus:border-eduGreen-500 focus:ring-eduGreen-500/20 rounded-xl transition-all"
                                                    required
                                                />
                                            </div>
                                            <p className="text-[9px] sm:text-[10px] text-zinc-600 font-medium px-1">
                                                * This unique code was issued by your school administration.
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={() => {
                                                if (formData.studentCode.length < 5) {
                                                    toast.error("Invalid Token Format");
                                                    return;
                                                }
                                                setStep(2);
                                            }}
                                            className="w-full h-12 sm:h-14 bg-white text-black hover:bg-zinc-200 font-medium uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] text-xs sm:text-sm"
                                        >
                                            Verify Token <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4 sm:space-y-6"
                                    >
                                        <div className="space-y-2 sm:space-y-3">
                                            <Label className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-500 ml-1">Email Verification</Label>
                                            <div className="relative group">
                                                <Mail className="absolute left-3.5 sm:left-4 top-3.5 sm:top-4 w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 group-focus-within:text-eduGreen-500 transition-colors" />
                                                <Input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    placeholder="student@school.edu"
                                                    className="pl-10 sm:pl-12 h-12 sm:h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium focus:border-eduGreen-500 focus:ring-eduGreen-500/20 rounded-xl transition-all text-sm sm:text-base"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:gap-4">
                                            <div className="space-y-2 sm:space-y-3">
                                                <Label className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-500 ml-1">Password</Label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-3.5 sm:left-4 top-3.5 sm:top-4 w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 group-focus-within:text-eduGreen-500 transition-colors" />
                                                    <Input
                                                        type="password"
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        placeholder="••••••••"
                                                        className="pl-10 sm:pl-12 h-12 sm:h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium focus:border-eduGreen-500 focus:ring-eduGreen-500/20 rounded-xl transition-all text-sm sm:text-base"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2 sm:space-y-3">
                                                <Label className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-500 ml-1">Confirm Password</Label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-3.5 sm:left-4 top-3.5 sm:top-4 w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 group-focus-within:text-eduGreen-500 transition-colors" />
                                                    <Input
                                                        type="password"
                                                        value={formData.confirmPassword}
                                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                        placeholder="••••••••"
                                                        className="pl-10 sm:pl-12 h-12 sm:h-14 bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium focus:border-eduGreen-500 focus:ring-eduGreen-500/20 rounded-xl transition-all text-sm sm:text-base"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

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

                                        <div className="flex gap-2 sm:gap-3">
                                            <Button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                variant="ghost"
                                                className="h-12 sm:h-14 px-4 sm:px-6 text-zinc-600 dark:text-zinc-500 hover:text-white font-medium uppercase tracking-widest rounded-xl text-xs sm:text-sm"
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={isLoading || !agreedToTerms}
                                                className="flex-1 h-12 sm:h-14 bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-medium uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-eduGreen-900/20 text-xs sm:text-sm"
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    "Activate Account"
                                                )}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </CardContent>

                    <div className="p-4 sm:p-6 border-t border-zinc-200 dark:border-zinc-900/50 bg-white/20 dark:bg-black/20 text-center">
                        <Link href="/login" className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-zinc-600 hover:text-eduGreen-500 transition-colors">
                            Already registered? Log In →
                        </Link>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}

