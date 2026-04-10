import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { sendInviteEmail } from '@/lib/email';
import { requireRole } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { getCachedTeacherRegistry, getCachedSchoolInfoForRegistry } from '@/lib/services/teachers';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

    try {
        // Fetch from the optimized, cached service
        const all = await getCachedTeacherRegistry(dbUser.schoolId);
        const school = await getCachedSchoolInfoForRegistry(dbUser.schoolId);

        return NextResponse.json({ teachers: all, school });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
    }
}

// POST: Register a new teacher (and invite)
export async function POST(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        const { name, email, phone, gender, teacherCode, qualification, photoUrl } = await request.json();

        if (!user.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        // Check if user already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
        }

        // Create User (Pending Verification)
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                role: 'TEACHER', // Default role
                schoolId: user.schoolId,
                verified: false,
                teacherCode: teacherCode || `TCH-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                gender: gender || null,
                phone: phone || null,
                qualification: qualification || null,
                photoUrl: photoUrl || null,
            }
        });

        // Create Invite Token
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await prisma.inviteToken.create({
            data: {
                token,
                email,
                role: 'TEACHER',
                schoolId: user.schoolId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            }
        });

        // Trigger Cache Invalidation for the personnel registry
        revalidateTag(getSchoolTag(CACHE_TAGS.USER_PROFILE, user.schoolId), 'max');

        const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net';
        const inviteUrl = `${origin}/invite/${token}`;

        // Find school name
        const school = await prisma.school.findUnique({ where: { id: user.schoolId } });

        await sendInviteEmail(email, inviteUrl, school?.name || 'Institution', token, 'TEACHER', user.schoolId);

        return NextResponse.json({ user: newUser, token });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || 'Failed to create teacher' }, { status: 500 });
    }
}

// PUT: Update teacher details
export async function PUT(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        const { id, name, email, phone, gender, qualification, photoUrl } = await request.json();

        if (!id) return NextResponse.json({ error: "Teacher ID required" }, { status: 400 });

        // Ensure teacher belongs to same school
        const teacher = await prisma.user.findFirst({
            where: { id, schoolId: user.schoolId, role: { in: ['TEACHER', 'HOMEROOM'] } }
        });

        if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

        const updated = await prisma.user.update({
            where: { id },
            data: {
                name,
                email, // Changing email might require re-verification or Supabase Auth update logic (ignored for now)
                phone,
                gender,
                qualification,
                photoUrl
            }
        });

        // Trigger Cache Invalidation for the personnel registry
        revalidateTag(getSchoolTag(CACHE_TAGS.USER_PROFILE, user.schoolId), 'max');

        return NextResponse.json({ success: true, teacher: updated });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || "Failed to update teacher" }, { status: 500 });
    }
}
