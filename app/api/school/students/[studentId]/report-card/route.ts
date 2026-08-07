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

        // 1. Flexible Student Discovery (by id, userId, or studentCode)
        let student = await prisma.student.findFirst({
            where: {
                OR: [
                    { id: studentId },
                    { userId: studentId },
                    { studentCode: studentId }
                ]
            },
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true,
                        address: true,
                        phone: true,
                        email: true
                    }
                },
                class: {
                    include: {
                        grade: true
                    }
                }
            }
        });

        // Fallback: If user passed 'me' or studentId matches logged in user's ID
        if (!student && (studentId === "me" || dbUser.role === "STUDENT")) {
            student = await prisma.student.findFirst({
                where: { userId: dbUser.id },
                include: {
                    school: {
                        select: {
                            id: true,
                            name: true,
                            logoUrl: true,
                            address: true,
                            phone: true,
                            email: true
                        }
                    },
                    class: {
                        include: {
                            grade: true
                        }
                    }
                }
            });
        }

        if (!student) {
            return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
        }

        const targetSchoolId = student.schoolId;

        // 2. Fetch Principal / Director Name
        const principal = await prisma.user.findFirst({
            where: {
                schoolId: targetSchoolId,
                role: { in: ["PRINCIPAL", "OWNER", "SUPERADMIN"] }
            },
            select: { name: true, role: true }
        });

        // 3. Fetch Marklist Entries across all subjects for this student's class
        const marklistConfigs = await prisma.marklistConfig.findMany({
            where: {
                classId: student.classId || "",
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
        });

        // Also fetch all entries in the class to compute Class Position Rank
        const allClassEntries = await prisma.marklistEntry.findMany({
            where: {
                config: {
                    classId: student.classId || "",
                    schoolId: targetSchoolId
                }
            },
            select: {
                studentId: true,
                percentage: true,
                total: true
            }
        });

        // Calculate cumulative totals per student in the class to determine rank
        const studentTotalsMap = new Map<string, { totalPct: number; count: number }>();
        allClassEntries.forEach(entry => {
            if (entry.percentage != null) {
                const current = studentTotalsMap.get(entry.studentId) || { totalPct: 0, count: 0 };
                studentTotalsMap.set(entry.studentId, {
                    totalPct: current.totalPct + entry.percentage,
                    count: current.count + 1
                });
            }
        });

        const studentAverages = Array.from(studentTotalsMap.entries()).map(([stId, data]) => ({
            studentId: stId,
            avg: data.count > 0 ? data.totalPct / data.count : 0
        })).sort((a, b) => b.avg - a.avg);

        const rankIndex = studentAverages.findIndex(s => s.studentId === student.id);
        const classRank = rankIndex !== -1 ? rankIndex + 1 : 1;
        const totalClassStudents = Math.max(studentAverages.length, 1);

        // Map grades & subject breakdowns
        const grades = marklistConfigs.map(config => {
            const entry = config.entries[0];
            const pct = entry?.percentage ?? entry?.total ?? 0;

            let letterGrade = entry?.grade;
            if (!letterGrade) {
                if (pct >= 90) letterGrade = "A+";
                else if (pct >= 85) letterGrade = "A";
                else if (pct >= 80) letterGrade = "A-";
                else if (pct >= 75) letterGrade = "B+";
                else if (pct >= 70) letterGrade = "B";
                else if (pct >= 65) letterGrade = "C+";
                else if (pct >= 60) letterGrade = "C";
                else if (pct >= 50) letterGrade = "D";
                else letterGrade = "F";
            }

            return {
                subject: config.subject,
                score: Math.round(pct),
                grade: letterGrade,
                remarks: entry?.remarks || null,
                columns: config.columns.map(col => {
                    const mark = entry?.marks.find(m => m.columnId === col.id);
                    return {
                        title: col.title,
                        maxMarks: col.maxMarks,
                        score: mark?.score ?? 0
                    };
                })
            };
        });

        // 4. Calculate GPA & Cumulative Percentage
        let totalPctSum = 0;
        let validSubjectCount = 0;
        let totalGpaPoints = 0;

        grades.forEach(g => {
            totalPctSum += g.score;
            validSubjectCount++;

            if (g.score >= 90) totalGpaPoints += 4.0;
            else if (g.score >= 80) totalGpaPoints += 3.7;
            else if (g.score >= 70) totalGpaPoints += 3.0;
            else if (g.score >= 60) totalGpaPoints += 2.0;
            else if (g.score >= 50) totalGpaPoints += 1.0;
            else totalGpaPoints += 0.0;
        });

        const overallPercentage = validSubjectCount > 0 ? Math.round(totalPctSum / validSubjectCount) : 0;
        const gpa = validSubjectCount > 0 ? (totalGpaPoints / validSubjectCount).toFixed(2) : "0.00";

        // Determine Academic Standing
        let standing = "EXCEL";
        if (overallPercentage >= 85) standing = "FIRST CLASS HONORS";
        else if (overallPercentage >= 75) standing = "SECOND CLASS HONORS";
        else if (overallPercentage >= 60) standing = "SATISFACTORY";
        else if (overallPercentage >= 50) standing = "PASS";
        else standing = "ACADEMIC PROBATION";

        // 5. Fetch Attendance Summary
        const attendanceRecords = await prisma.attendanceRecord.findMany({
            where: { studentId: student.id }
        });

        const presentCount = attendanceRecords.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
        const absentCount = attendanceRecords.filter(a => a.status === "ABSENT").length;
        const totalSessions = Math.max(attendanceRecords.length, 1);

        // 6. Fetch Qualitative Faculty Remarks
        const remarks = await prisma.studentRemark.findMany({
            where: { studentId: student.id },
            include: {
                teacher: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 5
        });

        return NextResponse.json({
            student,
            principal,
            grades,
            summary: {
                overallPercentage,
                gpa,
                standing,
                classRank,
                totalClassStudents
            },
            attendance: {
                present: presentCount,
                absent: absentCount,
                total: totalSessions,
                rate: Math.round((presentCount / totalSessions) * 100)
            },
            remarks: remarks.map(r => ({
                content: r.content,
                teacher: r.teacher
            }))
        });
    } catch (e) {
        return handleApiError(e);
    }
}
