import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";
import { logActivity, getIp } from "@/lib/audit";
import { parseScannedQrData, verifyStudentSignature } from "@/lib/student-id-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const currentUser = await requireRole(["TEACHER", "HOMEROOM", "PRINCIPAL", "OWNER", "SUPERADMIN"]);
        const clientIp = getIp(request);

        if (!currentUser.schoolId && currentUser.role !== "SUPERADMIN") {
            return NextResponse.json(
                { error: "Institutional association required to scan student credentials." },
                { status: 403 }
            );
        }

        const body = (await request.json().catch(() => ({}))) as {
            qrData?: string;
            code?: string;
            payload?: string;
        };
        const rawPayload = body.qrData || body.code || body.payload || "";

        if (!rawPayload || typeof rawPayload !== "string") {
            return NextResponse.json(
                { error: "Scan payload cannot be empty." },
                { status: 400 }
            );
        }

        const parsed = parseScannedQrData(rawPayload);
        const candidateId = parsed.studentId;
        const candidateCode = parsed.studentCode;

        if (!candidateId && !candidateCode) {
            return NextResponse.json(
                { error: "Unrecognized QR format. Please scan a valid institutional student badge." },
                { status: 400 }
            );
        }

        // Build search condition
        const orConditions: any[] = [];
        if (candidateId) {
            orConditions.push({ id: candidateId });
        }
        if (candidateCode) {
            orConditions.push({ studentCode: { equals: candidateCode, mode: "insensitive" } });
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const student = await prisma.student.findFirst({
            where: {
                OR: orConditions
            },
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true
                    }
                },
                class: {
                    include: {
                        grade: true
                    }
                },
                grade: true,
                attendanceRecords: {
                    where: {
                        date: {
                            gte: startOfDay,
                            lte: endOfDay
                        }
                    },
                    take: 1,
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        if (!student) {
            return NextResponse.json(
                {
                    success: false,
                    status: "NOT_FOUND",
                    error: "Student credential could not be located in institutional ledger."
                },
                { status: 404 }
            );
        }

        // Multi-Tenant Isolation Verification
        if (currentUser.role !== "SUPERADMIN" && student.schoolId !== currentUser.schoolId) {
            await logActivity({
                userId: currentUser.id,
                schoolId: currentUser.schoolId!,
                action: "CROSS_SCHOOL_SCAN_REJECTED",
                resourceType: "STUDENT_CREDENTIAL",
                resourceId: student.id,
                level: "WARN",
                statusCode: 403,
                path: "/api/school/students/scan",
                after: {
                    attemptedStudentId: student.id,
                    targetSchoolId: student.schoolId,
                    scannerSchoolId: currentUser.schoolId
                },
                ip: clientIp
            });

            return NextResponse.json(
                {
                    success: false,
                    status: "CROSS_SCHOOL_MISMATCH",
                    error: "Cross-School Access Denied: This student credential belongs to a different institution. Identity details cannot be accessed.",
                    schoolMismatch: true
                },
                { status: 403 }
            );
        }

        // Signature validation if signature was present in QR payload
        let signatureValid: boolean | null = null;
        if (parsed.signature && parsed.schoolId) {
            signatureValid = verifyStudentSignature(student.id, student.schoolId, parsed.signature);
        }

        // Record successful scan in institutional audit log
        await logActivity({
            userId: currentUser.id,
            schoolId: currentUser.schoolId || student.schoolId,
            action: "STUDENT_CREDENTIAL_SCANNED",
            resourceType: "STUDENT",
            resourceId: student.id,
            level: "INFO",
            statusCode: 200,
            path: "/api/school/students/scan",
            after: {
                studentCode: student.studentCode,
                scannerRole: currentUser.role,
                signatureVerified: signatureValid
            },
            ip: clientIp
        });

        const todayRecord = student.attendanceRecords[0] || null;

        return NextResponse.json({
            success: true,
            status: "VERIFIED",
            student: {
                id: student.id,
                studentCode: student.studentCode,
                firstName: student.firstName,
                lastName: student.lastName,
                fullName: `${student.firstName} ${student.lastName}`,
                photoUrl: student.photoUrl,
                enrollmentStatus: student.enrollmentStatus,
                gradeName: student.grade?.name || student.class?.grade?.name || "N/A",
                className: student.class?.name || "N/A",
                gender: student.gender || "N/A",
                guardianName: student.guardianName,
                guardianPhone: student.guardianPhone,
                guardianRelation: student.guardianRelation,
                secondaryPhone: student.secondaryPhone,
                enrolledAt: student.enrolledAt,
                dob: student.dob,
                school: student.school
            },
            todayAttendance: todayRecord
                ? {
                      status: todayRecord.status,
                      date: todayRecord.date,
                      reason: todayRecord.reason
                  }
                : null
        });
    } catch (error) {
        return handleApiError(error);
    }
}
