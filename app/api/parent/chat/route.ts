import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processParentChat } from '@/lib/ai';
import { createAiObservationContext } from '@/lib/ai-observability';
import { requireRole, publicErrorMessage, handleApiError, clientDataError } from '@/lib/security';
import { reportServerError } from '@/lib/error-capture';

import { logActivity } from '@/lib/audit';
export async function POST(request: Request) {
    try {
        const user = await requireRole(['PARENT']);
        const body = (await request.json().catch(() => ({}))) as { message?: unknown; previousHistory?: unknown };
        const rawMessage = typeof body?.message === 'string' ? body.message.trim() : '';
        if (!rawMessage) {
            return NextResponse.json({ error: 'Message must be a non-empty string' }, { status: 400 });
        }
        const message = rawMessage;
        const previousHistory = Array.isArray(body?.previousHistory) ? body.previousHistory : [];

        // Fetch deep context for Parent Chatbot
        const parentContext = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                parentLinks: {
                    include: {
                        student: {
                            include: {
                                class: {
                                    include: {
                                        timetable: true
                                    }
                                },
                                invoices: {
                                    where: { status: 'PENDING' }
                                },
                                gradeRecords: {
                                    take: 5,
                                    orderBy: { createdAt: 'desc' },
                                    include: { subject: true, exam: true }
                                },
                                attendanceRecords: {
                                    take: 5,
                                    orderBy: { date: 'desc' }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Pass context to AI along with the prompt
        const responseText = await processParentChat(parentContext, message, previousHistory, createAiObservationContext({ distinctId: user.id, spanName: 'parent_chat' }));
        
        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = user?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'action', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ text: responseText });
    } catch (e: any) {
        { const bad = clientDataError(e); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((e as any)?.message))) return handleApiError(e);
        console.error('[Parent Chat API Error]', e);
        void reportServerError(e, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(e, 'Failed to process chat') }, { status: 500 });
    }
}
