import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import {
    Shield,
    LayoutGrid,
    LayoutDashboard,
    Users,
    GraduationCap,
    BookOpen,
    Plus,
    Calendar,
    BarChart3,
    CreditCard,
    MessageSquare,
    Settings,
    LogOut,
    User
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { FloatingDock } from "@/components/dashboard/floating-dock";
import { NavToggle } from "@/components/dashboard/nav-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PreferencesProvider } from "@/components/dashboard/preferences-provider";
import { NAV_ITEMS, Role as NavRole } from "@/lib/navigation";
import { DynamicAIAssistant } from "@/components/dashboard/dynamic-ai-assistant";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { NeuralTutorialWrapper } from "@/components/dashboard/neural-tutorial-wrapper";
import { NetworkBanner } from "@/components/ui/network-banner";

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

    // Helper: retry a promise-returning fn up to `maxAttempts` times
    async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, delayMs = 1000): Promise<T> {
        let lastError: any;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (err) {
                lastError = err;
                if (attempt < maxAttempts) {
                    console.warn(`[Layout] DB attempt ${attempt} failed, retrying in ${delayMs}ms...`);
                    await new Promise(r => setTimeout(r, delayMs));
                }
            }
        }
        throw lastError;
    }

    // Fetch full user profile with role
    let dbUser: any = null;
    try {
        dbUser = await withRetry(() => prisma.user.findUnique({
            where: { id: user.id },
            include: { school: true }
        }));

        // Fallback to email search if ID mismatch occurs (common after DB resets or direct sign-ins)
        if (!dbUser && user.email) {
            dbUser = await withRetry(() => prisma.user.findUnique({
                where: { email: user.email },
                include: { school: true }
            }));

            if (dbUser) {
                console.warn(`[Layout] ID mismatch for ${user.email}. Supabase: ${user.id}, Prisma: ${dbUser.id}.`);

                // --- AUTO HEAL MISMATCH ---
                try {
                    const placeholderId = dbUser.id;
                    const userId = user.id;

                    const healedUser = await prisma.$transaction(async (tx) => {
                        // 1. Teacher/Staff related
                        await tx.teacherAssignment.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
                        await tx.timetable.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
                        await tx.class.updateMany({ where: { homeroomTeacherId: placeholderId }, data: { homeroomTeacherId: userId } });
                        await tx.marklistConfig.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });

                        // 2. Content & Grading
                        await tx.exam.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
                        await tx.exam.updateMany({ where: { lockedById: placeholderId }, data: { lockedById: userId } });
                        await tx.lesson.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
                        await tx.gradeRecord.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
                        await tx.attendanceRecord.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
                        await tx.attendanceRecord.updateMany({ where: { lockedById: placeholderId }, data: { lockedById: userId } });

                        // 3. Communications
                        await tx.message.updateMany({ where: { fromUserId: placeholderId }, data: { fromUserId: userId } });
                        await tx.message.updateMany({ where: { toUserId: placeholderId }, data: { toUserId: userId } });
                        await tx.chatRoomMember.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });

                        // 4. Notes & Remarks
                        await tx.studentRemark.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
                        await tx.internalNote.updateMany({ where: { authorId: placeholderId }, data: { authorId: userId } });

                        // 5. System & Assets
                        await tx.auditLog.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });
                        await tx.bookRequest.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });
                        await tx.certificate.updateMany({ where: { issuedById: placeholderId }, data: { issuedById: userId } });
                        await tx.resourceProgress.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });

                        // 6. Parent/Student relations
                        try {
                            await (tx as any).absenceAuthorization.updateMany({ where: { parentId: placeholderId }, data: { parentId: userId } });
                            await (tx as any).parentStudentLink.updateMany({ where: { parentId: placeholderId }, data: { parentId: userId } });
                            await (tx as any).student.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });
                            await (tx as any).event.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
                        } catch (e) {
                            console.warn("Minor relation migration skipped:", e);
                        }

                        // Delete the placeholder user
                        await tx.user.delete({
                            where: { id: placeholderId }
                        });

                        // Create the properly migrated user
                        const newUser = await tx.user.create({
                            data: {
                                id: userId,
                                email: dbUser.email,
                                name: dbUser.name,
                                role: dbUser.role,
                                verified: true, // Auto-verify them since they proved ownership of the email via auth
                                schoolId: dbUser.schoolId,
                                teacherCode: dbUser.teacherCode,
                                gender: dbUser.gender,
                                phone: dbUser.phone,
                                qualification: dbUser.qualification,
                                photoUrl: dbUser.photoUrl
                            }
                        });

                        // Burn any pending invite tokens
                        await tx.inviteToken.updateMany({
                            where: { email: dbUser.email, usedAt: null },
                            data: { usedAt: new Date() }
                        });

                        return newUser;
                    }, {
                        maxWait: 10000, // 10s wait for a connection
                        timeout: 60000  // 60s for the transaction to complete
                    });

                    dbUser = { ...healedUser, school: dbUser.school };
                    console.log(`[Layout] Successfully healed ID mismatch for ${user.email}`);
                } catch (healError) {
                    console.error("[Layout] Auto-heal failed:", healError);
                }
                // --- END AUTO HEAL ---
            }
        }
    } catch (dbError) {
        console.error("[Dashboard Layout] Prisma Connection Error:", dbError);
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-red-950/20 flex items-center justify-center mb-6">
                    <Shield className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-medium text-white mb-2 uppercase tracking-tighter">Secure Link Failure</h1>
                <p className="text-zinc-500 max-w-md mb-8 font-medium uppercase tracking-widest text-[10px]">
                    The encrypted uplink to the institutional database has been interrupted.
                </p>
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 font-mono text-[10px] text-zinc-400 mb-8">
                    ERR_DB_UPLINK_TIMEOUT
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <a
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white text-[10px] font-medium uppercase tracking-widest transition-all"
                    >
                        ↻ Retry Connection
                    </a>
                    <SignOutButton />
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

    const role = dbUser.role;

    const menu = NAV_ITEMS[role as NavRole] || [{ icon: LayoutDashboard, label: "Overview", href: "/dashboard" }];

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
            {/* Immersive Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-eduGreen-500/10 blur-[140px] animate-pulse duration-[10s]" />
                <div className="absolute top-[20%] -right-[15%] w-[70%] h-[70%] rounded-full bg-eduGreen-600/10 blur-[120px] animate-pulse duration-[8s]" />
                <div className="absolute bottom-[-10%] left-[30%] w-[40%] h-[40%] rounded-full bg-eduGreen-600/10 blur-[100px]" />

                {/* Subtle Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            </div>

            {/* Navigation Overlay/Sidebar */}
            {isSidebar && <DashboardSidebar dbUser={dbUser} menu={menu} />}

            {/* Header (Appears in DOCK mode on desktop) */}
            {!isSidebar && (
                <header className="w-full pt-4 md:pt-10 pb-2 md:pb-4 flex justify-end md:justify-center px-6 md:px-0 relative z-20">
                    <div className="relative flex items-center bg-zinc-950/50 backdrop-blur-md border-r-2 border-eduGreen-500 pr-5 pl-1 py-1 md:py-2 overflow-hidden group w-max rounded-l-xl">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(20,122,82,0.1)_2px,rgba(20,122,82,0.1)_4px)] opacity-0 group-hover:opacity-100 transition-opacity mix-blend-screen" />
                        <span className="text-eduGreen-500 font-orbitron font-black text-xl md:text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">[</span>
                        <span className="relative text-xl md:text-3xl font-black tracking-[0.15em] md:tracking-[0.25em] font-orbitron text-white ml-2 md:ml-3">
                            LUCY
                            <span className="absolute -top-1 -right-2 text-[8px] md:text-[10px] text-eduGreen-500 tracking-tighter">OS</span>
                        </span>
                        <span className="text-eduGreen-500 font-orbitron font-black text-xl md:text-3xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity ml-2 md:ml-3">]</span>
                    </div>
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
            <DynamicAIAssistant userName={dbUser?.name} userId={dbUser?.id} />
            <NeuralTutorialWrapper role={role} />
            <PreferencesProvider children={null} />
            <NetworkBanner />
        </div>
    );
}
