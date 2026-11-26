import { LEGAL_VERSION } from "@/lib/legal-versions";
import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCachedUser, getCachedUserByEmail } from "@/lib/users";
import { healUserMismatch } from "@/lib/auth-healing";
import { getDeviceSessionState } from "@/lib/device-session";
import { Shield, LayoutDashboard, BookOpen } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NAV_ITEMS, Role as NavRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { FloatingDock } from "@/components/dashboard/floating-dock";
import { InteractiveTour, NetworkBanner, SmartTutorialWrapper } from "@/app/dashboard/dynamic-components";
import { PreferencesProvider } from "@/components/dashboard/preferences-provider";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";
import { EdgeHealthIndicator } from "@/components/dashboard/edge-health-indicator";
import { Logo } from "@/components/ui/logo";
import { SchoolLogo } from "@/components/ui/school-logo";
import { WelcomeAnnouncement } from "@/components/dashboard/welcome-announcement";
import { PresenceBroadcaster } from "@/components/dashboard/presence-broadcaster";
import { StudentQRScannerModal } from "@/components/dashboard/student-qr-scanner-modal";
import { ScannerTriggerButton } from "@/components/dashboard/scanner-trigger-button";
import Image from "next/image";

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
    },
};

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

    // The Supabase session alone is not a sign-in: the device session is issued only after the full
    // sign-in (password plus code or trusted device, or Google). A newer sign-in elsewhere supersedes it.
    // Check by Supabase auth ID first; we also try the Prisma user ID below once dbUser is known,
    // because Google OAuth email-matched accounts store the device session under the Prisma record ID.
    const deviceStateByAuthId = await getDeviceSessionState(user.id);

    // Fetch full user profile with deduplication
    let dbUser = await getCachedUser(user.id);

    // Auto-Heal Mismatch Logic for non-SUPERADMIN roles: migrate invited placeholder record.
    if (!dbUser && user.email) {
        const candidate = await getCachedUserByEmail(user.email);

        // Only migrate an invited placeholder record to this account when the Supabase email is
        // confirmed. SUPERADMIN records are never migrated by email. A record that is not migrated
        // must not be used as this session's profile.
        if (candidate && user.email_confirmed_at && candidate.role !== 'SUPERADMIN') {
            try {
                // Perform healing in the background (within the request) but wait for it to ensure profile is ready
                const healed = await healUserMismatch(candidate.id, user.id, user.email);
                dbUser = { ...healed, school: candidate.school };
            } catch (err) {
                console.error("[Dashboard Layout] Healing failed:", err);
            }
        } else if (candidate && candidate.role === 'SUPERADMIN' && user.email_confirmed_at) {
            // SUPERADMIN is never healed (ID rewrite would break the admin portal) but the profile
            // is still usable for session validation and dashboard rendering.
            dbUser = candidate;
        }
    }

    // Re-validate the device session using the Prisma record ID when the Supabase auth ID check
    // did not find a valid session. This covers Google OAuth email-matched accounts where the
    // callback stored the device session under existing.id (the Prisma UUID), not user.id.
    let deviceState = deviceStateByAuthId;
    if (deviceState !== 'valid' && dbUser && dbUser.id !== user.id) {
        deviceState = await getDeviceSessionState(dbUser.id);
    }
    if (deviceState !== 'valid') {
        redirect(deviceState === 'superseded' ? "/logout?reason=concurrent" : "/logout?reason=session");
    }

    if (!dbUser) {
        // Handle database connection interruptions or missing profiles
        return (
            <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mb-6">
                    <Shield className="w-10 h-10 text-red-600 dark:text-red-500" />
                </div>
                <h1 className="text-2xl font-medium text-zinc-900 dark:text-white mb-2 uppercase tracking-tighter">Connection Bad</h1>
                <p className="text-zinc-600 dark:text-zinc-500 max-w-md mb-8 font-medium uppercase tracking-widest text-[10px]">
                    The database connection is bad or your profile was not found.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <a href="/dashboard" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-eduGreen-600 text-white text-[10px] font-medium uppercase tracking-widest">↻ Retry</a>
                    <form action="/auth/signout" method="post">
                        <button type="submit" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-red-900/40 hover:text-red-600 dark:text-red-400 text-[10px] font-medium uppercase tracking-widest transition-colors gap-2 w-full sm:w-auto h-full">
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

    // Everyone must have accepted the current Terms and Privacy Policy. Registration and login record
    // it; this catches sessions that predate the record or follow a new LEGAL_VERSION.
    // SUPERADMIN is exempt — the platform operator cannot be locked out by a legal version bump.
    if (dbUser.role !== 'SUPERADMIN' && dbUser.legalVersionAccepted !== LEGAL_VERSION) {
        redirect("/accept-terms");
    }

    // Enforce School Suspension
    if (dbUser.role !== 'SUPERADMIN' && dbUser.school?.status === 'SUSPENDED') {
        redirect("/school-suspended");
    }

    // Enforce School Subscription / Trial
    if (dbUser.role !== 'SUPERADMIN' && dbUser.school) {
        const now = new Date();
        const createdAt = new Date(dbUser.school.createdAt);
        
        // Default trial is 4 months (120 days) from school creation
        const trialEndsAt = dbUser.school.trialEndsAt 
            ? new Date(dbUser.school.trialEndsAt)
            : new Date(createdAt.getTime() + 120 * 24 * 60 * 60 * 1000);

        const isLicenseExpired = now > trialEndsAt;

        if (isLicenseExpired) {
            const headersList = await headers();
            const pathname = headersList.get("x-pathname") || "";

            const isBillingPage = pathname === '/dashboard/billing';
            const isLogout = pathname === '/logout' || pathname === '/auth/signout';

            if (!isBillingPage && !isLogout) {
                if (dbUser.role === 'OWNER' || dbUser.role === 'PRINCIPAL') {
                    redirect('/dashboard/billing');
                } else {
                    redirect('/school-suspended?reason=license_expired');
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
        "min-h-screen bg-white dark:bg-zinc-950 flex font-sans text-zinc-900 dark:text-white relative",
            isSidebar ? "flex-col md:flex-row overflow-hidden h-screen" : "flex-col"
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
                <header className="w-full pt-3 sm:pt-4 md:pt-10 pb-2 md:pb-4 flex items-center justify-between px-3 sm:px-6 md:px-8 lg:px-12 relative z-20">
                    <div className="hidden lg:block w-20 xl:w-32 shrink-0" /> {/* Spacer */}
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <SchoolLogo logoUrl={dbUser.school?.logoUrl} className="w-8 h-8 sm:w-12 sm:h-12 object-contain rounded-lg sm:rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 p-1 shrink-0" fallbackSize="w-8 h-8 sm:w-12 sm:h-12" />
                        <div className="relative flex items-center bg-zinc-100 dark:bg-zinc-950/50 backdrop-blur-md border-r-2 border-eduGreen-500 pr-2 sm:pr-4 md:pr-5 pl-1 py-1 md:py-2 overflow-hidden group max-w-[150px] xs:max-w-[200px] sm:max-w-[320px] md:max-w-[420px] lg:max-w-none rounded-l-lg sm:rounded-l-xl">
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(20,122,82,0.1)_2px,rgba(20,122,82,0.1)_4px)] opacity-0 group-hover:opacity-100 transition-opacity mix-blend-screen" />
                            <span className="text-eduGreen-500 font-orbitron font-black text-base sm:text-xl md:text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity shrink-0">[</span>
                            <span className="relative text-sm sm:text-lg md:text-2xl lg:text-3xl font-black tracking-[0.10em] sm:tracking-[0.15em] md:tracking-[0.25em] font-orbitron text-zinc-900 dark:text-white ml-1 sm:ml-2 md:ml-3 truncate">
                                {dbUser.school?.name?.toUpperCase() || "LUCY"}
                            </span>
                            <span className="text-eduGreen-500 font-orbitron font-black text-base sm:text-xl md:text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity ml-1 sm:ml-2 md:ml-3 shrink-0">]</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                        {['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'OWNER', 'SUPERADMIN'].includes(dbUser.role) && (
                            <ScannerTriggerButton variant="header" />
                        )}
                        <a
                            href={`/guidelines?role=${role}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 hover:bg-eduGreen-50 dark:hover:bg-eduGreen-950/20 text-zinc-600 dark:text-zinc-400 hover:text-eduGreen-600 dark:hover:text-eduGreen-400 text-[10px] font-bold tracking-wider uppercase transition-colors"
                            title="Role Guidelines & Operating Manual"
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Guide</span>
                        </a>
                        <EdgeHealthIndicator />
                    </div>
                </header>
            )}


            {/* Main Content Area */}
            <main className={cn(
                "flex-1 w-full relative z-10",
                isSidebar
                    ? "overflow-y-auto scrollbar-hide p-4 pt-20 md:pt-8 md:p-8"
                    : "overflow-y-auto scrollbar-hide max-w-5xl mx-auto px-4 md:px-8 pb-40"
            )}>
                {children}
            </main>

            {/* Primary Navigation Hub (Appears in DOCK mode) */}
            {!isSidebar && <FloatingDock role={role} userEmail={dbUser.email} userName={dbUser.name} />}
            <InteractiveTour role={role} />
            <SmartTutorialWrapper role={role} />
            <PreferencesProvider children={null} />
            <NetworkBanner />
            <WelcomeAnnouncement />
            <PresenceBroadcaster user={{ id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role, schoolId: dbUser.schoolId }} />
            {['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'OWNER', 'SUPERADMIN'].includes(dbUser.role) && (
                <StudentQRScannerModal />
            )}
        </div>
    );
}
