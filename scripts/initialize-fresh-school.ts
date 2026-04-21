import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Initializing Total Neural Reset ---');

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
            // @ts-ignore
            if (prisma[table.charAt(0).toLowerCase() + table.slice(1)]) {
                // @ts-ignore
                await prisma[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany({});
                console.log(`Cleared ${table}`);
            }
        } catch (e) {
            console.log(`Skipped ${table} (dependents might exist or table name mismatch)`);
        }
    }

    // Unlink users from schools
    await prisma.user.updateMany({
        where: { NOT: { email: 'commander@lucy.edu' } },
        data: { schoolId: null }
    });
    
    await prisma.school.deleteMany({});
    console.log('Neural wipe complete.');

    // 2. Create the Primary School
    const school = await prisma.school.create({
        data: {
            name: 'Neural OS Global Academy',
            schoolCode: 'NEURAL-001',
            status: 'ACTIVE',
            address: 'Neural Network Precinct, Sector 7',
        }
    });

    // 3. Create Admin Account
    await prisma.user.upsert({
        where: { email: 'commander@lucy.edu' },
        update: { role: 'PRINCIPAL', schoolId: school.id, verified: true, name: 'Neural Commander' },
        create: { email: 'commander@lucy.edu', role: 'PRINCIPAL', schoolId: school.id, verified: true, name: 'Neural Commander' }
    });

    // 4. Create Teacher Account
    const teacher = await prisma.user.create({
        data: {
            email: 'teacher@neural.edu',
            name: 'Professor Neural',
            role: 'TEACHER',
            schoolId: school.id,
            verified: true
        }
    });

    // 5. Create Grade and Class
    const grade = await prisma.grade.create({
        data: { level: 10, name: 'Grade 10', schoolId: school.id }
    });

    const studentClass = await prisma.class.create({
        data: { name: 'Class Alpha', gradeId: grade.id, homeroomTeacherId: teacher.id }
    });

    // 6. Create Student Account
    await prisma.student.create({
        data: {
            firstName: 'Neural',
            lastName: 'Student',
            studentCode: 'STU-001',
            enrollmentStatus: 'ACTIVE',
            schoolId: school.id,
            gradeId: grade.id,
            classId: studentClass.id
        }
    });

    console.log('--- Neural School Initialization Complete ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
