import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, secureJson, sanitizeInput } from "@/lib/security";
import { logActivity, logError } from "@/lib/audit";
import { z } from "zod";

const TermCreateSchema = z.object({
    name: z.string().min(1, "Term name is required").max(100).transform(sanitizeInput),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    isActive: z.boolean().optional().default(false)
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
            orderBy: { startDate: "desc" },
        });

        return secureJson({ terms });
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

        const rawBody = await req.json();
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
            // If setting this term active, optionally toggle other terms if single active required
            if (isActive) {
                // Keep others or leave as is
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

        const updated = await prisma.academicTerm.update({
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

        return secureJson({ success: true, message: `Term "${existing.name}" successfully removed.` });
    } catch (error) {
        return handleApiError(error);
    }
}
