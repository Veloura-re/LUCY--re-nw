import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import TeacherDossierClient from "@/components/dashboard/teacher-dossier-client";

export default async function TeacherDossierPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) redirect("/login");

    const dbUser = await getCachedUser(authUser.id);
    if (!dbUser || !['PRINCIPAL', 'SUPERADMIN'].includes(dbUser.role)) redirect("/dashboard");

    const { id } = await params;

    // Fetch teacher details
    const teacher = await prisma.user.findUnique({
        where: { id },
        include: {
            teacherAssignments: {
                include: {
                    subject: true,
                    class: true
                }
            },
            classesHomeroom: true
        }
    });

    if (!teacher || !['TEACHER', 'HOMEROOM'].includes(teacher.role)) {
        redirect("/dashboard/academic-personnel");
    }

    // Fetch remarks
    const remarks = await prisma.teacherRemark.findMany({
        where: { teacherId: id },
        orderBy: { createdAt: 'desc' },
        include: {
            author: { select: { name: true, role: true } }
        }
    });

    return (
        <TeacherDossierClient 
            teacher={teacher} 
            initialRemarks={remarks} 
        />
    );
}
