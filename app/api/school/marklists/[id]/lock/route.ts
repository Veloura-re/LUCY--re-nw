import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, publicErrorMessage, handleApiError, clientDataError } from '@/lib/security';
import { logActivity } from '@/lib/audit';
import { reportServerError } from '@/lib/error-capture';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);
        const { isLocked }: any = await request.json().catch(() => ({}));

        const exam = await prisma.exam.findUnique({
            where: { id },
            include: {
                class: {
                    select: {
                        grade: { select: { schoolId: true } }
                    }
                }
            }
        });

        if (!exam) {
            return NextResponse.json({ error: "Marklist not found" }, { status: 404 });
        }

        const schoolId = user.schoolId || exam.class?.grade?.schoolId;

        const updated = await prisma.exam.update({
            where: { id },
            data: { isLocked: Boolean(isLocked) }
        });

        if (schoolId) {
            try {
                const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
                await logActivity({
                    userId: user.id,
                    schoolId,
                    action: isLocked ? 'LOCK_MARKLIST' : 'UNLOCK_MARKLIST',
                    resourceType: 'EXAM',
                    resourceId: id,
                    ip
                });
            } catch (auditErr) {
                { const bad = clientDataError(auditErr); if (bad) return bad; }
                if (/^(Unauthorized|Forbidden)/.test(String((auditErr as any)?.message))) return handleApiError(auditErr);
                console.error("Audit log error:", auditErr);
            }
        }

        return NextResponse.json({ success: true, exam: updated });
    } catch (e: any) {
        { const bad = clientDataError(e); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((e as any)?.message))) return handleApiError(e);
        console.error("Lock Marklist Error:", e);
        void reportServerError(e, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(e, "Failed to update marklist lock status") }, { status: 500 });
    }
}
