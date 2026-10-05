import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { BooksView } from "@/components/dashboard/books-view";
import { prisma } from "@/lib/prisma";

export default async function BooksPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const dbUser = await getCachedUser(user.id) as any;
    if (!dbUser) redirect("/login");

    if (!dbUser.schoolId && dbUser.role === 'SUPERADMIN') {
        dbUser.schoolId = 'c4020909-c825-4490-9790-18e0632dbeaf';
    }

    if (!dbUser.schoolId) {
        redirect("/dashboard");
    }

    let school: any = null;
    let children: any[] = [];
    try {
        school = await prisma.school.findUnique({ where: { id: dbUser.schoolId } });
        if (dbUser.role === 'PARENT') {
            const links = await prisma.parentStudentLink.findMany({
                where: { parentId: dbUser.id },
                include: { student: true }
            });
            children = links.map((l: any) => l.student);
        }
    } catch (e) {
        console.error('[BooksPage] Error loading institutional context:', e);
    }

    return (
        <BooksView user={dbUser} school={school} children={children} />
    );
}
