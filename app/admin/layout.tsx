import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Shield, LayoutDashboard, Activity, Zap } from "lucide-react";
import { DynamicAIAssistant } from "@/components/dashboard/dynamic-ai-assistant";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Edge-safe user lookup (prisma may be null on Cloudflare Workers)
    const { prisma } = require('@/lib/prisma');
    let dbUser: any = null;

    if (!prisma) {
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: u1 } = await supabaseAdmin
            .from('User')
            .select('id, role, email, name, gender')
            .eq('id', user.id)
            .maybeSingle();
        dbUser = u1;
        if (!dbUser && user.email) {
            const { data: u2 } = await supabaseAdmin
                .from('User')
                .select('id, role, email, name, gender')
                .eq('email', user.email)
                .maybeSingle();
            dbUser = u2;
            if (dbUser) {
                // Heal ID mismatch
                await supabaseAdmin.from('User').update({ id: user.id }).eq('email', user.email);
                dbUser.id = user.id;
            }
        }
    } else {
        dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, role: true, email: true, name: true, gender: true }
        });
        if (!dbUser && user.email) {
            dbUser = await prisma.user.findUnique({
                where: { email: user.email },
                select: { id: true, role: true, email: true, name: true, gender: true }
            });
            if (dbUser) {
                dbUser = await prisma.user.update({
                    where: { email: user.email },
                    data: { id: user.id },
                    select: { id: true, role: true, email: true, name: true, gender: true }
                });
            }
        }
    }

    if (!dbUser || dbUser.role !== 'SUPERADMIN') redirect("/login");

    if (user.user_metadata?.role !== dbUser.role) {
        await supabase.auth.updateUser({ data: { role: dbUser.role } });
    }

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const honorific = dbUser.gender === 'MALE' ? ', Sir' : dbUser.gender === 'FEMALE' ? ", Ma'am" : "";

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-[#080808] flex flex-col font-sans text-zinc-900 dark:text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-eduGreen-500/5 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:64px_64px]" />
            </div>

            {/* Top Nav */}
            <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-[#080808]/80 backdrop-blur-xl flex items-center px-8 gap-6">
                {/* Logo */}
                <div className="flex items-center gap-3 mr-auto">
                    <div className="w-8 h-8 rounded-lg bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-eduGreen-500" />
                    </div>
                    <div>
                        <span className="text-zinc-900 dark:text-white font-black tracking-[0.15em] text-sm font-orbitron">LUCY</span>
                        <span className="text-eduGreen-500 font-black tracking-[0.15em] text-sm font-orbitron"> OS</span>
                    </div>
                    <div className="w-px h-5 bg-zinc-300 dark:bg-white/10 mx-1" />
                    <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-[0.3em]">Admin Engine</span>
                </div>

                {/* Nav Links */}
                <div className="hidden md:block">
                    <AdminNav />
                </div>

                {/* Right */}
                <div className="flex items-center gap-4 ml-auto">
                    {/* Status Indicator */}
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-eduGreen-950/40 border border-eduGreen-900/30">
                        <div className="w-1.5 h-1.5 rounded-full bg-eduGreen-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                        <span className="text-[10px] font-semibold text-eduGreen-500 uppercase tracking-widest">Operational</span>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-white/5">
                        <div className="w-8 h-8 rounded-full bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-eduGreen-500" />
                        </div>
                        <div className="hidden md:block">
                            <div className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest leading-none">
                                {dbUser.name?.split(' ')[0] || 'Admin'}
                            </div>
                            <div className="text-[9px] text-zinc-600 font-medium uppercase tracking-widest mt-0.5">Superadmin</div>
                        </div>
                    </div>

                    <SignOutButton />
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 pt-16">
                {/* Greeting Banner */}
                <div className="border-b border-zinc-200 dark:border-white/5 bg-gradient-to-r from-white dark:from-black/[0.02] dark:from-white/[0.02] to-transparent px-8 py-8">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-medium text-eduGreen-500 uppercase tracking-[0.4em] mb-1">Infrastructure Control</p>
                            <h1 className="text-3xl font-medium tracking-tight text-zinc-900 dark:text-white">
                                {greeting}<span className="text-zinc-600 dark:text-zinc-500">{honorific}</span>
                            </h1>
                        </div>
                        <div className="hidden lg:flex items-center gap-2 text-zinc-700">
                            <Activity className="w-4 h-4" />
                            <span className="text-[11px] font-medium uppercase tracking-widest">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-8 py-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
