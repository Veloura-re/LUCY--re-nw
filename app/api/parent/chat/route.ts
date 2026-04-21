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
<<<<<<< HEAD
                parentStudents: {
=======
                parentLinks: {
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
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
<<<<<<< HEAD
                                examScores: {
=======
                                gradeRecords: {
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
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
        return NextResponse.json({ text: responseText });
    } catch (e: any) {
        console.error('[Parent Chat API Error]', e);
        return NextResponse.json({ error: e.message || 'Failed to process chat' }, { status: 500 });
    }
}
