import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { BooksView } from "@/components/dashboard/books-view";
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export default async function BooksPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const dbUser = await getCachedUser(user.id) as any;
    if (!dbUser) redirect("/login");

    if (!dbUser.schoolId && dbUser.role === 'SUPERADMIN') {
        dbUser.schoolId = 'c4020909-c825-4490-9790-18e0632dbeaf';
    }

    // Fetch school separately (Edge-safe)
    const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: school } = await supabaseAdmin
        .from('School')
        .select('*')
        .eq('id', dbUser.schoolId)
        .maybeSingle();

    let children: any[] = [];
    if (dbUser.role === 'PARENT') {
        const { data: links } = await supabaseAdmin
            .from('ParentStudentLink')
            .select('*, student:Student(*)')
            .eq('parentId', dbUser.id);
        children = (links || []).map((l: any) => l.student);
    }

    return (
        <BooksView user={dbUser} school={school} children={children} />
    );
}
