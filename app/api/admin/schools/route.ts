import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdmin } from '@/lib/admin-auth';

// GET - List all schools
export async function GET(request: Request) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const schools = await prisma.school.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        users: true,
                        students: true,
                        grades: true
                    }
                }
            }
        });

        return NextResponse.json({ schools });
    } catch (error) {
        console.error("Error fetching schools:", error);
        return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }
}

// POST - Create school and invite director
export async function POST(request: Request) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, directorEmail } = body;

    if (!name || !directorEmail) {
        return NextResponse.json({ error: 'Name and director email required' }, { status: 400 });
    }

    try {
        console.log(`[AdminAPI] Creating school: ${name} (Director: ${directorEmail})`);
        const result = await prisma.$transaction(async (tx: any) => {
            const school = await tx.school.create({
                data: {
                    name,
                    schoolCode: `SCH-${Date.now().toString().slice(-6)}`,
                    status: 'PENDING',
                },
            });
            console.log(`[AdminAPI] School created in DB: ${school.id}`);

            const token = `inv_${crypto.randomUUID().replace(/-/g, '')}`;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

            await tx.inviteToken.create({
                data: {
                    token,
                    email: directorEmail,
                    role: 'PRINCIPAL',
                    schoolId: school.id,
                    expiresAt,
                },
            });
            console.log(`[AdminAPI] Invite token created for ${directorEmail}`);

            return { school, token };
        });

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${result.token}`;

        // Send invite email
        const { sendInviteEmail } = await import('@/lib/email');
        console.log(`[AdminAPI] Sending invitation email to ${directorEmail}...`);
        const emailResult = await sendInviteEmail(directorEmail, inviteUrl, name, result.token, 'PRINCIPAL', result.school.id);

        const res = emailResult as any;
        console.log(`[AdminAPI] Email send status: ${res.success} (Skipped: ${res.skipped})`);

        return NextResponse.json({
            school: result.school,
            inviteToken: result.token,
            inviteUrl,
            emailSent: res.success && !res.skipped,
            simulated: res.simulated || false,
            emailError: res.error || null,
            skipped: res.skipped || false
        });
    } catch (error) {
        console.error("[AdminAPI] Error creating school:", error);
        return NextResponse.json({ error: 'Failed to create school', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
