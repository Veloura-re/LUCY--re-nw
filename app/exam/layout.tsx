import { redirect } from "next/navigation";
// import { getUserSession } from "@/lib/auth"; // Assumption
import { createClient } from "@/utils/supabase/server";
import { getDeviceSessionState } from "@/lib/device-session";

export default async function ExamLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    if ((await getDeviceSessionState(user.id)) !== 'valid') {
        redirect("/logout?reason=session");
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white selection:bg-eduGreen-500/30">
            {children}
        </div>
    );
}

