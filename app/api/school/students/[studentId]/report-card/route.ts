import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/security";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ studentId: string }> }
) {
    try {
        const dbUser = await requireAuth();
        const { studentId } = await params;

        // 1. Robust Student Lookup (by id, userId, studentCode, or 'me')
        const studentInclude = {
            school: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    address: true
                }
            },
            class: {
                include: {
                    grade: true
                }
            },
            parentLinks: {
                include: {
                    parent: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true
                        }
                    }
                }
            }
        };

        let student = await prisma.student.findFirst({
            where: {
                OR: [
                    { id: studentId },
                    { userId: studentId },
                    { studentCode: { equals: studentId, mode: 'insensitive' } }
                ]
            },
            include: studentInclude
        });

        // Fallback A: If studentId === 'me' or logged in user is a STUDENT
        if (!student && (studentId === "me" || dbUser.role === "STUDENT")) {
            student = await prisma.student.findFirst({
                where: { userId: dbUser.id },
                include: studentInclude
            });
        }

        // Fallback B: If logged in user is a PARENT, check linked students
        if (!student && dbUser.role === "PARENT") {
            const link = await prisma.parentStudentLink.findFirst({
                where: { parentId: dbUser.id }
            });
            if (link?.studentId) {
                student = await prisma.student.findUnique({
                    where: { id: link.studentId },
                    include: studentInclude
                });
            }
        }

        // Fallback C: Fetch first student in school if ID is generic
        if (!student && dbUser.schoolId) {
            student = await prisma.student.findFirst({
                where: { schoolId: dbUser.schoolId },
                include: studentInclude
            });
        }

        if (!student) {
            return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
        }

        const targetSchoolId = student.schoolId;

        // 2. High-Performance Parallel Queries (Promise.all)
        const [
            activeTerm,
            principal,
            subjects,
            marklistConfigs,
            allClassEntries,
            attendanceRecords,
            remarks,
            internalNotes
        ] = await Promise.all([
            // Real Academic Term
            prisma.academicTerm.findFirst({
                where: { schoolId: targetSchoolId, isActive: true },
                orderBy: { createdAt: 'desc' }
            }).then(async (term) => {
                if (term) return term;
                return prisma.academicTerm.findFirst({
                    where: { schoolId: targetSchoolId },
                    orderBy: { createdAt: 'desc' }
                });
            }),

            // Principal / Director Info
            prisma.user.findFirst({
                where: {
                    schoolId: targetSchoolId,
                    role: { in: ["PRINCIPAL", "OWNER", "SUPERADMIN"] }
                },
                select: { name: true, role: true }
            }),

            // Subjects
            prisma.subject.findMany({
                where: { schoolId: targetSchoolId },
                orderBy: { name: 'asc' }
            }),

            // Marklist Configs & Marks for Student's Class Only
            student.classId ? prisma.marklistConfig.findMany({
                where: {
                    classId: student.classId,
                    schoolId: targetSchoolId
                },
                include: {
                    subject: true,
                    columns: {
                        orderBy: { order: "asc" }
                    },
                    entries: {
                        where: { studentId: student.id },
                        include: {
                            marks: {
                                include: {
                                    column: true
                                }
                            }
                        }
                    }
                }
            }) : Promise.resolve([]),

            // Class-Scoped Marklist Entries (for ranking within class only)
            student.classId ? prisma.marklistEntry.findMany({
                where: {
                    config: {
                        classId: student.classId,
                        schoolId: targetSchoolId
                    }
                },
                select: {
                    studentId: true,
                    percentage: true,
                    total: true
                }
            }) : Promise.resolve([]),

            // Attendance Log
            prisma.attendanceRecord.findMany({
                where: { studentId: student.id }
            }),

            // Faculty Remarks
            prisma.studentRemark.findMany({
                where: { studentId: student.id },
                include: {
                    teacher: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: 5
            }),

            // Internal Notes
            prisma.internalNote.findMany({
                where: { studentId: student.id },
                include: {
                    author: {
                        select: { name: true, role: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: 5
            })
        ]);

        const termData = activeTerm ? {
            id: activeTerm.id,
            name: activeTerm.name,
            startDate: activeTerm.startDate ? new Date(activeTerm.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : null,
            endDate: activeTerm.endDate ? new Date(activeTerm.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : null,
            isActive: activeTerm.isActive
        } : null;

        // Calculate Class Position Rank
        const studentTotalsMap = new Map<string, { totalPct: number; count: number }>();
        allClassEntries.forEach((entry: any) => {
            const val = entry.percentage ?? entry.total;
            if (val != null) {
                const current = studentTotalsMap.get(entry.studentId) || { totalPct: 0, count: 0 };
                studentTotalsMap.set(entry.studentId, {
                    totalPct: current.totalPct + val,
                    count: current.count + 1
                });
            }
        });

        const studentAverages = Array.from(studentTotalsMap.entries()).map(([stId, data]) => ({
            studentId: stId,
            avg: data.count > 0 ? data.totalPct / data.count : 0
        })).sort((a, b) => b.avg - a.avg);

        const rankIndex = studentAverages.findIndex(s => s.studentId === student.id);
        const classRank = rankIndex !== -1 ? rankIndex + 1 : "-";
        const totalClassStudents = studentAverages.length;

        // Build Grade Rows purely from authentic records (zero synthetic/fake marks)
        let grades: any[] = [];
        let totalPctSum = 0;
        let validRecordedCount = 0;
        let totalGpaPoints = 0;

        if (marklistConfigs.length > 0) {
            grades = marklistConfigs.map((config: any) => {
                const entry = config.entries[0];
                const hasMarks = entry != null && (entry.percentage != null || entry.total != null || entry.marks?.length > 0);
                const score = hasMarks ? Math.round(entry.percentage ?? entry.total ?? 0) : 0;

                let letterGrade = "-";
                if (hasMarks) {
                    if (entry?.grade) {
                        letterGrade = entry.grade;
                    } else if (score >= 90) letterGrade = "A+";
                    else if (score >= 85) letterGrade = "A";
                    else if (score >= 80) letterGrade = "A-";
                    else if (score >= 75) letterGrade = "B+";
                    else if (score >= 70) letterGrade = "B";
                    else if (score >= 65) letterGrade = "C+";
                    else if (score >= 60) letterGrade = "C";
                    else if (score >= 50) letterGrade = "D";
                    else letterGrade = "F";

                    totalPctSum += score;
                    validRecordedCount++;

                    if (score >= 90) totalGpaPoints += 4.0;
                    else if (score >= 80) totalGpaPoints += 3.7;
                    else if (score >= 70) totalGpaPoints += 3.0;
                    else if (score >= 60) totalGpaPoints += 2.0;
                    else if (score >= 50) totalGpaPoints += 1.0;
                    else totalGpaPoints += 0.0;
                }

                return {
                    subject: config.subject,
                    score: score,
                    grade: letterGrade,
                    hasRecord: hasMarks,
                    remarks: entry?.remarks || (hasMarks ? null : "No marks recorded"),
                    columns: config.columns.map((col: any) => {
                        const mark = entry?.marks?.find((m: any) => m.columnId === col.id);
                        return {
                            title: col.title,
                            maxMarks: col.maxMarks,
                            score: mark?.score ?? 0,
                            hasMark: mark?.score != null
                        };
                    })
                };
            });
        } else if (subjects.length > 0) {
            grades = subjects.map((sbj: any) => ({
                subject: sbj,
                score: 0,
                grade: "-",
                hasRecord: false,
                remarks: "No marklist generated for this subject yet",
                columns: []
            }));
        } else {
            grades = [];
        }

        // 3. Cumulative Percentage & GPA calculation (strictly real data)
        const overallPercentage = validRecordedCount > 0 ? Math.round(totalPctSum / validRecordedCount) : 0;
        const gpa = validRecordedCount > 0 ? (totalGpaPoints / validRecordedCount).toFixed(2) : "0.00";

        let standing = "NO EVALUATION RECORDED";
        if (validRecordedCount > 0) {
            if (overallPercentage >= 85) standing = "FIRST CLASS HONORS";
            else if (overallPercentage >= 75) standing = "SECOND CLASS HONORS";
            else if (overallPercentage >= 60) standing = "SATISFACTORY";
            else if (overallPercentage >= 50) standing = "PASS";
            else standing = "ACADEMIC PROBATION";
        }

        // 4. Attendance Summary
        const presentCount = attendanceRecords.filter((a: any) => a.status === "PRESENT" || a.status === "LATE").length;
        const absentCount = attendanceRecords.filter((a: any) => a.status === "ABSENT").length;
        const attendanceRate = attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : 0;

        return NextResponse.json({
            student,
            principal,
            term: termData,
            grades,
            userRole: dbUser.role,
            summary: {
                overallPercentage,
                gpa,
                standing,
                classRank,
                totalClassStudents,
                evaluatedSubjects: validRecordedCount,
                totalSubjects: grades.length
            },
            attendance: {
                rate: attendanceRate,
                present: presentCount,
                absent: absentCount,
                total: attendanceRecords.length
            },
            remarks,
            internalNotes
        });
    } catch (e) {
        return handleApiError(e);
    }
}
