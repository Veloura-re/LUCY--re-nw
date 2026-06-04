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
        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: schoolsData, error: sErr } = await supabaseAdmin
                .from('School')
                .select('*, users:User(id), students:Student(id), grades:Grade(id)')
                .order('createdAt', { ascending: false });

            if (sErr) throw sErr;

            const schools = (schoolsData || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                schoolCode: s.schoolCode,
                status: s.status,
                createdAt: s.createdAt,
                _count: {
                    users: s.users?.length || 0,
                    students: s.students?.length || 0,
                    grades: s.grades?.length || 0
                }
            }));
            return NextResponse.json({ schools });
        }

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

    const body = await request.json() as any;
    const { name, directorEmail } = body;

    if (!name || !directorEmail) {
        return NextResponse.json({ error: 'Name and director email required' }, { status: 400 });
    }

    try {
        console.log(`[AdminAPI] Creating school: ${name} (Director: ${directorEmail})`);
        
        const { prisma } = require('@/lib/prisma');
        let school: any = null;
        let token = "";

        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const schoolCode = `SCH-${Date.now().toString().slice(-6)}`;
            
            const { data: createdSchool, error: sErr } = await supabaseAdmin.from('School').insert({
                id: crypto.randomUUID(),
                name,
                schoolCode,
                status: 'PENDING',
                createdAt: new Date().toISOString()
            }).select().single();
            if (sErr || !createdSchool) throw sErr || new Error('Failed to create school record.');

            school = createdSchool;
            token = `inv_${crypto.randomUUID().replace(/-/g, '')}`;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

            const { error: invErr } = await supabaseAdmin.from('InviteToken').insert({
                id: crypto.randomUUID(),
                token,
                email: directorEmail,
                role: 'PRINCIPAL',
                schoolId: school.id,
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString()
            });
            if (invErr) throw invErr;
            console.log(`[AdminAPI] Edge-Native Invite token created for ${directorEmail}`);
        } else {
            try {
                const result = await prisma.$transaction(async (tx: any) => {
                    const createdSchool = await tx.school.create({
                        data: {
                            name,
                            schoolCode: `SCH-${Date.now().toString().slice(-6)}`,
                            status: 'PENDING',
                        },
                    });
                    console.log(`[AdminAPI] School created in DB: ${createdSchool.id}`);

                    const createdToken = `inv_${crypto.randomUUID().replace(/-/g, '')}`;
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

                    await tx.inviteToken.create({
                        data: {
                            token: createdToken,
                            email: directorEmail,
                            role: 'PRINCIPAL',
                            schoolId: createdSchool.id,
                            expiresAt,
                        },
                    });
                    console.log(`[AdminAPI] Invite token created for ${directorEmail}`);

                    return { school: createdSchool, token: createdToken };
                });
                school = result.school;
                token = result.token;
            } catch (prismaErr) {
                console.warn('[AdminAPI] Prisma transaction failed, falling back to Supabase REST:', prismaErr);
                const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
                const supabaseAdmin = createSupabaseAdmin(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );
                const schoolCode = `SCH-${Date.now().toString().slice(-6)}`;
                
                const { data: createdSchool, error: sErr } = await supabaseAdmin.from('School').insert({
                    id: crypto.randomUUID(),
                    name,
                    schoolCode,
                    status: 'PENDING',
                    createdAt: new Date().toISOString()
                }).select().single();
                if (sErr || !createdSchool) throw sErr || new Error('Failed to create school record via Supabase REST.');

                school = createdSchool;
                token = `inv_${crypto.randomUUID().replace(/-/g, '')}`;
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

                const { error: invErr } = await supabaseAdmin.from('InviteToken').insert({
                    id: crypto.randomUUID(),
                    token,
                    email: directorEmail,
                    role: 'PRINCIPAL',
                    schoolId: school.id,
                    expiresAt: expiresAt.toISOString(),
                    createdAt: new Date().toISOString()
                });
                if (invErr) throw invErr;
                console.log(`[AdminAPI] Fallback: Supabase REST Invite token created for ${directorEmail}`);
            }
        }

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${token}`;

        // Send invite email
        const { sendInviteEmail } = await import('@/lib/email');
        console.log(`[AdminAPI] Sending invitation email to ${directorEmail}...`);
        const emailResult = await sendInviteEmail(directorEmail, inviteUrl, name, token, 'PRINCIPAL', school.id);

        const res = emailResult as any;
        console.log(`[AdminAPI] Email send status: ${res.success} (Skipped: ${res.skipped})`);

        return NextResponse.json({
            school,
            inviteToken: token,
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
