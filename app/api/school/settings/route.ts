import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireAuth, requireRole } from '@/lib/security';
import { logActivity, getIp } from '@/lib/audit';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { RESERVED_SUBDOMAINS } from '@/lib/school-subdomain';

export async function GET() {
    try {
        const authUser = await requireAuth();

        // 1. Fetch user record with related school connections
        const dbUser = await prisma.user.findUnique({
            where: { id: authUser.id },
            include: {
                school: {
                    include: {
                        _count: {
                            select: { students: true, users: true, grades: true }
                        }
                    }
                },
                parentLinks: {
                    include: {
                        student: {
                            include: {
                                school: {
                                    include: {
                                        _count: {
                                            select: { students: true, users: true, grades: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                student: {
                    include: {
                        school: {
                            include: {
                                _count: {
                                    select: { students: true, users: true, grades: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!dbUser) {
            return NextResponse.json({ school: null, error: "User profile not found." }, { status: 404 });
        }

        // 2. Resolve school via direct link or related relations
        let resolvedSchool = dbUser.school;

        if (!resolvedSchool && dbUser.parentLinks?.length > 0) {
            resolvedSchool = dbUser.parentLinks[0]?.student?.school || null;
        }

        if (!resolvedSchool && dbUser.student?.school) {
            resolvedSchool = dbUser.student.school;
        }

        // 3. Fallback for SUPERADMIN
        if (!resolvedSchool && dbUser.role === 'SUPERADMIN') {
            resolvedSchool = await prisma.school.findFirst({
                include: {
                    _count: {
                        select: { students: true, users: true, grades: true }
                    }
                },
                orderBy: { createdAt: 'asc' }
            });
        }

        if (!resolvedSchool) {
            return NextResponse.json({ school: null, error: "No school associated with this account." });
        }

        return NextResponse.json({
            school: resolvedSchool,
            isSuperadmin: dbUser.role === 'SUPERADMIN'
        });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);
        const targetSchoolId = user.schoolId || (user.role === 'SUPERADMIN' ? (await prisma.school.findFirst({ select: { id: true } }))?.id : null);
        
        if (!targetSchoolId) {
            return NextResponse.json({ error: "No school associated with this account." }, { status: 400 });
        }

        const body: any = await request.json();
        const { 
            name, 
            schoolCode, 
            domain,
            logoUrl, 
            address, 
            locations, 
            communicationsConfig, 
            termStructure, 
            termStructureLocked, 
            defaultBillingCycle,
            bankingConfig 
        } = body || {};

        const currentSchool = await prisma.school.findUnique({ where: { id: targetSchoolId } });
        if (!currentSchool) {
            return NextResponse.json({ error: "School record not found." }, { status: 404 });
        }

        if (currentSchool.termStructureLocked && termStructure && termStructure !== currentSchool.termStructure) {
            return NextResponse.json({ error: "Term Structure is locked and cannot be changed" }, { status: 400 });
        }

        const VALID_TERM_STRUCTURES = ['SEMESTERS', 'QUARTERS', 'TRIMESTERS', 'CUSTOM'];
        const VALID_BILLING_CYCLES = ['ONCE', 'MONTHLY', 'TERM', 'QUARTERLY', 'SEMESTERLY', 'ANNUAL'];

        if (termStructure && !VALID_TERM_STRUCTURES.includes(termStructure)) {
            return NextResponse.json({ error: `Invalid term structure: ${termStructure}` }, { status: 400 });
        }

        if (defaultBillingCycle && !VALID_BILLING_CYCLES.includes(defaultBillingCycle)) {
            return NextResponse.json({ error: `Invalid billing cycle: ${defaultBillingCycle}` }, { status: 400 });
        }

        const updateData: any = {};
        if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
        if (typeof schoolCode === 'string' && schoolCode.trim()) updateData.schoolCode = schoolCode.trim();

        if (domain !== undefined) {
            if (domain === null || domain === '') {
                updateData.domain = null;
            } else if (typeof domain === 'string') {
                const cleanDomain = domain.trim().toLowerCase();
                if (cleanDomain === '') {
                    updateData.domain = null;
                } else {
                    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(cleanDomain)) {
                        return NextResponse.json({ 
                            error: "Invalid subdomain format. Must be 1-63 alphanumeric characters or hyphens, starting with a letter or digit." 
                        }, { status: 400 });
                    }
                    if (RESERVED_SUBDOMAINS.has(cleanDomain)) {
                        return NextResponse.json({ 
                            error: `Subdomain '${cleanDomain}' is reserved by the platform.` 
                        }, { status: 400 });
                    }
                    const existingSchool = await prisma.school.findFirst({
                        where: {
                            id: { not: targetSchoolId },
                            domain: { equals: cleanDomain, mode: 'insensitive' }
                        },
                        select: { id: true }
                    });
                    if (existingSchool) {
                        return NextResponse.json({ 
                            error: `Subdomain '${cleanDomain}.lucyos.5-cn.net' is already claimed by another institution.` 
                        }, { status: 409 });
                    }
                    updateData.domain = cleanDomain;
                }
            }
        }
        if (typeof logoUrl === 'string') updateData.logoUrl = logoUrl;
        if (typeof address === 'string') updateData.address = address;
        if (locations !== undefined) updateData.locations = locations;
        if (communicationsConfig !== undefined) {
            updateData.communicationsConfig = {
                sendInvites: typeof communicationsConfig.sendInvites === 'boolean' ? communicationsConfig.sendInvites : true,
                sendReports: typeof communicationsConfig.sendReports === 'boolean' ? communicationsConfig.sendReports : true,
                sendInvoices: typeof communicationsConfig.sendInvoices === 'boolean' ? communicationsConfig.sendInvoices : true,
                replyTo: typeof communicationsConfig.replyTo === 'string' ? communicationsConfig.replyTo.trim() : ""
            };
        }
        if (termStructure) updateData.termStructure = termStructure;
        if (typeof termStructureLocked === 'boolean') updateData.termStructureLocked = termStructureLocked;
        if (defaultBillingCycle) updateData.defaultBillingCycle = defaultBillingCycle;
        if (bankingConfig !== undefined) updateData.bankingConfig = Array.isArray(bankingConfig) ? bankingConfig : [];

        const school = await prisma.school.update({
            where: { id: targetSchoolId },
            data: updateData
        });

        // Revalidate school profile cache
        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.SCHOOL_CONFIG, targetSchoolId), 'max');
        } catch { /* non-blocking */ }

        // Multi-Tenant Audit log invariant
        try {
            const clientIp = getIp(request);
            const _userId = user?.id;
            if (_userId) {
                await logActivity({
                    userId: _userId,
                    schoolId: targetSchoolId,
                    action: 'UPDATE_SETTINGS',
                    resourceType: 'settings',
                    resourceId: targetSchoolId,
                    ip: clientIp,
                    after: updateData
                });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ school });
    } catch (e: any) {
        console.error("PATCH /api/school/settings error:", e);
        return handleApiError(e);
    }
}
