import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { sendInviteEmail } from '@/lib/email';

import { logActivity } from '@/lib/audit';
export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const school = await prisma.school.findUnique({ where: { id: dbUser.schoolId! } });
        if (!school) throw new Error("School not found");

        const { email } = (await request.json()) as { email: string };

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            if (existingUser.schoolId && existingUser.schoolId !== dbUser.schoolId) {
                return NextResponse.json({ error: 'Email is already registered to another institution.' }, { status: 400 });
            }
            if (existingUser.schoolId === dbUser.schoolId && existingUser.verified) {
                return NextResponse.json({ error: 'User is already an active member of this school.' }, { status: 400 });
            }
        }

        const existingInvite = await prisma.inviteToken.findFirst({ where: { email } });
        if (existingInvite) {
            await prisma.inviteToken.delete({ where: { id: existingInvite.id } });
        }

        const token = crypto.randomUUID().replace(/-/g, '');

        await prisma.inviteToken.create({
            data: {
                token,
                email,
                role: 'TEACHER',
                schoolId: dbUser.schoolId!,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            }
        });

        // Ensure a placeholder or unverified user is linked to the institution
        if (!existingUser) {
            await prisma.user.create({
                data: {
                    email,
                    name: email.split('@')[0],
                    role: 'TEACHER',
                    schoolId: dbUser.schoolId!,
                    verified: false,
                    teacherCode: `TCH-${crypto.randomUUID().split('-')[0].substring(0, 4).toUpperCase()}`
                }
            }).catch(() => {});
        } else if (!existingUser.schoolId) {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    schoolId: dbUser.schoolId!,
                    role: 'TEACHER'
                }
            }).catch(() => {});
        }

        const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://lucyos.5-cn.net';
        const inviteUrl = `${origin}/invite/${token}`;

        const emailResult = await sendInviteEmail(email, inviteUrl, school.name, token, 'TEACHER', dbUser.schoolId!);
        const result = emailResult as any;

        // Invalidate Personnel Cache
        try {
            const { revalidateTag } = await import('next/cache');
            const { CACHE_TAGS, getSchoolTag } = await import('@/lib/cache-keys');
            revalidateTag(getSchoolTag(CACHE_TAGS.USER_PROFILE, dbUser.schoolId!), 'max');
        } catch { /* non-blocking */ }
        
        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, schoolId: dbUser.schoolId!, action: 'INVITE', resourceType: 'teacher_invite', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({
            token,
            sent: result.success && !result.skipped,
            simulated: result.simulated || false,
            emailError: result.error || null,
            skipped: result.skipped || false
        });
    } catch (e) {
        return handleApiError(e);
    }
}
