export const dynamic = 'force-dynamic';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { InviteForm } from "./invite-form"; // Client component
import { ShieldCheck, AlertCircle, Building2, UserCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify token via Supabase REST
    const { data: invite } = await supabaseAdmin
        .from('InviteToken')
        .select('*')
        .eq('token', token)
        .maybeSingle();

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 font-sans selection:bg-red-500/30">
                {/* Background Ambient Glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-red-600/10 rounded-[100%] blur-[120px]" />
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-500/5 rounded-[100%] blur-[100px]" />
                </div>

                <div className="relative z-10 w-full max-w-md">
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-2xl mb-6 backdrop-blur-xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
                            <AlertCircle className="w-8 h-8 text-red-500 relative z-10" />
                        </div>
                        <h1 className="text-3xl font-medium tracking-tight text-white mb-2">Access Denied</h1>
                        <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Token Invalid or Expired</p>
                    </div>

                    <Card className="bg-zinc-950/40 backdrop-blur-2xl border-zinc-900/50 shadow-2xl overflow-hidden rounded-3xl border-t-zinc-800/30">
                        <CardContent className="p-8 text-center space-y-6">
                            <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                                <p className="text-sm text-zinc-400 leading-relaxed">
                                    The secure invitation link you clicked is no longer valid. It may have been used already, or the 7-day expiration window has passed.
                                </p>
                            </div>
                            <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold">
                                Please contact your institutional administrator to provision a new access token.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Fetch school name and existing user name via Supabase REST
    let school: any = null;
    let prefilledName = "";
    if (invite.schoolId) {
        const { data: s } = await supabaseAdmin
            .from('School')
            .select('id, name, logoUrl')
            .eq('id', invite.schoolId)
            .maybeSingle();
        school = s;
    }
    if (invite.email) {
        const { data: u } = await supabaseAdmin
            .from('User')
            .select('name')
            .eq('email', invite.email)
            .maybeSingle();
        if (u?.name) prefilledName = u.name;
    }

    // Format role for display (e.g. PRINCIPAL -> Principal, TEACHER -> Teacher)
    const formattedRole = invite.role.charAt(0) + invite.role.slice(1).toLowerCase();

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 font-sans selection:bg-eduGreen-500/30">
            {/* Background Ambient Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-eduGreen-600/10 rounded-[100%] blur-[150px]" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-[100%] blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/5 rounded-[100%] blur-[120px]" />
                {/* Subtle Grid */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            </div>

            <div className="relative z-10 w-full max-w-lg mt-12 mb-12">
                <div className="mb-10 text-center flex flex-col items-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-zinc-900/80 border border-zinc-800 shadow-2xl mb-8 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-eduGreen-500/20 to-transparent opacity-50" />
                        {school?.logoUrl ? (
                            <img src={school.logoUrl} alt="School Logo" className="w-16 h-16 object-contain relative z-10" />
                        ) : (
                            <ShieldCheck className="w-10 h-10 text-eduGreen-500 relative z-10 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]" />
                        )}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white mb-3">
                        Welcome, {formattedRole === 'Principal' ? 'Director' : formattedRole}
                    </h1>
                    <div className="flex items-center gap-2 text-zinc-400 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800/80 backdrop-blur-md">
                        <Building2 className="w-4 h-4 text-eduGreen-500" />
                        <span className="text-sm font-medium">{school?.name || "New Institution"}</span>
                    </div>
                </div>

                <Card className="bg-zinc-950/40 backdrop-blur-3xl border-zinc-900 shadow-2xl overflow-hidden rounded-[2.5rem] border-t-zinc-800/50 relative">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-eduGreen-500/30 to-transparent" />
                    
                    <CardHeader className="text-center pb-2 pt-10 px-8">
                        <CardTitle className="text-xl font-medium text-white flex items-center justify-center gap-2">
                            <UserCircle2 className="w-5 h-5 text-zinc-500" />
                            Account Provisioning
                        </CardTitle>
                        <CardDescription className="text-zinc-500 text-sm mt-2">
                            Please verify your identity and set a secure password to initialize your institutional access.
                        </CardDescription>
                    </CardHeader>

                    <div className="px-8 pb-10">
                        <InviteForm
                            token={token}
                            email={invite.email}
                            schoolName={school?.name || ""}
                            role={invite.role}
                            prefilledName={prefilledName}
                        />
                    </div>
                </Card>
                
                <div className="mt-8 text-center flex justify-center gap-6 text-[10px] uppercase tracking-widest font-semibold text-zinc-600">
                    <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
                    <Link href="/support" className="hover:text-zinc-400 transition-colors">Support</Link>
                </div>
            </div>
        </div>
    );
}
