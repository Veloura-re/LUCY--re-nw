import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, STAFF_ROLES } from '@/lib/security';
import { scanEssaySubmission } from '@/lib/ai';
import { logActivity, getIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const user = await requireRole(STAFF_ROLES);
        if (!user.schoolId) {
            return NextResponse.json({ error: 'Tenant isolation failure: User unlinked to school' }, { status: 403 });
        }

        const body = (await request.json()) as {
            submissionId?: string;
            content?: string;
            title?: string;
            description?: string;
            subject?: string;
            maxScore?: number;
            forceRescan?: boolean;
        };

        const { submissionId, content, title, description, subject, maxScore, forceRescan } = body;

        if (submissionId) {
            // Fetch the existing submission with tenant boundary
            const submission = await prisma.assignmentSubmission.findFirst({
                where: {
                    id: submissionId,
                    schoolId: user.schoolId
                },
                include: {
                    assignment: {
                        include: {
                            subject: true,
                            class: true
                        }
                    },
                    student: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            studentCode: true
                        }
                    }
                }
            });

            if (!submission) {
                return NextResponse.json({ error: 'Submission not found or unauthorized' }, { status: 404 });
            }

            const essayText = submission.content || '';
            if (essayText.trim().split(/\s+/).filter(Boolean).length < 10) {
                return NextResponse.json({
                    error: 'Submission content is too short for meaningful AI essay analysis (minimum 10 words required).'
                }, { status: 400 });
            }

            // Check if existing scan is already cached
            const existingScan = (submission as any).aiScanResult;
            if (!forceRescan && existingScan && existingScan.authenticityScore !== undefined) {
                return NextResponse.json({
                    success: true,
                    scanResult: existingScan,
                    cached: true
                });
            }

            // Execute full AI scan
            const scanResult = await scanEssaySubmission({
                title: submission.assignment?.title || 'Coursework Assignment',
                description: submission.assignment?.description || '',
                content: essayText,
                subject: submission.assignment?.subject?.name || 'General Academic',
                maxScore: submission.assignment?.maxScore || 100
            });

            // Persist scan result to database
            await prisma.assignmentSubmission.update({
                where: { id: submission.id },
                data: {
                    aiScanResult: scanResult as any
                } as any
            });

            // Audit log
            logActivity({
                userId: user.id,
                schoolId: user.schoolId,
                action: 'UPDATE',
                resourceType: 'assignment_ai_scan',
                resourceId: submission.id,
                ip: getIp(request)
            }).catch(() => {});

            return NextResponse.json({
                success: true,
                scanResult,
                cached: false
            });
        }

        // On-demand ad-hoc text scan
        if (!content || !title) {
            return NextResponse.json({ error: 'Missing required parameters (submissionId or content & title)' }, { status: 400 });
        }

        const scanResult = await scanEssaySubmission({
            title,
            description: description || '',
            content,
            subject: subject || 'General Academic',
            maxScore: maxScore || 100
        });

        logActivity({
            userId: user.id,
            schoolId: user.schoolId,
            action: 'CREATE',
            resourceType: 'adhoc_essay_ai_scan',
            ip: getIp(request)
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            scanResult,
            cached: false
        });

    } catch (error: any) {
        console.error('[AI Essay Scan API Error]', error);
        return NextResponse.json(
            { error: 'Failed to scan submission', details: error.message },
            { status: 500 }
        );
    }
}
