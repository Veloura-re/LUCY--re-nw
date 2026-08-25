import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getCachedUser } from '@/lib/users';
import { prisma } from '@/lib/prisma';
import { SanctuaryClientWrapper } from '@/components/dashboard/sanctuary-client-wrapper';

export const metadata: Metadata = {
    title: 'Sanctuary | Anonymous Peer & Mentor Network | LUCY OS',
    description: 'Anonymous, confidential peer support and educator mentorship network across schools.'
};

export default async function SanctuaryPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const dbUser = await getCachedUser(user.id);
    if (!dbUser) {
        redirect('/login');
    }

    let isEligibleStudent = true;

    if (dbUser.role === 'STUDENT') {
        const studentRecord = await prisma.student.findFirst({
            where: {
                OR: [
                    { userId: dbUser.id },
                    { email: dbUser.email || '' }
                ]
            },
            include: { grade: true }
        });

        if (studentRecord && studentRecord.grade) {
            const level = studentRecord.grade.level;
            // If grade level is specified (> 0), ensure student is in Grades 7 to 12
            if (level > 0 && (level < 7 || level > 12)) {
                isEligibleStudent = false;
            }
        }
    }

    return (
        <div className="py-4 space-y-6">
            <SanctuaryClientWrapper
                currentUser={{
                    id: dbUser.id,
                    role: dbUser.role,
                    schoolId: dbUser.schoolId,
                    name: dbUser.name
                }}
                isEligibleStudent={isEligibleStudent}
            />
        </div>
    );
}
