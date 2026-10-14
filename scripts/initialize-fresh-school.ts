import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./_guard').requireWipeConfirmation('initialize-fresh-school');
    console.log('--- Initiating Global Neural Reset & Provisioning (INDEPENDENT SECTIONS) ---');

    const tables = [
        'AbsenceAuthorization', 'AssignmentSubmission', 'Assignment', 'AttendanceRecord', 
        'AuditLog', 'BookRequest', 'Certificate', 'ChatMessage', 'ChatRoomMember', 
        'ChatRoom', 'GradeRecord', 'ExamAttempt', 'Exam', 'InvoiceItem', 'Payment', 
        'Invoice', 'ParentStudentLink', 'MarklistMark', 'MarklistEntry', 'MarklistColumn', 
        'MarklistConfig', 'ResourceProgress', 'UnitPackResource', 'UnitPack', 'Book', 
        'StudentRemark', 'InternalNote', 'Timetable', 'Lesson', 'Period', 
        'TeacherAssignment', 'Event', 'Student', 'Class', 'Subject', 'Grade', 
        'StaffAttendanceRecord', 'StaffPayroll', 'PublicComment', 'InviteToken'
    ];

    for (const table of tables) {
        try {
            const tableKey = table.charAt(0).toLowerCase() + table.slice(1);
            // @ts-ignore
            if (prisma[tableKey]) {
                // @ts-ignore
                await prisma[tableKey].deleteMany({});
                console.log(`Cleared ${table}`);
            }
        } catch (e) {
            console.log(`Skipped ${table}`);
        }
    }

    try {
        await prisma.user.updateMany({
            where: { NOT: { email: 'commander@lucy.edu' } },
            data: { schoolId: null } as any
        });
        await prisma.school.deleteMany({});
        console.log('Neural wipe complete.');
    } catch (e) {}

    // 1. School
    let schoolId = 'school-neural-001-id';
    try {
        const school = await prisma.school.upsert({
            where: { schoolCode: 'NEURAL-001' },
            update: { name: 'Neural Academy of Excellence', status: 'ACTIVE' } as any,
            create: { id: schoolId, name: 'Neural Academy of Excellence', schoolCode: 'NEURAL-001', status: 'ACTIVE' } as any
        });
        schoolId = school.id;
        console.log('School Provisioned.');
    } catch (e) {
        console.error('School Error:', e.message);
    }

    // 2. Users
    const roles = [
        { email: 'commander@lucy.edu', name: 'Neural Commander', role: 'PRINCIPAL' },
        { email: 'teacher@neural.edu', name: 'Professor Neural', role: 'TEACHER' },
        { email: 'parent@neural.edu', name: 'Parent Observation Node', role: 'PARENT' },
        { email: 'student@neural.edu', name: 'Neural Student User', role: 'STUDENT' }
    ];

    for (const u of roles) {
        try {
            await prisma.user.upsert({
                where: { email: u.email },
                update: { role: u.role as any, schoolId, verified: true, name: u.name } as any,
                create: { email: u.email, role: u.role as any, schoolId, verified: true, name: u.name } as any
            });
            console.log(`User Provisioned: ${u.email}`);
        } catch (e) {
            console.error(`User Error (${u.email}):`, e.message);
        }
    }

    // 3. Grade & Class
    let gradeId = 'grade-10-id';
    let classId = 'class-alpha-id';
    try {
        const grade = await prisma.grade.upsert({
            where: { id: gradeId },
            update: { level: 10, name: 'Grade 10', schoolId } as any,
            create: { id: gradeId, level: 10, name: 'Grade 10', schoolId } as any
        });
        gradeId = grade.id;
        
        const teacherUser = await prisma.user.findUnique({ where: { email: 'teacher@neural.edu' } });
        const studentClass = await prisma.class.upsert({
            where: { id: classId },
            update: { name: 'Alpha-1', gradeId, homeroomTeacherId: teacherUser?.id } as any,
            create: { id: classId, name: 'Alpha-1', gradeId, homeroomTeacherId: teacherUser?.id } as any
        });
        classId = studentClass.id;
        console.log('Academic Structure Provisioned.');
    } catch (e) {
        console.error('Academic Structure Error:', e.message);
    }

    // 4. Student & Link
    let studentId = '';
    try {
        const studentUser = await prisma.user.findUnique({ where: { email: 'student@neural.edu' } });
        const student = await prisma.student.upsert({
            where: { studentCode: 'STU-001' },
            update: { firstName: 'Neural', lastName: 'Student', userId: studentUser?.id, schoolId, gradeId, classId } as any,
            create: { studentCode: 'STU-001', firstName: 'Neural', lastName: 'Student', userId: studentUser?.id, schoolId, gradeId, classId } as any
        });
        studentId = student.id;
        
        const parentUser = await prisma.user.findUnique({ where: { email: 'parent@neural.edu' } });
        if (parentUser && studentId) {
            await prisma.parentStudentLink.deleteMany({ where: { parentId: parentUser.id, studentId: studentId } });
            await prisma.parentStudentLink.create({
                data: { 
                    parentId: parentUser.id, 
                    studentId: studentId, 
                    pairingMethod: 'MANUAL',
                    verifiedAt: new Date() 
                } as any
            });
        }
        console.log('Student & Link Provisioned.');
    } catch (e) {
        console.error('Student/Link Error:', e.message);
    }

    // 5. Subjects & TA
    try {
        const subjectNames = ['Mathematics', 'Science', 'Neural Engineering'];
        const teacherUser = await prisma.user.findUnique({ where: { email: 'teacher@neural.edu' } });
        
        for (const name of subjectNames) {
            const s = await prisma.subject.create({
                data: { name, schoolId } as any
            });
            if (teacherUser && classId) {
                await prisma.teacherAssignment.create({
                    data: { teacherId: teacherUser.id, classId, subjectId: s.id } as any
                });
            }
        }
        console.log('Academic Core Provisioned.');
    } catch (e) {
        console.error('Academic Core Error:', e.message);
    }

    // 6. Public Comment
    try {
        await prisma.publicComment.upsert({
            where: { id: 'initial-comment-id' },
            update: {},
            create: { id: 'initial-comment-id', callsign: 'SYSTEM_OBSERVER', message: 'Neural OS transition complete.', approved: true } as any
        });
        console.log('Public Comment Provisioned.');
    } catch (e) {}

    console.log('--- Global Neural Provisioning Complete ---');
}

main().finally(() => prisma.$disconnect());
