import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import PrincipalsClient from "./principals-client";

export default async function PrincipalsPage() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) redirect("/login");

    let dbUser: any = null;
    try {
        dbUser = await getCachedUser(authUser.id);
    } catch (e) {
        console.error('[PrincipalsPage] Failed to fetch profile:', e);
    }

    if (!dbUser || !dbUser.schoolId || dbUser.role !== 'OWNER') {
        redirect("/dashboard");
    }

    return <PrincipalsClient schoolId={dbUser.schoolId} schoolName={dbUser.school?.name || "Institution"} />;
}
