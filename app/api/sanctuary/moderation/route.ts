import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, publicErrorMessage, clampLimit, clampPage, clientDataError } from '@/lib/security';

export async function GET(req: NextRequest) {
    try {
        const user = await requireRole(['SUPERADMIN']);

        const url = new URL(req.url);
        const requestedSchoolId = url.searchParams.get('schoolId');
        const filterType = url.searchParams.get('filter') || 'ALL'; // ALL | CRISIS | DOXXING | REPORTS
        const page = clampPage(url.searchParams.get('page'));
        const limit = clampLimit(url.searchParams.get('limit'), 20);
        const skip = (page - 1) * limit;

        const isSuperAdmin = user.role === 'SUPERADMIN';
        const effectiveSchoolId = isSuperAdmin ? (requestedSchoolId || undefined) : (user.schoolId || undefined);

        // Build base session filter
        const sessionWhere: any = {};
        if (effectiveSchoolId) {
            sessionWhere.OR = [
                { userASchoolId: effectiveSchoolId },
                { userBSchoolId: effectiveSchoolId }
            ];
        }

        // 1. Fetch telemetry stats
        const [
            totalActiveSessions,
            totalFlaggedSessions,
            allReportsCount,
            recentSessions
        ] = await Promise.all([
            prisma.sanctuarySession.count({
                where: { ...sessionWhere, status: 'ACTIVE' }
            }),
            prisma.sanctuarySession.count({
                where: { ...sessionWhere, status: 'FLAGGED' }
            }),
            prisma.sanctuaryReport.count({
                where: effectiveSchoolId ? {
                    session: {
                        OR: [
                            { userASchoolId: effectiveSchoolId },
                            { userBSchoolId: effectiveSchoolId }
                        ]
                    }
                } : {}
            }),
            prisma.sanctuarySession.findMany({
                where: {
                    ...sessionWhere,
                    status: { in: ['ACTIVE', 'FLAGGED', 'ENDED'] }
                },
                select: {
                    id: true,
                    userASchoolId: true,
                    userBSchoolId: true,
                    status: true,
                    mode: true,
                    createdAt: true
                },
                take: 100,
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Calculate intra vs cross topology stats
        let intraCampusCount = 0;
        let crossCampusCount = 0;
        recentSessions.forEach(s => {
            if (s.userASchoolId === s.userBSchoolId) {
                intraCampusCount++;
            } else {
                crossCampusCount++;
            }
        });

        // 2. Fetch Paginated Reports
        const reportsWhere: any = {};
        if (effectiveSchoolId) {
            reportsWhere.session = {
                OR: [
                    { userASchoolId: effectiveSchoolId },
                    { userBSchoolId: effectiveSchoolId }
                ]
            };
        }

        if (filterType === 'CRISIS') {
            reportsWhere.reason = { contains: 'crisis', mode: 'insensitive' };
        } else if (filterType === 'DOXXING') {
            reportsWhere.reason = { contains: 'doxx', mode: 'insensitive' };
        }

        const [reports, totalMatchingReports] = await Promise.all([
            prisma.sanctuaryReport.findMany({
                where: reportsWhere,
                include: {
                    session: {
                        include: {
                            messages: {
                                take: 30,
                                orderBy: { createdAt: 'desc' }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.sanctuaryReport.count({ where: reportsWhere })
        ]);

        // 3. Resolve all involved school metadata in bulk
        const schoolIds = new Set<string>();
        recentSessions.forEach(s => {
            if (s.userASchoolId) schoolIds.add(s.userASchoolId);
            if (s.userBSchoolId) schoolIds.add(s.userBSchoolId);
        });
        reports.forEach(r => {
            if (r.session.userASchoolId) schoolIds.add(r.session.userASchoolId);
            if (r.session.userBSchoolId) schoolIds.add(r.session.userBSchoolId);
        });

        const schools = await prisma.school.findMany({
            where: { id: { in: Array.from(schoolIds) } },
            select: { id: true, name: true, schoolCode: true, status: true }
        });
        const schoolsMap = new Map(schools.map(s => [s.id, s]));

        // Fetch all available schools for SuperAdmin dropdown
        const allRegisteredSchools = isSuperAdmin 
            ? await prisma.school.findMany({ select: { id: true, name: true, schoolCode: true }, orderBy: { name: 'asc' } })
            : [];

        // 4. Enrich reports with topology and safety classifications
        const enrichedReports = reports.map(r => {
            const isIntra = r.session.userASchoolId === r.session.userBSchoolId;
            const schoolA = schoolsMap.get(r.session.userASchoolId) || { id: r.session.userASchoolId, name: 'Unknown Campus', schoolCode: 'UNK' };
            const schoolB = r.session.userBSchoolId ? (schoolsMap.get(r.session.userBSchoolId) || { id: r.session.userBSchoolId, name: 'Unknown Campus', schoolCode: 'UNK' }) : null;

            // Determine if transcript contains redacted doxxing tokens or crisis keywords
            const messages = [...r.session.messages].reverse();
            let hasDoxxing = false;
            let hasCrisis = false;

            messages.forEach(m => {
                if (m.content.includes('[NUMBER_FILTERED]') || m.content.includes('[CONTACT_FILTERED]') || m.content.includes('[HANDLE_FILTERED]') || m.content.includes('[OFF_PLATFORM_CONTACT_FILTERED]')) {
                    hasDoxxing = true;
                }
                if (m.content.toLowerCase().includes('suicide') || m.content.toLowerCase().includes('kill myself') || m.content.toLowerCase().includes('self harm')) {
                    hasCrisis = true;
                }
            });

            return {
                id: r.id,
                sessionId: r.sessionId,
                reason: r.reason,
                reporterId: r.reporterId,
                reportedId: r.reportedId,
                createdAt: r.createdAt,
                topology: {
                    type: isIntra ? 'INTRA_CAMPUS' : 'CROSS_CAMPUS',
                    schoolA,
                    schoolB,
                    label: isIntra ? `Internal Campus // ${schoolA.name}` : `Cross-Campus // ${schoolA.name} <-> ${schoolB?.name || 'Pending'}`
                },
                threatAnalysis: {
                    hasDoxxing,
                    hasCrisis,
                    severity: hasCrisis ? 'CRITICAL' : hasDoxxing ? 'HIGH' : 'STANDARD'
                },
                session: {
                    id: r.session.id,
                    mode: r.session.mode,
                    status: r.session.status,
                    userAPseudo: r.session.userAPseudo,
                    userARole: r.session.userARole,
                    userBPseudo: r.session.userBPseudo,
                    userBRole: r.session.userBRole,
                    createdAt: r.session.createdAt,
                    messages: messages.map(m => ({
                        id: m.id,
                        senderName: m.senderName,
                        senderRole: m.senderRole,
                        content: m.content,
                        createdAt: m.createdAt
                    }))
                }
            };
        });

        return NextResponse.json({
            success: true,
            telemetry: {
                totalActiveSessions,
                totalFlaggedSessions,
                intraCampusCount,
                crossCampusCount,
                allReportsCount,
                scope: isSuperAdmin ? (effectiveSchoolId ? `School: ${effectiveSchoolId}` : 'Global Network') : `Campus: ${user.schoolId}`
            },
            reports: enrichedReports,
            pagination: {
                page,
                limit,
                total: totalMatchingReports,
                totalPages: Math.ceil(totalMatchingReports / limit)
            },
            availableSchools: allRegisteredSchools
        });

    } catch (err: any) {
        { const bad = clientDataError(err); if (bad) return bad; }
        console.error('[Sanctuary Moderation API Error]:', err.message);
        return NextResponse.json(
            { error: publicErrorMessage(err, 'Internal failure') },
            { status: err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}
