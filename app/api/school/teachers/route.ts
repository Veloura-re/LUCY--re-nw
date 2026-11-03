import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { sendInviteEmail } from '@/lib/email';
import { requireRole, handleApiError, secureJson, STAFF_ROLES, clampLimit, clampPage } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { getCachedTeacherRegistry, getCachedSchoolInfoForRegistry } from '@/lib/services/teachers';
import { withAudit } from '@/lib/with-audit';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(STAFF_ROLES);
        const { searchParams } = new URL(request.url);
        
        const page = clampPage(searchParams.get('page'));
        const limit = clampLimit(searchParams.get('limit'), 50);
        const search = searchParams.get('search')?.toLowerCase() || '';
        const status = searchParams.get('status') || 'ALL';
        const sortBy = searchParams.get('sortBy') || 'NAME';
        const sortDir = searchParams.get('sortDir') || 'ASC';

        // Fetch from the optimized, cached service
        let all = await getCachedTeacherRegistry(dbUser.schoolId!);
        const school = await getCachedSchoolInfoForRegistry(dbUser.schoolId!);

        // Server-side filtering
        if (status !== 'ALL') {
            all = all.filter((t: any) => t.status === status);
        }
        if (search) {
            all = all.filter((t: any) => 
                t.name?.toLowerCase().includes(search) || 
                t.email?.toLowerCase().includes(search)
            );
        }

        // Server-side sorting
        all = all.sort((a: any, b: any) => {
            if (sortBy === 'STATUS') {
                const cmp = a.status.localeCompare(b.status);
                return sortDir === 'DESC' ? -cmp : cmp;
            } else {
                const nameA = a.name || a.email;
                const nameB = b.name || b.email;
                const cmp = nameA.localeCompare(nameB);
                return sortDir === 'DESC' ? -cmp : cmp;
            }
        });

        // Server-side pagination
        const total = all.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginated = all.slice(offset, offset + limit);

        return secureJson({ 
            teachers: paginated, 
            school,
            pagination: { page, limit, totalPages, total }
        });
    } catch (e) {
        return handleApiError(e);
    }
}

// POST: Register a new teacher (and invite)
async function handlePOST(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const { name, email, phone, gender, teacherCode, qualification, photoUrl, role: rawRole } = await request.json() as any;

        if (!user.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        const allowedRoles = ['TEACHER', 'PRINCIPAL', 'HOMEROOM'];
        const role = allowedRoles.includes(rawRole) ? rawRole : 'TEACHER';

        // Check if user already exists
        let existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            if (existing.schoolId && existing.schoolId !== user.schoolId) {
                return NextResponse.json({ error: 'Email is already registered to another institution.' }, { status: 400 });
            }
            if (existing.schoolId === user.schoolId && existing.verified) {
                return NextResponse.json({ error: 'User is already an active member of this school.' }, { status: 400 });
            }
            
            // Re-link the user if they were deleted (schoolId is null) or not verified yet
            existing = await prisma.user.update({
                where: { email },
                data: {
                    schoolId: user.schoolId,
                    role: role,
                    name: name || existing.name,
                    phone: phone || existing.phone,
                    gender: gender || existing.gender,
                    qualification: qualification || existing.qualification,
                    photoUrl: photoUrl || existing.photoUrl,
                    teacherCode: existing.teacherCode || teacherCode || `TCH-${globalThis.crypto.randomUUID().split('-')[0].substring(0, 4).toUpperCase()}`
                }
            });
        }

        await prisma.inviteToken.deleteMany({ where: { email, schoolId: user.schoolId } });

        // Create User if doesn't exist
        const newUser = existing || await prisma.user.create({
            data: {
                name,
                email,
                role,
                schoolId: user.schoolId,
                verified: false,
                teacherCode: teacherCode || `TCH-${globalThis.crypto.randomUUID().split('-')[0].substring(0, 4).toUpperCase()}`,
                gender: gender || null,
                phone: phone || null,
                qualification: qualification || null,
                photoUrl: photoUrl || null,
            }
        });

        // Create Invite Token
        const token = globalThis.crypto.randomUUID().replace(/-/g, '');
        await prisma.inviteToken.create({
            data: {
                token,
                email,
                role,
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

        console.log(`[TEACHERS API] Sending invite to ${email} as ${role} for school "${school?.name}"`);
        const emailResult = await sendInviteEmail(email, inviteUrl, school?.name || 'Institution', token, role, user.schoolId);
        const res = emailResult as any;
        console.log(`[TEACHERS API] Invite email result:`, JSON.stringify(res));

        const { passwordHash: _ph, activeSessionId: _as, legalVersionAccepted: _lv, ...safeUser } = newUser as any;
        return secureJson({ 
            user: safeUser, 
            token, 
            emailSent: res.success && !res.skipped, 
            emailError: res.error || null 
        });

    } catch (e: any) {
        return handleApiError(e);
    }
}

// PUT: Update teacher details
async function handlePUT(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const { id, name, email, phone, gender, qualification, photoUrl, role: rawRole } = await request.json() as any;

        if (!id) return NextResponse.json({ error: "Teacher ID required" }, { status: 400 });

        // Ensure teacher belongs to same school
        const teacher = await prisma.user.findFirst({
            where: { id, schoolId: user.schoolId, role: { in: ['TEACHER', 'HOMEROOM', 'PRINCIPAL'] } }
        });

        if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

        const allowedRoles = ['TEACHER', 'PRINCIPAL', 'HOMEROOM'];
        const roleToUpdate = allowedRoles.includes(rawRole) ? rawRole : teacher.role;

        const updated = await prisma.user.update({
            where: { id },
            data: {
                name,
                email, // Changing email might require re-verification or Supabase Auth update logic (ignored for now)
                phone,
                gender,
                qualification,
                photoUrl,
                role: roleToUpdate
            }
        });

        // Trigger Cache Invalidation for the personnel registry
        revalidateTag(getSchoolTag(CACHE_TAGS.USER_PROFILE, user.schoolId), 'max');

        return secureJson({ success: true, teacher: updated });

    } catch (e: any) {
        return handleApiError(e);
    }
}

export const POST = withAudit(handlePOST, { action: 'CREATE_TEACHER', resourceType: 'staff' });
export const PUT = withAudit(handlePUT, { action: 'UPDATE_TEACHER', resourceType: 'staff' });
