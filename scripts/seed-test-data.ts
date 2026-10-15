import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log('Seeding fresh test data...');

    // 1. Create School
    const school = await prisma.school.create({
        data: {
            name: 'Neural Academy of Excellence',
            schoolCode: 'NAE-2026',
            status: 'ACTIVE',
        }
    });
    console.log(`Created School: ${school.name}`);

    // 2. Create Grade & Class
    const grade = await prisma.grade.create({
        data: {
            name: 'Grade 10',
            level: 10,
            schoolId: school.id,
        }
    });
    const class10A = await prisma.class.create({
        data: {
            name: '10-A',
            gradeId: grade.id,
        }
    });
    console.log(`Created Class: ${class10A.name}`);

    // 3. Create Subject
    const math = await prisma.subject.create({
        data: {
            name: 'Mathematics',
            schoolId: school.id,
        }
    });
    console.log(`Created Subject: ${math.name}`);

    // 4. Create Teacher (Auth + Prisma)
    const teacherEmail = 'teacher@lucy.edu';
    const teacherPassword = 'Password123!';
    
    // Create in Supabase Auth
    const { data: teacherAuth, error: teacherError } = await supabase.auth.admin.createUser({
        email: teacherEmail,
        password: teacherPassword,
        email_confirm: true,
        user_metadata: { role: 'TEACHER', name: 'Test Teacher' }
    });

    if (teacherError) {
        console.error('Teacher Auth Error:', teacherError);
    } else {
        const teacher = await prisma.user.create({
            data: {
                id: teacherAuth.user.id,
                email: teacherEmail,
                name: 'Test Teacher',
                role: 'TEACHER',
                schoolId: school.id,
                verified: true,
            }
        });
        
        // Assign Teacher to Class/Subject
        await prisma.teacherAssignment.create({
            data: {
                teacherId: teacher.id,
                classId: class10A.id,
                subjectId: math.id,
            }
        });
        console.log(`Created Teacher: ${teacher.email}`);
    }

    // 5. Create Student (Auth + Prisma)
    const studentEmail = 'student@lucy.edu';
    const studentPassword = 'Password123!';
    
    const { data: studentAuth, error: studentError } = await supabase.auth.admin.createUser({
        email: studentEmail,
        password: studentPassword,
        email_confirm: true,
        user_metadata: { role: 'STUDENT', name: 'Test Student' }
    });

    if (studentError) {
        console.error('Student Auth Error:', studentError);
    } else {
        const studentUser = await prisma.user.create({
            data: {
                id: studentAuth.user.id,
                email: studentEmail,
                name: 'Test Student',
                role: 'STUDENT',
                schoolId: school.id,
                verified: true,
            }
        });

        const student = await prisma.student.create({
            data: {
                userId: studentUser.id,
                schoolId: school.id,
                gradeId: grade.id,
                classId: class10A.id,
                firstName: 'Test',
                lastName: 'Student',
                email: studentEmail,
                studentCode: 'STU-001',
            }
        });
        console.log(`Created Student: ${student.email} (Code: ${student.studentCode})`);
    }

    console.log('Seeding complete!');
    console.log('--- Credentials ---');
    console.log('Teacher: teacher@lucy.edu / Password123!');
    console.log('Student: student@lucy.edu / Password123!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
