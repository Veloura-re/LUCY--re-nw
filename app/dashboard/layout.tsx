import { createClient } from "@/utils/supabase/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCachedUser, getCachedUserByEmail } from "@/lib/users";
import { healUserMismatch } from "@/lib/auth-healing";
import { Shield, LayoutDashboard } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NAV_ITEMS, Role as NavRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { FloatingDock } from "@/components/dashboard/floating-dock";
import { DynamicAIAssistant } from "@/components/dashboard/dynamic-ai-assistant";
import { InteractiveTour } from "@/components/dashboard/interactive-tour";
import { NetworkBanner } from "@/components/ui/network-banner";
import { PreferencesProvider } from "@/components/dashboard/preferences-provider";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";
import { EdgeHealthIndicator } from "@/components/dashboard/edge-health-indicator";
import { Logo } from "@/components/ui/logo";
import { WelcomeAnnouncement } from "@/components/dashboard/welcome-announcement";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch full user profile with deduplication
    let dbUser = await getCachedUser(user.id);

    // Auto-Heal Mismatch Logic
    if (!dbUser && user.email) {
        dbUser = await getCachedUserByEmail(user.email);
        
        if (dbUser) {
            try {
                // Perform healing in the background (within the request) but wait for it to ensure profile is ready
                const healed = await healUserMismatch(dbUser.id, user.id, user.email);
                dbUser = { ...healed, school: dbUser.school };
            } catch (err) {
                console.error("[Dashboard Layout] Healing failed:", err);
            }
        }
    }

    // Concurrent Session Enforcement
    if (dbUser) {
        const deviceSession = cookieStore.get('lucy_device_session')?.value;
        if (dbUser.activeSessionId && dbUser.activeSessionId !== deviceSession) {
            redirect("/logout?reason=concurrent");
        }
    }
    if (!dbUser) {
        // Handle database uplink interruptions or missing profiles
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-red-950/20 flex items-center justify-center mb-6">
                    <Shield className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-medium text-white mb-2 uppercase tracking-tighter">Connection Bad</h1>
                <p className="text-zinc-500 max-w-md mb-8 font-medium uppercase tracking-widest text-[10px]">
                    The database connection is bad or your profile was not found.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <a href="/dashboard" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-eduGreen-600 text-white text-[10px] font-medium uppercase tracking-widest">↻ Retry</a>
                    <form action="/auth/signout" method="post">
                        <button type="submit" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-zinc-900 text-white hover:bg-red-900/40 hover:text-red-400 text-[10px] font-medium uppercase tracking-widest transition-colors gap-2 w-full sm:w-auto h-full">
                            <Shield className="w-3 h-3" />
                            Sign Out
                        </button>
                    </form>
                </div>
            </div>
        );
    }


    if (!dbUser) {
        redirect("/login?error=profile_not_found");
    }

    // Enforce School Suspension
    if (dbUser.role !== 'SUPERADMIN' && dbUser.school?.status === 'SUSPENDED') {
        redirect("/school-suspended");
    }

    // Enforce School Subscription / Trial
    if (dbUser.role !== 'SUPERADMIN' && dbUser.school) {
        const now = new Date();
        const createdAt = new Date(dbUser.school.createdAt);
        
        // Default trial is 2 months (60 days) from school creation
        const trialEndsAt = dbUser.school.trialEndsAt 
            ? new Date(dbUser.school.trialEndsAt)
            : new Date(createdAt.getTime() + 60 * 24 * 60 * 60 * 1000);

        const isTrialExpired = now > trialEndsAt;
        const isSubscribed = dbUser.school.subscriptionStatus === 'active';

        if (isTrialExpired && !isSubscribed) {
            const headersList = await headers();
            const pathname = headersList.get("x-pathname") || "";

            const isBillingPage = pathname === '/dashboard/billing';
            const isLogout = pathname === '/logout' || pathname === '/auth/signout';

            if (!isBillingPage && !isLogout) {
                if (dbUser.role === 'OWNER' || dbUser.role === 'PRINCIPAL') {
                    redirect('/dashboard/billing');
                } else {
                    redirect('/school-suspended?reason=trial_expired');
                }
            }
        }
    }

    const role = dbUser.role;

    const menu = NAV_ITEMS[role as NavRole] || [{ icon: 'LayoutDashboard' as any, label: "Overview", href: "/dashboard" }];

    // Determine navigation preference (Default to DOCK if not set)
    const savedPref = (dbUser.preferences as any)?.nav_pref;
    const cookiePref = cookieStore.get("nav_pref")?.value;
    const navPref = cookiePref || savedPref || "DOCK";
    const isSidebar = navPref === "SIDEBAR";

    return (
        <div className={cn(
            "h-screen bg-zinc-950 flex font-sans text-white relative overflow-hidden",
            isSidebar ? "flex-col md:flex-row" : "flex-col"
        )}>
            <RealtimeRefresh schoolId={dbUser.schoolId} />

            {/* Immersive Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-eduGreen-500/10 blur-[140px] animate-pulse duration-[10s]" />
                <div className="absolute top-[20%] -right-[15%] w-[70%] h-[70%] rounded-full bg-eduGreen-600/10 blur-[120px] animate-pulse duration-[8s]" />
                <div className="absolute bottom-[-10%] left-[30%] w-[40%] h-[40%] rounded-full bg-eduGreen-600/10 blur-[100px]" />

                {/* Subtle Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            </div>

            {/* Navigation Overlay/Sidebar */}
            {isSidebar && <DashboardSidebar dbUser={JSON.parse(JSON.stringify(dbUser))} menu={menu} />}

            {/* Header (Appears in DOCK mode on desktop) */}
            {!isSidebar && (
                <header className="w-full pt-4 md:pt-10 pb-2 md:pb-4 flex items-center justify-between px-6 md:px-12 relative z-20">
                    <div className="hidden md:block w-32" /> {/* Spacer */}
                    <div className="flex items-center gap-4">
                        {dbUser.school?.logoUrl ? (
                            <img src={dbUser.school.logoUrl} alt="School Logo" className="w-12 h-12 object-contain rounded-xl bg-zinc-900/50 p-1" />
                        ) : (
                            <Logo className="w-12 h-12" />
                        )}
                        <div className="relative flex items-center bg-zinc-950/50 backdrop-blur-md border-r-2 border-eduGreen-500 pr-5 pl-1 py-1 md:py-2 overflow-hidden group w-max rounded-l-xl">
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(20,122,82,0.1)_2px,rgba(20,122,82,0.1)_4px)] opacity-0 group-hover:opacity-100 transition-opacity mix-blend-screen" />
                            <span className="text-eduGreen-500 font-orbitron font-black text-xl md:text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">[</span>
                            <span className="relative text-xl md:text-3xl font-black tracking-[0.15em] md:tracking-[0.25em] font-orbitron text-white ml-2 md:ml-3">
                                LUCY
                                <span className="absolute -top-1 -right-2 text-[8px] md:text-[10px] text-eduGreen-500 tracking-tighter">OS</span>
                            </span>
                            <span className="text-eduGreen-500 font-orbitron font-black text-xl md:text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity ml-2 md:ml-3">]</span>
                        </div>
                    </div>
                    <EdgeHealthIndicator />
                </header>
            )}


            {/* Main Content Area */}
            <main className={cn(
                "flex-1 w-full relative z-10 overflow-y-auto scrollbar-hide",
                isSidebar ? "p-4 pt-20 md:pt-8 md:p-8" : "max-w-5xl mx-auto px-4 md:px-8 pb-40"
            )}>
                {children}
            </main>

            {/* Primary Navigation Hub (Appears in DOCK mode) */}
            {!isSidebar && <FloatingDock role={role} userEmail={dbUser.email} userName={dbUser.name} />}
            <InteractiveTour role={role} />
            <PreferencesProvider children={null} />
            <NetworkBanner />
            <WelcomeAnnouncement />
        </div>
    );
}
