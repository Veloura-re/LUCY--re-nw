"use client";


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, CheckCircle2, ArrowLeft, ArrowRight, GraduationCap, School, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type Step = 'CODE' | 'CONFIRM' | 'DETAILS' | 'SUCCESS';
interface StudentDetails {
    firstName: string;
    lastName: string;
    schoolName: string;
    gradeLevel: number;
}

export default function ParentRegister() {
    const [step, setStep] = useState<Step>('CODE');
    const [studentCode, setStudentCode] = useState("");
    const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);

    // Auth State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    // --- Actions ---

    const verifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentCode) return;
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: studentCode })
            });

            const data = await res.json() as { error?: string; student?: StudentDetails };
            if (!res.ok) throw new Error(data.error || "Invalid Code");

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
                    studentCode // Pass code to link immediately
                })
            });

            if (res.ok) {
                setStep('SUCCESS');
                setTimeout(() => router.push('/dashboard'), 2000);
            } else {
                setError("Account created but linking failed. Please try linking from dashboard.");
            }
        }
        setIsLoading(false);
    };

    // --- Renders ---

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white dark:bg-zinc-950 font-sans p-4 text-zinc-900 dark:text-white">
            {/* Ambient Background - Green Theme like Login Page */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-eduGreen-500/15 blur-[100px]" />
                <div className="absolute bottom-[10%] right-[20%] w-[40%] h-[40%] rounded-full bg-eduGreen-600/10 blur-[100px]" />
            </div>

            <Card className="w-full max-w-md relative z-10 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-xl border-zinc-300 dark:border-zinc-800 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300">

                {/* Progress Bar - Green Theme */}
                <div className="absolute top-0 left-0 h-1 bg-zinc-200 dark:bg-zinc-800 w-full">
                    <div
                        className="h-full bg-eduGreen-600 transition-all duration-300 ease-out"
                        style={{ width: step === 'CODE' ? '25%' : step === 'CONFIRM' ? '50%' : step === 'DETAILS' ? '75%' : '100%' }}
                    />
                </div>

                {step !== 'SUCCESS' && (
                    <div className="absolute left-4 sm:left-6 top-4 sm:top-6 z-20">
                        {step === 'CODE' ? (
                            <Link href="/register" className="flex items-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-500 hover:text-white transition-colors">
                                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> Back
                            </Link>
                        ) : (
                            <button onClick={() => setStep(prev => prev === 'DETAILS' ? 'CONFIRM' : 'CODE')} className="flex items-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-500 hover:text-white transition-colors">
                                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> Back
                            </button>
                        )}
                    </div>
                )}

                {/* --- STEP 1: CODE --- */}
                {step === 'CODE' && (
                    <div className="animate-in slide-in-from-right-8 fade-in duration-300">
                        <CardHeader className="space-y-2 items-center text-center pb-2 pt-12 sm:pt-16 px-4 sm:px-6">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-sm border border-zinc-400 dark:border-zinc-700">
                                <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-eduGreen-500" />
                            </div>
                            <CardTitle className="text-xl sm:text-2xl font-medium text-zinc-900 dark:text-white">Find Your Student</CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Enter the Student Access Code provided by your school.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 sm:space-y-6 pb-8 sm:pb-12 px-4 sm:px-6">
                            <form onSubmit={verifyCode}>
                                <Input
                                    placeholder="ST-A1B2C3-2024"
                                    className="text-center text-lg sm:text-2xl tracking-widest uppercase h-12 sm:h-14 font-mono bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-700 focus:border-eduGreen-600"
                                    value={studentCode}
                                    onChange={e => setStudentCode(e.target.value.toUpperCase())}
                                    maxLength={20}
                                    required
                                />
                                {error && <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm text-center mt-2 flex justify-center items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}

                                <Button className="w-full mt-4 sm:mt-6 h-11 sm:h-12 text-sm sm:text-base bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl" type="submit" isLoading={isLoading}>
                                    Verify Code
                                </Button>
                            </form>
                        </CardContent>
                    </div>
                )}

                {/* --- STEP 2: CONFIRM --- */}
                {step === 'CONFIRM' && studentDetails && (
                    <div className="animate-in slide-in-from-right-8 fade-in duration-300">
                        <CardHeader className="text-center pt-12 sm:pt-16 px-4 sm:px-6">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-eduGreen-900/10 rounded-full flex items-center justify-center mb-3 sm:mb-4 text-eduGreen-500 border border-eduGreen-900/20 shadow-2xl">
                                <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" />
                            </div>
                            <CardTitle className="text-xl sm:text-2xl font-medium text-zinc-900 dark:text-white">Confirm Student</CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Confirm the details below to proceed.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 sm:space-y-6 pb-8 sm:pb-12 px-4 sm:px-8">
                            <div className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 rounded-xl p-4 sm:p-6 border border-zinc-300 dark:border-zinc-800 space-y-3 sm:space-y-4">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shadow-sm border border-zinc-400 dark:border-zinc-700"><User className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                    <div>
                                        <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-500 uppercase tracking-wider font-semibold">Student Name</p>
                                        <p className="text-base sm:text-lg font-medium text-zinc-900 dark:text-white">{studentDetails.firstName} {studentDetails.lastName}</p>
                                    </div>
                                </div>
                                <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800" />
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shadow-sm border border-zinc-400 dark:border-zinc-700"><School className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                    <div>
                                        <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-500 uppercase tracking-wider font-semibold">School</p>
                                        <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300">{studentDetails.schoolName}</p>
                                    </div>
                                </div>
                            </div>
                            <Button className="w-full h-11 sm:h-12 text-sm sm:text-base bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl" onClick={() => setStep('DETAILS')}>
                                Yes, That's My Child
                            </Button>
                            <Button variant="ghost" className="w-full text-xs sm:text-sm text-zinc-600 dark:text-zinc-500 hover:text-white hover:bg-zinc-300 dark:hover:bg-zinc-800" onClick={() => setStep('CODE')}>
                                Enter different code
                            </Button>
                        </CardContent>
                    </div>
                )}

                {/* --- STEP 3: DETAILS --- */}
                {step === 'DETAILS' && (
                    <div className="animate-in slide-in-from-right-8 fade-in duration-300">
                        <CardHeader className="text-center pt-12 sm:pt-16 px-4 sm:px-6">
                            <CardTitle className="text-xl sm:text-2xl font-medium text-zinc-900 dark:text-white">Create Parent Account</CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Set up your login credentials to finish.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pb-6 sm:pb-8 px-4 sm:px-6">
                            <div className="space-y-3 sm:space-y-4">
                                <Input label="Your Full Name" value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Doe" className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-600 text-sm sm:text-base" />
                                <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="parent@example.com" className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-600 text-sm sm:text-base" />
                                <Input label="Create Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-600 focus:border-eduGreen-600 text-sm sm:text-base" />
                            </div>

                            {error && <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm text-center">{error}</p>}

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

                            <Button className="w-full h-11 sm:h-12 mt-3 sm:mt-4 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl text-sm sm:text-base" onClick={handleRegister} disabled={isLoading || !agreedToTerms} isLoading={isLoading}>
                                Create Account & Link
                            </Button>
                        </CardContent>
                    </div>
                )}

                {/* --- STEP 4: SUCCESS --- */}
                {step === 'SUCCESS' && (
                    <div className="animate-in zoom-in fade-in duration-300 py-12 sm:py-16 text-center px-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-eduGreen-950/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-eduGreen-900/30">
                            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-eduGreen-500" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-medium text-zinc-900 dark:text-white mb-2">Welcome to LUCY!</h3>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-6 sm:mb-8">Your account has been created and linked.</p>
                        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-eduGreen-500 mx-auto" />
                    </div>
                )}

            </Card>

            {step === 'CODE' && (
                <div className="absolute bottom-4 sm:bottom-6 text-center text-[10px] sm:text-xs text-zinc-600 w-full animate-in fade-in px-4">
                    Need a code? Access codes are provided by your school administrator.
                </div>
            )}

        </div>
    );
}

