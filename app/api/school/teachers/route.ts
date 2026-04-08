import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { sendInviteEmail } from '@/lib/email';
import { requireRole } from '@/lib/security';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

    try {
        // 1. Get All Teachers associated with this school
        const users = await prisma.user.findMany({
            where: {
                schoolId: dbUser.schoolId,
                role: { in: ['TEACHER', 'HOMEROOM'] }
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                teacherCode: true,
                qualification: true,
                gender: true,
                photoUrl: true,
                createdAt: true,
                verified: true
            }
        });

        // 2. Get All Pending Tokens to link back for unverified users
        const invites = await prisma.inviteToken.findMany({
            where: {
                schoolId: dbUser.schoolId,
                role: 'TEACHER',
                usedAt: null
            }
        });

        // 3. Format Teachers - those with User record and verified=true are ACTIVE, else PENDING
        const formattedTeachers = users.map(u => {
            const invite = invites.find(i => i.email === u.email);
            return {
                ...u,
                token: invite?.token || null, // Allow "Copy Code" for unverified users if token exists
                status: u.verified ? 'ACTIVE' : 'PENDING'
            };
        });

        // 4. Also include Invites that don't have a User record yet at all
        const orphanedInvites = invites
            .filter(i => !users.find(u => u.email === i.email))
            .map(i => ({
                id: i.id,
                name: null,
                email: i.email,
                token: i.token,
                createdAt: i.createdAt,
                status: 'PENDING'
            }));

        const all = [...formattedTeachers, ...orphanedInvites].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const school = await prisma.school.findUnique({
            where: { id: dbUser.schoolId! },
            select: { name: true, address: true, logoUrl: true }
        });

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
        const { name, email, phone, gender, teacherCode, qualification, photoUrl, subjects } = await request.json(); // subjects is string[] or ID[]

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

                // If subjects were passed, we might need to link them, but TeacherAssignment links User to Class+Subject.
                // Linking User to a Subject globally isn't in Schema explicitly other than assignments.
                // We'll skip subject linking here for now or assume it's done via Staffing page.
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

        return NextResponse.json({ success: true, teacher: updated });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || "Failed to update teacher" }, { status: 500 });
    }
}
