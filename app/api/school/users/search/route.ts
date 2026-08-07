import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const currentUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim();

        if (!query || query.length < 1) return NextResponse.json({ users: [] });

        const isStaff = ['OWNER', 'TEACHER', 'HOMEROOM', 'PRINCIPAL', 'SUPERADMIN'].includes(currentUser.role);
        const isParent = currentUser.role === 'PARENT';
        const isStudent = currentUser.role === 'STUDENT';

        let results: any[] = [];

        // 1. If staff, allow finding students by studentCode or name, returning linked parents
        if (isStaff) {
            const studentMatches = await prisma.student.findMany({
                where: {
                    schoolId: currentUser.schoolId!,
                    OR: [
                        { studentCode: { contains: query, mode: 'insensitive' } },
                        { firstName: { contains: query, mode: 'insensitive' } },
                        { lastName: { contains: query, mode: 'insensitive' } }
                    ]
                },
                include: {
                    user: { select: { id: true, name: true, role: true, photoUrl: true, email: true } },
                    class: { select: { name: true } },
                    parentLinks: {
                        include: {
                            parent: {
                                select: { id: true, name: true, role: true, photoUrl: true, email: true }
                            }
                        }
                    }
                },
                take: 5
            });

            for (const s of studentMatches) {
                // Add student
                if (s.user) {
                    results.push({
                        id: s.user.id,
                        name: s.user.name || `${s.firstName} ${s.lastName}`,
                        role: 'STUDENT',
                        photoUrl: s.user.photoUrl,
                        email: s.user.email,
                        studentCode: s.studentCode,
                        className: s.class?.name
                    });
                }
                // Add linked parents directly to results so teachers can click to message parents instantly
                for (const pl of s.parentLinks) {
                    if (pl.parent && !results.some(r => r.id === pl.parent.id)) {
                        results.push({
                            id: pl.parent.id,
                            name: `${pl.parent.name} (Parent of ${s.firstName})`,
                            role: 'PARENT',
                            photoUrl: pl.parent.photoUrl,
                            email: pl.parent.email,
                            studentCode: s.studentCode
                        });
                    }
                }
            }
        }

        // 2. Direct User Search (name, email)
        const whereClause: any = {
            schoolId: currentUser.schoolId!,
            id: { not: currentUser.id },
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } }
            ]
        };

        if (isParent) {
            // Parents can search teachers, homeroom, principal, owners
            whereClause.role = { in: ['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'OWNER', 'SUPERADMIN'] };
        } else if (isStudent) {
            // Students can search teachers, homeroom, principal
            whereClause.role = { in: ['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'OWNER'] };
        }

        const directUsers = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, name: true, role: true, photoUrl: true, email: true },
            take: 10
        });

        for (const u of directUsers) {
            if (!results.some(r => r.id === u.id)) {
                results.push(u);
            }
        }

        return NextResponse.json({ users: results });
    } catch (e) {
        return handleApiError(e);
    }
}
