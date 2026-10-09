import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireAuth, requireRole } from '@/lib/security';
import { logActivity, getIp } from '@/lib/audit';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { z } from 'zod';

export const dynamic = "force-dynamic";

const BankingAccountSchema = z.object({
    id: z.string().min(1),
    type: z.enum(['BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER']).default('BANK_TRANSFER'),
    provider: z.string().min(1, "Provider name is required"),
    accountName: z.string().min(1, "Account holder name is required"),
    accountNumber: z.string().min(1, "Account or phone number is required"),
    branch: z.string().optional().default(""),
    instructions: z.string().optional().default(""),
    isPrimary: z.boolean().default(false),
    isActive: z.boolean().default(true),
});

const BankingConfigPayloadSchema = z.object({
    accounts: z.array(BankingAccountSchema)
});

export async function GET(request: Request) {
    try {
        const authUser = await requireAuth();

        const dbUser = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: {
                id: true,
                role: true,
                schoolId: true,
                parentLinks: {
                    select: {
                        student: {
                            select: { schoolId: true }
                        }
                    }
                }
            }
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User profile not found." }, { status: 404 });
        }

        // Resolve school ID based on role
        let targetSchoolId = dbUser.schoolId;
        if (!targetSchoolId && dbUser.role === 'PARENT' && dbUser.parentLinks.length > 0) {
            targetSchoolId = dbUser.parentLinks[0]?.student?.schoolId || null;
        }

        if (!targetSchoolId && dbUser.role === 'SUPERADMIN') {
            const firstSchool = await prisma.school.findFirst({ select: { id: true } });
            targetSchoolId = firstSchool?.id || null;
        }

        if (!targetSchoolId) {
            return NextResponse.json({ accounts: [], error: "No school associated with this account." }, { status: 404 });
        }

        const school = await prisma.school.findUnique({
            where: { id: targetSchoolId },
            select: {
                id: true,
                name: true,
                schoolCode: true,
                bankingConfig: true
            }
        });

        if (!school) {
            return NextResponse.json({ accounts: [], error: "School record not found." }, { status: 404 });
        }

        const accounts = Array.isArray(school.bankingConfig) ? school.bankingConfig : [];

        return NextResponse.json(
            { accounts, schoolId: school.id, schoolName: school.name },
            {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
                }
            }
        );
    } catch (e: any) {
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

        const rawBody = await request.json();
        const parseResult = BankingConfigPayloadSchema.safeParse(rawBody);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: "Invalid banking configuration payload.", details: parseResult.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { accounts } = parseResult.data;

        // Ensure at most one primary account, default first active to primary if none set
        let hasPrimary = false;
        const normalizedAccounts = accounts.map((acc, index) => {
            if (acc.isPrimary) {
                if (hasPrimary) {
                    return { ...acc, isPrimary: false };
                }
                hasPrimary = true;
                return acc;
            }
            return acc;
        });

        if (!hasPrimary && normalizedAccounts.length > 0) {
            const firstActiveIndex = normalizedAccounts.findIndex(a => a.isActive);
            if (firstActiveIndex !== -1) {
                normalizedAccounts[firstActiveIndex].isPrimary = true;
            } else {
                normalizedAccounts[0].isPrimary = true;
            }
        }

        const updatedSchool = await prisma.school.update({
            where: { id: targetSchoolId },
            data: {
                bankingConfig: normalizedAccounts
            },
            select: {
                id: true,
                name: true,
                bankingConfig: true
            }
        });

        // Invalidate school configuration cache tag
        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.SCHOOL_CONFIG, targetSchoolId), 'max');
        } catch { /* non-blocking */ }

        // Multi-Tenant Audit Log Invariant
        try {
            const clientIp = getIp(request);
            await logActivity({
                userId: user.id,
                schoolId: targetSchoolId,
                action: 'UPDATE_BANKING_CONFIG',
                resourceType: 'finance',
                resourceId: targetSchoolId,
                ip: clientIp,
                after: { count: normalizedAccounts.length, accounts: normalizedAccounts }
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({
            success: true,
            accounts: updatedSchool.bankingConfig,
            message: "Institutional banking channels updated successfully."
        });
    } catch (e: any) {
        console.error("PATCH /api/school/finance/banking error:", e);
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    return PATCH(request);
}
