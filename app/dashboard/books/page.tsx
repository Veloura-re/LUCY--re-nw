import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BooksView } from "@/components/dashboard/books-view";

export default async function BooksPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    let dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { school: true }
    });

    if (!dbUser && user.email) {
        dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { school: true }
        });
    }

    if (!dbUser) redirect("/login");

    let children: any[] = [];
    if (dbUser.role === 'PARENT') {
        const links = await prisma.parentStudentLink.findMany({
            where: { parentId: user.id },
            include: { student: true }
        });
        children = links.map(l => l.student);
    }

    return (
        <BooksView user={dbUser} school={dbUser.school} children={children} />
    );
}

