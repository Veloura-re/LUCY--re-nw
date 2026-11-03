"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, CheckCircle2, ArrowLeft, School, Loader2, AlertCircle, ShieldCheck, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InteractiveParticleSimulation } from "@/components/public/animations";
import posthog from "posthog-js";

// Types
type Step = 'CODE' | 'CONFIRM' | 'DETAILS' | 'SUCCESS';
interface StudentDetails {
    id: string;
    firstName: string;
    lastName: string;
    schoolName: string;
    gradeLevel: number;
    gradeName?: string;
}

interface RecoveryDetails {
    message?: string;
    help?: string;
    format?: string;
}

function formatStudentCodeInput(val: string): string {
    const raw = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (raw.length <= 2) return raw;
    if (raw.startsWith('ST')) {
        const rest = raw.slice(2);
        if (rest.length <= 8) {
            return `ST-${rest}`;
        }
        return `ST-${rest.slice(0, 8)}-${rest.slice(8, 12)}`;
    }
    if (raw.length <= 8) {
        return `ST-${raw}`;
    }
    return `ST-${raw.slice(0, 8)}-${raw.slice(8, 12)}`;
}

export default function ParentRegister() {
    const [step, setStep] = useState<Step>('CODE');
    const [studentCode, setStudentCode] = useState("");
    const [dob, setDob] = useState("");
    const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);

    // Auth State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recovery, setRecovery] = useState<RecoveryDetails | null>(null);

    const router = useRouter();
    const supabase = createClient();

    // --- Actions ---

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatStudentCodeInput(e.target.value);
        setStudentCode(formatted);
        if (error) {
            setError(null);
            setRecovery(null);
        }
    };

    const verifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentCode) return;
        setIsLoading(true);
        setError(null);
        setRecovery(null);

        try {
            const res = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: studentCode, dob })
            });

            const data = await res.json() as { error?: string; student?: StudentDetails; recovery?: RecoveryDetails };
            if (!res.ok) {
                if (data.recovery) setRecovery(data.recovery);
                throw new Error(data.error || "Invalid Access Code");
            }

            setStudentDetails(data.student || null);
            setStep('CONFIRM');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        let authUser = null;
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name, role: 'PARENT' }
            }
        });

        if (authError) {
            if (authError.message.toLowerCase().includes("already registered")) {
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (signInError) {
                    setError("Email already registered. Please use correct password.");
                    setIsLoading(false);
                    return;
                }
                authUser = signInData.user;
            } else {
                setError(authError.message);
                setIsLoading(false);
                return;
            }
        } else {
            authUser = authData.user;
        }

        if (authUser) {
            const res = await fetch('/api/auth/register-parent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: authUser.id,
                    email,
                    name,
                    studentCode, // Pass code to link immediately
                    dob,
                    acceptedTerms: agreedToTerms
                })
            });

            if (res.ok) {
                posthog.capture('account_registered', { account_role: 'parent' });
                setStep('SUCCESS');
                setTimeout(() => router.push('/logout?reason=registered'), 2000);
            } else {
                const errData = (await res.json().catch(() => ({}))) as { error?: string };
                setError(errData.error || "Account created but linking failed. Please try linking from your parent dashboard.");
            }
        }
        setIsLoading(false);
    };

    const isCodeComplete = /^ST-[A-Z0-9]{8}-[0-9]{4}$/.test(studentCode) || studentCode.length >= 10;

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white dark:bg-zinc-950 font-sans p-3 sm:p-4 text-zinc-900 dark:text-white">
            <InteractiveParticleSimulation count={115} interactive={true} burstOnLoad={true} fullScreen={true} connectionDistance={145} showTriangles={true} />

            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-eduGreen-500/15 blur-[100px]" />
                <div className="absolute bottom-[10%] right-[20%] w-[40%] h-[40%] rounded-full bg-eduGreen-600/10 blur-[100px]" />
            </div>

            <Card className="w-full max-w-md relative z-10 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-xl border-zinc-300 dark:border-zinc-800 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300">

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 h-1 bg-zinc-200 dark:bg-zinc-800 w-full">
                    <div
                        className="h-full bg-eduGreen-600 transition-all duration-300 ease-out"
                        style={{ width: step === 'CODE' ? '25%' : step === 'CONFIRM' ? '50%' : step === 'DETAILS' ? '75%' : '100%' }}
                    />
                </div>

                {step !== 'SUCCESS' && (
                    <div className="absolute left-3 sm:left-6 top-3 sm:top-6 z-20">
                        {step === 'CODE' ? (
                            <Link href="/register" className="flex items-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> Back
                            </Link>
                        ) : (
                            <button onClick={() => setStep(prev => prev === 'DETAILS' ? 'CONFIRM' : 'CODE')} className="flex items-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> Back
                            </button>
                        )}
                    </div>
                )}

                {/* --- STEP 1: CODE --- */}
                {step === 'CODE' && (
                    <div className="animate-in slide-in-from-right-8 fade-in duration-300">
                        <CardHeader className="space-y-1.5 items-center text-center pb-2 pt-10 sm:pt-14 px-4 sm:px-6">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-zinc-200 dark:bg-zinc-800 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 shadow-sm border border-zinc-400 dark:border-zinc-700">
                                <ShieldCheck className="w-5 h-5 sm:w-7 sm:h-7 text-eduGreen-500" />
                            </div>
                            <CardTitle className="text-lg sm:text-2xl font-medium text-zinc-900 dark:text-white">Find Your Student</CardTitle>
                            <CardDescription className="text-xs text-zinc-600 dark:text-zinc-400">Enter the Student Access Code provided by your school administration.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pb-6 sm:pb-10 px-4 sm:px-6">
                            <form onSubmit={verifyCode}>
                                <div className="relative">
                                    <Input
                                        placeholder="ST-A1B2C3D4-2026"
                                        className={cn(
                                            "text-center text-base sm:text-2xl tracking-widest uppercase h-11 sm:h-14 font-mono bg-zinc-200 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-600 transition-all",
                                            isCodeComplete && "border-eduGreen-500/60"
                                        )}
                                        value={studentCode}
                                        onChange={handleCodeChange}
                                        maxLength={20}
                                        required
                                    />
                                    {isCodeComplete && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-eduGreen-500">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                                <label className="block mt-3 text-left text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                                    Student date of birth
                                    <Input
                                        type="date"
                                        className="mt-1 h-11 bg-zinc-200 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                        required
                                    />
                                </label>

                                {error && (
                                    <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1 text-left">
                                        <p className="text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-1.5">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            {error}
                                        </p>
                                        {recovery?.message && (
                                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pl-5">
                                                {recovery.message}
                                            </p>
                                        )}
                                        {recovery?.format && (
                                            <p className="text-[10px] text-zinc-500 font-mono pl-5">
                                                {recovery.format}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <Button 
                                    className="w-full mt-4 sm:mt-6 h-10 sm:h-12 text-xs sm:text-sm bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-medium tracking-wide uppercase shadow-lg shadow-eduGreen-900/20" 
                                    type="submit" 
                                    isLoading={isLoading}
                                >
                                    Verify Code
                                </Button>
                            </form>

                            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>Code is printed on the official registration sheet</span>
                            </div>
                        </CardContent>
                    </div>
                )}

                {/* --- STEP 2: CONFIRM --- */}
                {step === 'CONFIRM' && studentDetails && (
                    <div className="animate-in slide-in-from-right-8 fade-in duration-300">
                        <CardHeader className="text-center pt-10 sm:pt-14 px-4 sm:px-6">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 mx-auto bg-eduGreen-900/10 rounded-full flex items-center justify-center mb-2 sm:mb-3 text-eduGreen-500 border border-eduGreen-900/20 shadow-2xl">
                                <CheckCircle2 className="w-5 h-5 sm:w-7 sm:h-7" />
                            </div>
                            <CardTitle className="text-lg sm:text-2xl font-medium text-zinc-900 dark:text-white">Confirm Student</CardTitle>
                            <CardDescription className="text-xs text-zinc-600 dark:text-zinc-400">Confirm the details below to proceed.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pb-6 sm:pb-10 px-4 sm:px-8">
                            <div className="bg-zinc-200 dark:bg-zinc-950/50 rounded-xl p-4 sm:p-5 border border-zinc-300 dark:border-zinc-800 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shadow-sm border border-zinc-400 dark:border-zinc-700">
                                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] sm:text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-wider font-semibold">Student Name</p>
                                        <p className="text-sm sm:text-base font-medium text-zinc-900 dark:text-white">{studentDetails.firstName} {studentDetails.lastName}</p>
                                    </div>
                                </div>
                                <div className="w-full h-px bg-zinc-300 dark:bg-zinc-800" />
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shadow-sm border border-zinc-400 dark:border-zinc-700">
                                        <School className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] sm:text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-wider font-semibold">School & Placement</p>
                                        <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">{studentDetails.schoolName} {studentDetails.gradeName ? `• ${studentDetails.gradeName}` : `• Grade ${studentDetails.gradeLevel}`}</p>
                                    </div>
                                </div>
                            </div>
                            <Button className="w-full h-10 sm:h-12 text-xs sm:text-sm bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-medium uppercase tracking-wide" onClick={() => setStep('DETAILS')}>
                                Yes, That's My Child
                            </Button>
                            <Button variant="ghost" className="w-full text-xs text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300 dark:hover:bg-zinc-800" onClick={() => setStep('CODE')}>
                                Enter different code
                            </Button>
                        </CardContent>
                    </div>
                )}

                {/* --- STEP 3: DETAILS --- */}
                {step === 'DETAILS' && (
                    <div className="animate-in slide-in-from-right-8 fade-in duration-300">
                        <CardHeader className="text-center pt-10 sm:pt-14 px-4 sm:px-6">
                            <CardTitle className="text-lg sm:text-2xl font-medium text-zinc-900 dark:text-white">Create Parent Account</CardTitle>
                            <CardDescription className="text-xs text-zinc-600 dark:text-zinc-400">Set up your credentials to access the family portal.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3.5 pb-6 sm:pb-8 px-4 sm:px-6">
                            <div className="space-y-2.5 sm:space-y-3">
                                <Input label="Your Full Name" value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Doe" className="bg-zinc-200 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-600 text-xs sm:text-sm h-10 sm:h-12" />
                                <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="parent@example.com" className="bg-zinc-200 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-600 text-xs sm:text-sm h-10 sm:h-12" />
                                <Input label="Create Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="bg-zinc-200 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-600 text-xs sm:text-sm h-10 sm:h-12" />
                            </div>

                            {error && <p className="text-rose-600 dark:text-rose-400 text-xs text-center">{error}</p>}

                            <div className="flex items-start space-x-2.5 pt-1">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-eduGreen-600 accent-eduGreen-500 checked:bg-eduGreen-600 focus:ring-eduGreen-500 cursor-pointer transition-all"
                                />
                                <label htmlFor="terms" className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-tight cursor-pointer select-none">
                                    I agree to the <Link href="/terms" target="_blank" className="text-eduGreen-500 hover:underline font-semibold">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-eduGreen-500 hover:underline font-semibold">Privacy Policy</Link>.
                                </label>
                            </div>

                            <Button className="w-full h-10 sm:h-12 mt-2 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl text-xs sm:text-sm font-medium uppercase tracking-wide" onClick={handleRegister} disabled={isLoading || !agreedToTerms} isLoading={isLoading}>
                                Create Account & Link
                            </Button>
                        </CardContent>
                    </div>
                )}

                {/* --- STEP 4: SUCCESS --- */}
                {step === 'SUCCESS' && (
                    <div className="animate-in zoom-in fade-in duration-300 py-10 sm:py-14 text-center px-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-eduGreen-950/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 border border-eduGreen-900/30">
                            <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-eduGreen-500" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-medium text-zinc-900 dark:text-white mb-1.5">Welcome to LUCY!</h3>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 sm:mb-6">Your family account is active and synchronized.</p>
                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-eduGreen-500 mx-auto" />
                    </div>
                )}

            </Card>

            {step === 'CODE' && (
                <div className="absolute bottom-3 sm:bottom-5 text-center text-[10px] text-zinc-500 w-full animate-in fade-in px-4">
                    Need a code? Access codes are provided by your school registrar or administrative staff.
                </div>
            )}

        </div>
    );
}
