const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    if (line.includes('=')) {
        const [key, ...rest] = line.split('=');
        env[key.trim()] = rest.join('=').trim().replace('\r', '');
    }
});

async function main() {
    const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
    const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

    const supabase = createClient(supabaseUrl, supabaseKey);
    const prisma = new PrismaClient();

    const email = 'marketing-teacher@lucy-app.com';
    const password = 'MarketingPassword123!';

    // 1. Create in Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
    });

    let userId = authData?.user?.id;
    if (!userId) {
        const { data } = await supabase.auth.admin.listUsers();
        userId = data.users.find(u => u.email === email)?.id;
    }

    if (!userId) {
        console.error("Could not find or create Supabase user.");
        process.exit(1);
    }

    try {
        // 2. Create School if not exists
        let school = await prisma.school.findFirst();
        if (!school) {
            school = await prisma.school.create({
                data: { name: 'Marketing Academy', timezone: 'UTC' }
            });
        }

        // 3. Create User in Prisma
        let user = await prisma.user.upsert({
            where: { id: userId },
            update: { email, name: 'Marketing Teacher', role: 'TEACHER', schoolId: school.id, verified: true },
            create: { id: userId, email, name: 'Marketing Teacher', role: 'TEACHER', schoolId: school.id, verified: true }
        });

        // 4. Create Teacher record
        let teacher = await prisma.teacher.upsert({
            where: { userId: userId },
            update: { schoolId: school.id, firstName: 'Marketing', lastName: 'Teacher', email },
            create: { userId: userId, schoolId: school.id, firstName: 'Marketing', lastName: 'Teacher', email }
        });

        // 5. Create Subject & Grade & Term
        let grade = await prisma.grade.findFirst({ where: { schoolId: school.id } });
        if (!grade) {
            grade = await prisma.grade.create({ data: { name: 'Grade 10', level: 10, schoolId: school.id } });
        }

        let subject = await prisma.subject.findFirst({ where: { schoolId: school.id } });
        if (!subject) {
            subject = await prisma.subject.create({ data: { name: 'Advanced Astrophysics', code: 'ASTRO101', schoolId: school.id, gradeId: grade.id } });
        }

        let term = await prisma.academicTerm.findFirst({ where: { schoolId: school.id } });
        if (!term) {
            term = await prisma.academicTerm.create({ data: { name: 'Q1 Fall Term', schoolId: school.id, startDate: new Date(), endDate: new Date() } });
        }

        // 6. Create Exam for Neural Editor
        let exam = await prisma.exam.create({
            data: {
                title: 'Midterm Astrophysics Assessment',
                date: new Date(),
                availableFrom: new Date(),
                availableUntil: new Date(),
                status: 'DRAFT',
                subjectId: subject.id,
                schoolId: school.id,
                gradeId: grade.id,
                termId: term.id,
                creatorId: user.id,
                type: 'EXAM',
                config: {
                    durationMinutes: 60,
                    maxScore: 100,
                    showResultsImmediately: false,
                    shuffleQuestions: false
                },
                questions: []
            }
        });

        console.log("-----------------------------------------");
        console.log("MARKETING TEACHER CREATED");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`Exam URL: /dashboard/teacher/exams/${exam.id}/editor`);
        console.log("-----------------------------------------");

    } catch (e) {
        console.error("Prisma error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
