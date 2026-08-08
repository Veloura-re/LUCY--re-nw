import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processParentChat } from '@/lib/ai';
import { requireRole } from '@/lib/security';

export async function POST(request: Request) {
    try {
        const user = await requireRole(['PARENT']);
        const { message, previousHistory } = await request.json();

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
        const responseText = await processParentChat(parentContext, message, previousHistory);
        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = user?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'action', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ text: responseText });
    } catch (e: any) {
        console.error('[Parent Chat API Error]', e);
        return NextResponse.json({ error: e.message || 'Failed to process chat' }, { status: 500 });
    }
}
