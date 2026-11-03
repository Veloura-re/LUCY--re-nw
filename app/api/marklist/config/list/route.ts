import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolLinked, handleApiError, clampLimit, clampPage } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        const schoolId = dbUser.schoolId!;

        const { searchParams } = new URL(req.url);
        const page = clampPage(searchParams.get('page'));
        const limit = clampLimit(searchParams.get('limit'), 50);
        const termStatus = searchParams.get('termStatus') || 'all'; // 'active' | 'finished' | 'all'
        const termId = searchParams.get('termId');
        const search = searchParams.get('search')?.trim() || '';
        const scope = searchParams.get('scope'); // 'mine' or undefined
        const skip = (page - 1) * limit;

        // Fetch current active term and all finished terms for this school
        const [activeTerm, allTerms] = await Promise.all([
            prisma.academicTerm.findFirst({
                where: { schoolId, isActive: true }
            }),
            prisma.academicTerm.findMany({
                where: { schoolId },
                include: {
                    _count: {
                        select: { marklists: true }
                    }
                },
                orderBy: { startDate: 'desc' }
            })
        ]);

        const finishedTerms = allTerms.filter(t => !t.isActive || (t.endDate && new Date() > new Date(t.endDate)));

        // Base where condition
        const where: any = { schoolId };

        // Term filter
        if (termId && termId !== 'all') {
            where.termId = termId;
        } else if (termStatus === 'active') {
            if (activeTerm) {
                where.OR = [
                    { termId: activeTerm.id },
                    { term: { isActive: true } }
                ];
            } else {
                where.term = { isActive: true };
            }
        } else if (termStatus === 'finished') {
            const finishedTermIds = finishedTerms.map(t => t.id);
            if (finishedTermIds.length > 0) {
                where.OR = [
                    { termId: { in: finishedTermIds } },
                    { term: { isActive: false } }
                ];
            } else {
                where.term = { isActive: false };
            }
        }

        // Search filter
        if (search) {
            const searchClause = [
                { class: { name: { contains: search, mode: 'insensitive' } } },
                { subject: { name: { contains: search, mode: 'insensitive' } } }
            ];
            if (where.OR) {
                where.AND = [
                    { OR: where.OR },
                    { OR: searchClause }
                ];
                delete where.OR;
            } else {
                where.OR = searchClause;
            }
        }

        // Teacher assignments prefetch for authorization computation
        let teacherClassIds: string[] = [];
        let teacherAssignmentPairs: { classId: string; subjectId: string | null }[] = [];
        let timetablePairs: { classId: string; subjectId: string | null }[] = [];

        if (['TEACHER', 'HOMEROOM'].includes(dbUser.role)) {
            const [homeroomClasses, assignments, timetables] = await Promise.all([
                prisma.class.findMany({
                    where: { schoolId, homeroomTeacherId: dbUser.id },
                    select: { id: true }
                }),
                prisma.teacherAssignment.findMany({
                    where: { teacherId: dbUser.id },
                    select: { classId: true, subjectId: true }
                }),
                prisma.timetable.findMany({
                    where: { teacherId: dbUser.id },
                    select: { classId: true, subjectId: true }
                })
            ]);

            teacherClassIds = homeroomClasses.map(c => c.id);
            teacherAssignmentPairs = assignments;
            timetablePairs = timetables;

            // If scope === 'mine', restrict strictly to teacher's marklists
            if (scope === 'mine') {
                const assignedClassIds = Array.from(new Set([
                    ...teacherClassIds,
                    ...teacherAssignmentPairs.map(a => a.classId),
                    ...timetablePairs.map(t => t.classId)
                ]));

                const teacherCondition = [
                    { teacherId: dbUser.id },
                    { classId: { in: assignedClassIds } }
                ];

                if (where.AND) {
                    where.AND.push({ OR: teacherCondition });
                } else if (where.OR) {
                    where.AND = [
                        { OR: where.OR },
                        { OR: teacherCondition }
                    ];
                    delete where.OR;
                } else {
                    where.OR = teacherCondition;
                }
            }
        }

        const [configs, total] = await Promise.all([
            prisma.marklistConfig.findMany({
                where,
                skip,
                take: limit,
                include: {
                    class: {
                        select: {
                            id: true,
                            name: true,
                            homeroomTeacherId: true
                        }
                    },
                    subject: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    teacher: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    term: {
                        select: {
                            id: true,
                            name: true,
                            isActive: true,
                            startDate: true,
                            endDate: true
                        }
                    },
                    columns: { select: { id: true, title: true, maxMarks: true } },
                    _count: {
                        select: {
                            entries: true,
                            columns: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            }),
            prisma.marklistConfig.count({ where })
        ]);

        // Augment each config with permission & live status flags
        const enrichedConfigs = configs.map(conf => {
            let isTermCompleted = false;
            let isLiveTerm = false;

            if (conf.term) {
                const pastEndDate = conf.term.endDate ? new Date() > new Date(conf.term.endDate) : false;
                isTermCompleted = !conf.term.isActive || pastEndDate;
                isLiveTerm = conf.term.isActive && !pastEndDate;
            } else if (activeTerm) {
                isLiveTerm = true;
            } else if (finishedTerms.length > 0) {
                isTermCompleted = true;
            }

            let canEdit = true;
            if (['TEACHER', 'HOMEROOM'].includes(dbUser.role)) {
                if (isTermCompleted || conf.isLocked) {
                    canEdit = false;
                } else {
                    const isConfigTeacher = conf.teacherId === dbUser.id;
                    const isHomeroom = conf.class?.homeroomTeacherId === dbUser.id;
                    const hasSubjectAssignment = teacherAssignmentPairs.some(
                        a => a.classId === conf.classId && (!a.subjectId || a.subjectId === conf.subjectId)
                    );
                    const hasTimetable = timetablePairs.some(
                        t => t.classId === conf.classId && (!t.subjectId || t.subjectId === conf.subjectId)
                    );

                    canEdit = isConfigTeacher || isHomeroom || hasSubjectAssignment || hasTimetable;
                }
            }

            return {
                ...conf,
                isLiveTerm,
                isTermCompleted,
                canEdit
            };
        });

        return NextResponse.json({
            configs: enrichedConfigs,
            activeTerm,
            finishedTerms,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}
