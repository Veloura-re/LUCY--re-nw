import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, secureJson, sanitizeInput } from "@/lib/security";
import { logActivity } from "@/lib/audit";
import { CACHE_TAGS, getSchoolTag } from "@/lib/cache-keys";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TermCreateSchema = z.object({
    name: z.string().min(1, "Term name is required").max(100).transform(sanitizeInput),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    isActive: z.boolean().optional().default(false)
});

const TermBatchSchema = z.object({
    terms: z.array(TermCreateSchema).min(1, "At least one term is required")
});

const TermUpdateSchema = z.object({
    id: z.string().min(1, "Term ID is required"),
    name: z.string().min(1).max(100).optional().transform(val => val ? sanitizeInput(val) : undefined),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isActive: z.boolean().optional()
});

export async function GET(req: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM']);
        if (!user?.schoolId) return secureJson({ error: "Unauthorized: School association missing" }, 401);

        const terms = await prisma.academicTerm.findMany({
            where: { schoolId: user.schoolId },
            include: {
                _count: {
                    select: { marklists: true, exams: true }
                }
            },
            orderBy: { startDate: "asc" },
        });

        const res = secureJson({ terms });
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return res;
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: Request) {
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);
        if (!user?.schoolId) return secureJson({ error: "Unauthorized: School association missing" }, 401);

        const rawBody: any = await req.json();

        // Check if batch payload provided
        const isBatch = Array.isArray(rawBody) || (rawBody && Array.isArray(rawBody.terms));
        const rawTermsList = Array.isArray(rawBody) ? rawBody : (rawBody?.terms || null);

        if (isBatch && rawTermsList) {
            const batchResult = TermBatchSchema.safeParse({ terms: rawTermsList });
            if (!batchResult.success) {
                return secureJson({ error: "Invalid batch term payload", details: batchResult.error.flatten().fieldErrors }, 400);
            }

            const validatedTerms = batchResult.data.terms;

            // Validate date ordering for all items
            for (const t of validatedTerms) {
                const s = new Date(t.startDate);
                const e = new Date(t.endDate);
                if (isNaN(s.getTime()) || isNaN(e.getTime())) {
                    return secureJson({ error: `Invalid date format provided for term "${t.name}".` }, 400);
                }
                if (s > e) {
                    return secureJson({ error: `Start date cannot be after end date for term "${t.name}".` }, 400);
                }
            }

            const createdTerms = await prisma.$transaction(async (tx) => {
                // If any term is marked active, deactivate existing active terms
                const hasActive = validatedTerms.some(t => t.isActive);
                if (hasActive) {
                    await tx.academicTerm.updateMany({
                        where: { schoolId: user.schoolId!, isActive: true },
                        data: { isActive: false }
                    });
                }

                const results = [];
                for (const t of validatedTerms) {
                    const created = await tx.academicTerm.create({
                        data: {
                            schoolId: user.schoolId!,
                            name: t.name,
                            startDate: new Date(t.startDate),
                            endDate: new Date(t.endDate),
                            isActive: !!t.isActive
                        },
                        include: {
                            _count: { select: { marklists: true, exams: true } }
                        }
                    });
                    results.push(created);
                }
                return results;
            });

            await logActivity({
                userId: user.id,
                schoolId: user.schoolId!,
                action: 'CREATE_ACADEMIC_TERM_BATCH',
                resourceType: 'ACADEMIC_TERM',
                resourceId: createdTerms[0]?.id || 'BATCH',
                ip,
                userAgent,
                after: { count: createdTerms.length, termIds: createdTerms.map(t => t.id) }
            });

            try {
                revalidateTag(getSchoolTag(CACHE_TAGS.SCHOOL_CONFIG, user.schoolId!), 'max');
                revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, user.schoolId!), 'max');
                revalidateTag(getSchoolTag(CACHE_TAGS.GRADES, user.schoolId!), 'max');
                revalidateTag(`school-${user.schoolId!}`, 'max');
            } catch (cacheErr) {
                console.error("Cache revalidation ignored:", cacheErr);
            }

            return secureJson({ terms: createdTerms, count: createdTerms.length }, 201);
        }

        // Single term creation
        const parseResult = TermCreateSchema.safeParse(rawBody);
        if (!parseResult.success) {
            return secureJson({ error: "Invalid term creation payload", details: parseResult.error.flatten().fieldErrors }, 400);
        }

        const { name, startDate, endDate, isActive } = parseResult.data;

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return secureJson({ error: "Invalid date format provided for academic period." }, 400);
        }

        if (start > end) {
            return secureJson({ error: "Start date cannot be after end date." }, 400);
        }

        const term = await prisma.$transaction(async (tx) => {
            if (isActive) {
                await tx.academicTerm.updateMany({
                    where: { schoolId: user.schoolId!, isActive: true },
                    data: { isActive: false }
                });
            }

            return tx.academicTerm.create({
                data: {
                    schoolId: user.schoolId!,
                    name,
                    startDate: start,
                    endDate: end,
                    isActive: !!isActive,
                },
                include: {
                    _count: { select: { marklists: true, exams: true } }
                }
            });
        });

        await logActivity({
            userId: user.id,
            schoolId: user.schoolId!,
            action: 'CREATE_ACADEMIC_TERM',
            resourceType: 'ACADEMIC_TERM',
            resourceId: term.id,
            ip,
            userAgent,
            after: term
        });

        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.SCHOOL_CONFIG, user.schoolId!), 'max');
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, user.schoolId!), 'max');
            revalidateTag(getSchoolTag(CACHE_TAGS.GRADES, user.schoolId!), 'max');
            revalidateTag(`school-${user.schoolId!}`, 'max');
        } catch (cacheErr) {
            console.error("Cache revalidation ignored:", cacheErr);
        }

        return secureJson({ term }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PATCH(req: Request) {
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);
        if (!user?.schoolId) return secureJson({ error: "Unauthorized: School association missing" }, 401);

        const rawBody = await req.json();
        const parseResult = TermUpdateSchema.safeParse(rawBody);

        if (!parseResult.success) {
            return secureJson({ error: "Invalid term update payload", details: parseResult.error.flatten().fieldErrors }, 400);
        }

        const { id, name, startDate, endDate, isActive } = parseResult.data;

        const existing = await prisma.academicTerm.findFirst({
            where: { id, schoolId: user.schoolId }
        });

        if (!existing) {
            return secureJson({ error: "Term not found in your institution" }, 404);
        }

        const updated = await prisma.$transaction(async (tx) => {
            if (isActive) {
                await tx.academicTerm.updateMany({
                    where: { schoolId: user.schoolId!, id: { not: id }, isActive: true },
                    data: { isActive: false }
                });
            }

            return tx.academicTerm.update({
                where: { id },
                data: {
                    name: name || undefined,
                    startDate: startDate ? new Date(startDate) : undefined,
                    endDate: endDate ? new Date(endDate) : undefined,
                    isActive: isActive !== undefined ? isActive : undefined
                },
                include: {
                    _count: { select: { marklists: true, exams: true } }
                }
            });
        });

        await logActivity({
            userId: user.id,
            schoolId: user.schoolId!,
            action: 'UPDATE_ACADEMIC_TERM',
            resourceType: 'ACADEMIC_TERM',
            resourceId: id,
            ip,
            userAgent,
            before: existing,
            after: updated
        });

        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.SCHOOL_CONFIG, user.schoolId!), 'max');
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, user.schoolId!), 'max');
            revalidateTag(getSchoolTag(CACHE_TAGS.GRADES, user.schoolId!), 'max');
            revalidateTag(`school-${user.schoolId!}`, 'max');
        } catch (cacheErr) {
            console.error("Cache revalidation ignored:", cacheErr);
        }

        return secureJson({ term: updated });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(req: Request) {
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);
        if (!user?.schoolId) return secureJson({ error: "Unauthorized: School association missing" }, 401);

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return secureJson({ error: "Term ID is required" }, 400);
        }

        const existing = await prisma.academicTerm.findFirst({
            where: { id, schoolId: user.schoolId },
            include: {
                _count: {
                    select: { marklists: true, exams: true }
                }
            }
        });

        if (!existing) {
            return secureJson({ error: "Term not found in your institution" }, 404);
        }

        // Pre-flight safeguard: block deletion if dependent entities exist
        if (existing._count.marklists > 0 || existing._count.exams > 0) {
            return secureJson({ 
                error: `Cannot delete term "${existing.name}". It is currently linked to ${existing._count.marklists} marklist(s) and ${existing._count.exams} exam(s).`,
                marklistCount: existing._count.marklists,
                examCount: existing._count.exams,
                termName: existing.name,
                recovery: "To preserve grade history and report cards, please deactivate or archive the term rather than deleting it."
            }, 409);
        }

        await prisma.academicTerm.delete({
            where: { id }
        });

        await logActivity({
            userId: user.id,
            schoolId: user.schoolId!,
            action: 'DELETE_ACADEMIC_TERM',
            resourceType: 'ACADEMIC_TERM',
            resourceId: id,
            ip,
            userAgent,
            before: existing
        });

        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.SCHOOL_CONFIG, user.schoolId!), 'max');
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, user.schoolId!), 'max');
            revalidateTag(getSchoolTag(CACHE_TAGS.GRADES, user.schoolId!), 'max');
            revalidateTag(`school-${user.schoolId!}`, 'max');
        } catch (cacheErr) {
            console.error("Cache revalidation ignored:", cacheErr);
        }

        return secureJson({ success: true, message: `Term "${existing.name}" successfully removed.` });
    } catch (error) {
        return handleApiError(error);
    }
}
