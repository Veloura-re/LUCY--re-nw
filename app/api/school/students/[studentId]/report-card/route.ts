import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/security";
import { verifyStudentSignature } from "@/lib/student-id-security";
import { canViewStudent } from "@/lib/student-access";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ studentId: string }> }
) {
    try {
        let dbUser: any = null;
        let authUserId: string | null = null;
        try {
            const authUser = await requireAuth();
            authUserId = authUser.id;
        } catch {
            // Anonymous caller: only the signed public verification path is allowed below.
        }

        if (authUserId) {
            dbUser = await prisma.user.findUnique({
                where: { id: authUserId },
                select: { id: true, role: true, schoolId: true }
            });
            if (!dbUser) {
                return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
            }
        }

        const { studentId } = await params;

        // 1. Student lookup. Authenticated lookups are tenant-scoped; anonymous lookups are
        // resolved strictly by id and must carry a valid signature (see below).
        const studentInclude = {
            school: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    address: true
                }
            },
            grade: true,
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

        // ---- Anonymous public verification (signed QR credential) ----
        if (!dbUser) {
            const url = new URL(request.url);
            const sid = url.searchParams.get("sid") || "";
            const sig = url.searchParams.get("sig") || "";
            if (!sid || !sig) {
                return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
            }

            const publicStudent = await prisma.student.findUnique({
                where: { id: studentId },
                include: {
                    school: { select: { id: true, name: true, logoUrl: true } },
                    class: { include: { grade: true } }
                }
            });

            if (
                !publicStudent ||
                publicStudent.schoolId !== sid ||
                !verifyStudentSignature(publicStudent.id, publicStudent.schoolId, sig)
            ) {
                return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
            }

            const publicAttendance = await prisma.attendanceRecord.findMany({
                where: { studentId: publicStudent.id },
                select: { status: true }
            });
            const publicPresent = publicAttendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
            const publicAbsent = publicAttendance.filter((a) => a.status === "ABSENT").length;

            return NextResponse.json({
                student: {
                    id: publicStudent.id,
                    firstName: publicStudent.firstName,
                    lastName: publicStudent.lastName,
                    studentCode: publicStudent.studentCode,
                    photoUrl: publicStudent.photoUrl,
                    school: publicStudent.school,
                    class: publicStudent.class
                        ? { name: publicStudent.class.name, grade: { name: publicStudent.class.grade?.name ?? null } }
                        : null
                },
                userRole: "GUEST",
                canEditRemarks: false,
                attendance: {
                    rate: publicAttendance.length > 0 ? Math.round((publicPresent / publicAttendance.length) * 100) : 0,
                    present: publicPresent,
                    absent: publicAbsent,
                    total: publicAttendance.length
                }
            });
        }

        // ---- Authenticated path ----
        const isSuperAdmin = dbUser.role === "SUPERADMIN";
        const tenantScope = isSuperAdmin ? {} : { schoolId: dbUser.schoolId ?? "__no_school__" };

        let student: any = null;

        if (studentId === "me") {
            if (dbUser.role === "STUDENT") {
                student = await prisma.student.findFirst({
                    where: { userId: dbUser.id, ...tenantScope },
                    include: studentInclude
                });
            } else if (dbUser.role === "PARENT") {
                const link = await prisma.parentStudentLink.findFirst({
                    where: { parentId: dbUser.id }
                });
                if (link?.studentId) {
                    student = await prisma.student.findFirst({
                        where: { id: link.studentId, ...tenantScope },
                        include: studentInclude
                    });
                }
            }
        } else {
            student = await prisma.student.findFirst({
                where: {
                    ...tenantScope,
                    OR: [
                        { id: studentId },
                        { userId: studentId },
                        { studentCode: { equals: studentId, mode: "insensitive" } }
                    ]
                },
                include: studentInclude
            });
        }

        if (!student) {
            return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
        }

        // Per-record authorization
        const authorized = await canViewStudent(dbUser, student);
        if (!authorized) {
            // Indistinguishable from "not found" to prevent enumeration.
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

        // 5. Homeroom / Staff Editing Authorization
        let canEditRemarks = false;
        if (dbUser) {
            if (['SUPERADMIN', 'PRINCIPAL', 'OWNER'].includes(dbUser.role)) {
                canEditRemarks = true;
            } else if (student.classId) {
                const isAssigned = await prisma.teacherAssignment.findFirst({
                    where: { teacherId: dbUser.id, classId: student.classId }
                });
                canEditRemarks = Boolean(isAssigned);
            }
        }

        // Parents and students must not see staff contact details or internal staff notes.
        const isStaff = ["SUPERADMIN", "OWNER", "PRINCIPAL", "TEACHER", "HOMEROOM"].includes(dbUser.role);
        const sanitizedStudent = isStaff
            ? student
            : {
                ...student,
                parentLinks: dbUser.role === "PARENT"
                    ? student.parentLinks.filter((l: any) => l.parentId === dbUser.id)
                    : []
            };

        return NextResponse.json({
            student: sanitizedStudent,
            principal,
            term: termData,
            grades,
            userRole: dbUser.role,
            canEditRemarks,
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
            internalNotes: isStaff ? internalNotes : []
        });
    } catch (e) {
        return handleApiError(e);
    }
}
