import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const currentUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query || query.length < 2) return NextResponse.json({ users: [] });

        const canSearchStudentCode = ['OWNER', 'TEACHER', 'HOMEROOM', 'PRINCIPAL', 'SUPERADMIN'].includes(currentUser.role);

        let results: any[] = [];

        // --- Student Code Search (for staff only) ---
        if (canSearchStudentCode) {
            const studentMatch = await prisma.student.findFirst({
                where: {
                    schoolId: currentUser.schoolId!,
                    studentCode: { contains: query, mode: 'insensitive' }
                },
                include: {
                    user: { select: { id: true, name: true, role: true, photoUrl: true } },
                    class: { select: { name: true } },
                    parentLinks: {
                        include: {
                            parent: {
                                select: { id: true, name: true, role: true, photoUrl: true }
                            }
                        }
                    }
                }
            });

            if (studentMatch) {
                // Build an entry for the student themselves (if they have a user account)
                if (studentMatch.user) {
                    results.push({
                        id: studentMatch.user.id,
                        name: studentMatch.user.name || `${studentMatch.firstName} ${studentMatch.lastName}`,
                        role: 'STUDENT',
                        photoUrl: studentMatch.user.photoUrl,
                        studentCode: studentMatch.studentCode,
                        className: studentMatch.class?.name,
                        // Attach all linked parents for the UI to offer "chat with parent"
                        parents: studentMatch.parentLinks.map(link => ({
                            id: link.parent.id,
                            name: link.parent.name,
                            role: 'PARENT',
                            photoUrl: link.parent.photoUrl
                        }))
                    });
                } else {
                    // Student has no user account yet — show as unlinked placeholder
                    results.push({
                        id: null,
                        name: `${studentMatch.firstName} ${studentMatch.lastName}`,
                        role: 'STUDENT',
                        studentCode: studentMatch.studentCode,
                        className: studentMatch.class?.name,
                        noAccount: true,
                        parents: studentMatch.parentLinks.map(link => ({
                            id: link.parent.id,
                            name: link.parent.name,
                            role: 'PARENT',
                            photoUrl: link.parent.photoUrl
                        }))
                    });
                }
                return NextResponse.json({ users: results, type: 'studentCode' });
            }
        }

        // --- Name Search (general) ---
        const whereClause: any = {
            schoolId: currentUser.schoolId!,
            name: { contains: query, mode: 'insensitive' },
            id: { not: currentUser.id }
        };

        // Students cannot see other students
        if (currentUser.role === 'STUDENT') {
            whereClause.role = { not: 'STUDENT' };
        }

        // Parents cannot see other parents
        if (currentUser.role === 'PARENT') {
            whereClause.role = { not: 'PARENT' };
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, name: true, role: true, photoUrl: true },
            take: 10
        });

        return NextResponse.json({ users });
    } catch (e) {
        return handleApiError(e);
    }
}
