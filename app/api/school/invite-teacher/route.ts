import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { sendInviteEmail } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const school = await prisma.school.findUnique({ where: { id: dbUser.schoolId! } });
        if (!school) throw new Error("School not found");

        const { email } = (await request.json()) as { email: string };
        const token = crypto.randomUUID().replace(/-/g, '');

        await prisma.inviteToken.create({
            data: {
                token,
                email,
                role: 'TEACHER', // Fixed as Teacher for this endpoint
                schoolId: dbUser.schoolId!,
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
            }
        });

        const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net';
        const inviteUrl = `${origin}/invite/${token}`;

        const emailResult = await sendInviteEmail(email, inviteUrl, school.name, token, 'TEACHER', dbUser.schoolId!);

        const result = emailResult as any;
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
