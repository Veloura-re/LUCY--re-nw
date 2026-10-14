import { publicErrorMessage, secureRandomInt } from '@/lib/security';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendInviteEmail } from '@/lib/email';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

// GET - List all schools safely
export async function GET(request: Request) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        
        // 1. Primary: Try Prisma ORM
        if (prisma) {
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
            } catch (prismaErr) {
                console.warn("[Admin API /schools] Prisma lookup failed, falling back to Supabase Admin REST API:", prismaErr);
            }
        }

        // 2. Secondary: Fallback to Supabase Service Role REST client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && serviceKey) {
            const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceKey);
            const { data: schoolsData, error: sErr } = await supabaseAdmin
                .from('School')
                .select('*');

            if (!sErr && schoolsData) {
                const schools = schoolsData.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    schoolCode: s.schoolCode,
                    status: s.status || 'ACTIVE',
                    createdAt: s.createdAt || new Date().toISOString(),
                    _count: {
                        users: 0,
                        students: 0,
                        grades: 0
                    }
                }));
                return NextResponse.json({ schools });
            }
        }

        // 3. Fallback: Return empty array instead of 500 server crash
        return NextResponse.json({ schools: [] });
    } catch (error: any) {
        console.error("Error fetching schools:", error);
        return NextResponse.json({ schools: [], error: publicErrorMessage(error) }, { status: 200 });
    }
}

// POST - Create school and invite owner
export async function POST(request: Request) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as any;
    const { name, ownerEmail } = body;

    if (!name || !ownerEmail) {
        return NextResponse.json({ error: 'Name and owner email required' }, { status: 400 });
    }

    try {
        console.log(`[AdminAPI] Provisioning school: ${name} (Owner: ${ownerEmail})`);
        

        if (prisma) {
            const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
            if (existingUser && existingUser.schoolId !== null) {
                return NextResponse.json({ error: 'Email is already registered to an existing institution.' }, { status: 400 });
            }

            const existingInvite = await prisma.inviteToken.findFirst({ where: { email: ownerEmail } });
            if (existingInvite) {
                await prisma.inviteToken.delete({ where: { id: existingInvite.id } });
            }

            // Create school via Prisma
            const schoolCode = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) + secureRandomInt(100, 999);
            const school = await prisma.school.create({
                data: {
                    name,
                    schoolCode,
                    status: 'ACTIVE'
                }
            });

            // Create Invite Token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await prisma.inviteToken.create({
                data: {
                    token,
                    email: ownerEmail,
                    role: 'OWNER',
                    schoolId: school.id,
                    expiresAt
                }
            });

            const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://lucy-re-nw.vercel.app'}/invite/${token}`;
            await sendInviteEmail(ownerEmail, inviteUrl, name, 'OWNER');

            return NextResponse.json({ success: true, school, inviteUrl });
        }

        // Supabase Fallback
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceKey);

        const schoolCode = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) + secureRandomInt(100, 999);
        const { data: school, error: schErr } = await supabaseAdmin
            .from('School')
            .insert([{ name, schoolCode, status: 'ACTIVE' }])
            .select()
            .single();

        if (schErr) throw schErr;

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await supabaseAdmin
            .from('InviteToken')
            .insert([{ token, email: ownerEmail, role: 'OWNER', schoolId: school.id, expiresAt }]);

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://lucy-re-nw.vercel.app'}/invite/${token}`;
        await sendInviteEmail(ownerEmail, inviteUrl, name, 'OWNER');

        return NextResponse.json({ success: true, school, inviteUrl });
    } catch (err: any) {
        console.error("[AdminAPI Error]:", err);
        return NextResponse.json({ error: publicErrorMessage(err, 'Failed to provision institution') }, { status: 500 });
    }
}
