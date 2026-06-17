import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import ApprovalsClient from "./approvals-client";

export default async function ApprovalsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const dbUser = await getCachedUser(user.id);
    if (!dbUser || (dbUser.role !== 'OWNER' && dbUser.role !== 'SUPERADMIN')) {
        redirect("/dashboard");
    }

    return <ApprovalsClient />;
}
