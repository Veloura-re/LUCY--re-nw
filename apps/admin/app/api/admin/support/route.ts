import { NextRequest, NextResponse } from 'next/server';
import { AdminRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/server-auth';
import { logAdminAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request, [AdminRole.SUPPORT]);
    if (auth instanceof NextResponse) return auth;

    const { admin, ip, userAgent } = auth;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    let schools;
    let students = null;
    let teachers = null;

    if (query) {
        // Targeted troubleshooting lookup
        schools = await prisma.school.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { schoolCode: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: 20,
            select: {
                id: true,
                name: true,
                schoolCode: true,
                status: true,
                domain: true,
                createdAt: true,
                _count: {
                    select: { students: true, users: true, classes: true },
                },
            },
        });

        students = await prisma.student.findMany({
            where: {
                OR: [
                    { studentCode: { contains: query, mode: 'insensitive' } },
                    { user: { name: { contains: query, mode: 'insensitive' } } },
                ],
            },
            take: 10,
            select: {
                id: true,
                studentCode: true,
                enrollmentStatus: true,
                user: { select: { name: true, email: true } },
                school: { select: { name: true, schoolCode: true } },
                enrolledAt: true,
            },
        });

        teachers = await prisma.user.findMany({
            where: {
                role: { in: ['TEACHER', 'HOMEROOM', 'PRINCIPAL'] },
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { teacherCode: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: 10,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                teacherCode: true,
                school: { select: { name: true, schoolCode: true } },
            },
        });
    } else {
        // Standard school directory overview
        schools = await prisma.school.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                schoolCode: true,
                status: true,
                domain: true,
                createdAt: true,
                _count: {
                    select: { students: true, users: true, classes: true },
                },
            },
        });
    }

    await logAdminAction({
        adminId: admin.id,
        action: 'SUPPORT_DIRECTORY_QUERIED',
        targetResource: 'SchoolDirectory',
        ipAddress: ip,
        userAgent,
        metadata: { query: query || 'all' },
    });

    return NextResponse.json({
        schools,
        students,
        teachers,
    });
}
