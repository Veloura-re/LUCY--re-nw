import { prisma } from '@/lib/prisma';

export interface StudentViewer {
    id: string;
    role: string;
    schoolId: string | null;
}

export interface StudentRef {
    id: string;
    schoolId: string;
    userId: string | null;
}

/**
 * Per-record authorization for reading a student's record.
 *
 * - SUPERADMIN: any student.
 * - OWNER, PRINCIPAL, TEACHER, HOMEROOM, RECORDER: students of their own school.
 * - STUDENT: only their own record.
 * - PARENT: only a linked child.
 */
export async function canViewStudent(viewer: StudentViewer, student: StudentRef): Promise<boolean> {
    switch (viewer.role) {
        case 'SUPERADMIN':
            return true;
        case 'OWNER':
        case 'PRINCIPAL':
        case 'TEACHER':
        case 'HOMEROOM':
        case 'RECORDER':
            return Boolean(viewer.schoolId) && student.schoolId === viewer.schoolId;
        case 'STUDENT':
            return student.userId === viewer.id;
        case 'PARENT':
            return Boolean(
                await prisma.parentStudentLink.findFirst({
                    where: { parentId: viewer.id, studentId: student.id },
                    select: { id: true }
                })
            );
        default:
            return false;
    }
}
