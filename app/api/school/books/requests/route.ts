import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolLinked, handleApiError } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");

        // Directors see all requests for the school, others see only their own
        const isDirector = dbUser.role === 'PRINCIPAL' || dbUser.role === 'SUPERADMIN';

        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Fetch school users
            const { data: usersData } = await supabaseAdmin
                .from('User')
                .select('id, name, role')
                .eq('schoolId', dbUser.schoolId);

            const userMap = new Map((usersData || []).map((u: any) => [u.id, u]));

            let query = supabaseAdmin
                .from('BookRequest')
                .select('*')
                .eq('schoolId', dbUser.schoolId)
                .order('createdAt', { ascending: false });

            if (!isDirector) {
                query = query.eq('userId', dbUser.id);
            }

            const { data: rawRequests, error } = await query;
            if (error) throw error;

            let requests = rawRequests || [];

            if (dbUser.role === 'PARENT') {
                const { data: links } = await supabaseAdmin
                    .from('ParentStudentLink')
                    .select('*, student:Student(*, grade:Grade(*))')
                    .eq('parentId', dbUser.id);

                if (studentId) {
                    const link = (links || []).find((l: any) => l.studentId === studentId);
                    if (link) {
                        const gradeLevelStr = `Grade ${link.student.grade.level}`.toLowerCase();
                        const gradeNameStr = link.student.grade.name.toLowerCase();
                        const studentUserId = link.student.userId;

                        requests = requests.filter((r: any) => {
                            const matchesUser = studentUserId && r.userId === studentUserId;
                            const matchesGradeLevel = r.grade && r.grade.toLowerCase() === gradeLevelStr;
                            const matchesGradeName = r.grade && r.grade.toLowerCase() === gradeNameStr;
                            return matchesUser || matchesGradeLevel || matchesGradeName;
                        });
                    } else {
                        requests = [];
                    }
                } else {
                    const gradeNames = (links || []).flatMap((l: any) => [
                        `Grade ${l.student.grade.level}`.toLowerCase(),
                        l.student.grade.name.toLowerCase()
                    ]);

                    requests = requests.filter((r: any) => {
                        const matchesUser = r.userId === dbUser.id;
                        const matchesGrade = r.grade && gradeNames.includes(r.grade.toLowerCase());
                        return matchesUser || matchesGrade;
                    });
                }
            }

            const mappedRequests = requests.map((r: any) => ({
                ...r,
                user: userMap.get(r.userId) || null
            }));

            return NextResponse.json(mappedRequests);
        }

        let whereClause: any = {
            schoolId: dbUser.schoolId!,
            ...(!isDirector && { userId: dbUser.id })
        };

        if (studentId && dbUser.role === 'PARENT') {
            const link = await prisma.parentStudentLink.findFirst({
                where: { parentId: dbUser.id, studentId: studentId },
                include: { student: { include: { grade: true } } }
            });
            if (link) {
                // Return requests by the student's user OR matching their grade level
                whereClause = {
                    schoolId: dbUser.schoolId!,
                    OR: [
                        { userId: link.student.userId || 'none' },
                        { grade: { equals: `Grade ${link.student.grade.level}`, mode: 'insensitive' } },
                        { grade: { equals: link.student.grade.name, mode: 'insensitive' } }
                    ]
                };
            }
        } else if (dbUser.role === 'PARENT' && !studentId) {
            // Show all requests matching ANY of their children's grades
            const links = await prisma.parentStudentLink.findMany({
                where: { parentId: dbUser.id },
                include: { student: { include: { grade: true } } }
            });
            const gradeNames = links.flatMap(l => [
                `Grade ${l.student.grade.level}`,
                l.student.grade.name
            ]);
            whereClause = {
                schoolId: dbUser.schoolId!,
                OR: [
                    { userId: dbUser.id },
                    { grade: { in: gradeNames, mode: 'insensitive' } }
                ]
            };
        }

        const requests = await prisma.bookRequest.findMany({
            where: whereClause,
            include: {
                user: { select: { name: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(requests);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const body = await req.json();
        const { title, subject, grade, reason } = body;

        if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: request, error } = await supabaseAdmin
                .from('BookRequest')
                .insert({
                    schoolId: dbUser.schoolId!,
                    userId: dbUser.id,
                    title,
                    subject,
                    grade,
                    reason
                })
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json(request);
        }

        const request = await prisma.bookRequest.create({
            data: {
                schoolId: dbUser.schoolId!,
                userId: dbUser.id,
                title,
                subject,
                grade,
                reason
            }
        });

        return NextResponse.json(request);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PATCH(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        // Only Directors can update status
        const isDirector = dbUser.role === 'PRINCIPAL' || dbUser.role === 'SUPERADMIN';
        if (!isDirector) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) return NextResponse.json({ error: "Resource ID and status required" }, { status: 400 });

        const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'];
        if (!validStatuses.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: request, error } = await supabaseAdmin
                .from('BookRequest')
                .update({ status })
                .eq('id', id)
                .eq('schoolId', dbUser.schoolId!)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json(request);
        }

        const request = await prisma.bookRequest.update({
            where: {
                id,
                schoolId: dbUser.schoolId! // Security: ensure it belongs to the school
            },
            data: { status }
        });

        return NextResponse.json(request);
    } catch (error) {
        return handleApiError(error);
    }
}
