import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    console.log('--- STARTING DATABASE RESET ---');

    // 1. CLEANUP ALL TABLES (Order is important for FK constraints)
    console.log('Cleaning up tables...');
    
    // We can use $executeRawUnsafe for a quick wipe if we trust the order,
    // or just use prisma deleteMany.
    const tables = [
        'Payment', 'InvoiceItem', 'Invoice', 'FeeStructure',
        'MarklistMark', 'MarklistEntry', 'MarklistColumn', 'MarklistConfig',
        'AttendanceRecord', 'ExamAttempt', 'GradeRecord', 'Exam',
        'AssignmentSubmission', 'Assignment', 'Lesson', 'Timetable',
        'TeacherAssignment', 'StudentRemark', 'InternalNote', 'ParentStudentLink',
        'ResourceProgress', 'UnitPackResource', 'UnitPack', 'BookRequest', 'Book',
        'ChatRoomMember', 'Message', 'ChatRoom', 'StaffAttendanceRecord',
        'StaffPayrollItem', 'StaffPayroll', 'Student', 'Period', 'Class', 'Grade',
        'Subject', 'Event', 'AbsenceAuthorization', 'InviteToken', 'AuditLog'
    ];

    for (const table of tables) {
        try {
            await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany({});
            console.log(`  ✓ Cleared ${table}`);
        } catch (e) {
            console.warn(`  ! Skip ${table} (maybe doesn't exist or empty)`);
        }
    }

    // Special handling for User (Keep Superadmins?)
    // User said "delete all schools", so we keep global superadmins but wipe others.
    await prisma.user.deleteMany({
        where: { role: { not: 'SUPERADMIN' } }
    });
    console.log('  ✓ Cleared Users (except SUPERADMIN)');

    await prisma.school.deleteMany({});
    console.log('  ✓ Cleared Schools');

    console.log('--- CREATING NEW INFRASTRUCTURE ---');

    // 2. CREATE NEW SCHOOL
    const school = await prisma.school.create({
        data: {
            name: 'New Genesis Academy',
            schoolCode: 'GENESIS-01',
            status: 'ACTIVE',
            attendanceConfig: { type: 'PERIOD', lockAfterMinutes: 30, enableLateMarking: true }
        }
    });
    console.log(`✓ School Created: ${school.name} (${school.schoolCode})`);

    // 3. CREATE ACCOUNTS
    const accounts = [
        { email: 'admin@genesis.edu', name: 'Genesis Admin', role: 'PRINCIPAL', password: 'Password123!' },
        { email: 'teacher@genesis.edu', name: 'John Teacher', role: 'TEACHER', password: 'Password123!' },
        { email: 'student@genesis.edu', name: 'Alice Student', role: 'STUDENT', password: 'Password123!' },
    ];

    const grade = await prisma.grade.create({
        data: { schoolId: school.id, name: 'Grade 10', level: 10 }
    });
    const cls = await prisma.class.create({
        data: { gradeId: grade.id, name: '10-A' }
    });

    for (const acc of accounts) {
        console.log(`Processing ${acc.role}: ${acc.email}...`);
        
        // A. Supabase Auth
        const { data } = await supabase.auth.admin.listUsers();
        const users = data?.users || [];
        let authUser = users.find((u: any) => u.email === acc.email);

        if (authUser) {
            await supabase.auth.admin.deleteUser(authUser.id);
            console.log(`  ✓ Deleted existing auth user: ${acc.email}`);
        }

        const { data: { user: newUser }, error } = await supabase.auth.admin.createUser({
            email: acc.email,
            password: acc.password,
            email_confirm: true,
            user_metadata: { role: acc.role, name: acc.name }
        });

        if (error) {
            console.error(`  ! Error creating auth user ${acc.email}:`, error.message);
            continue;
        }

        // B. Prisma Public User
        const dbUser = await prisma.user.create({
            data: {
                id: newUser!.id,
                email: acc.email,
                name: acc.name,
                role: acc.role as any,
                schoolId: school.id,
                verified: true
            }
        });

        // C. Role Specific Setup
        if (acc.role === 'STUDENT') {
            await prisma.student.create({
                data: {
                    userId: dbUser.id,
                    schoolId: school.id,
                    gradeId: grade.id,
                    classId: cls.id,
                    firstName: 'Alice',
                    lastName: 'Student',
                    studentCode: 'STU001',
                    enrollmentStatus: 'ACTIVE'
                }
            });
            console.log('  ✓ Created Student Record');
        }

        console.log(`  ✓ Created ${acc.role} in Auth and Prisma`);
    }

    console.log('--- RESET COMPLETE ---');
    console.log('Credentials:');
    console.log('  Admin: admin@genesis.edu / Password123!');
    console.log('  Teacher: teacher@genesis.edu / Password123!');
    console.log('  Student: student@genesis.edu / Password123!');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
