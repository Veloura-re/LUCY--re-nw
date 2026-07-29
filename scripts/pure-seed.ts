import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = '349bf9be-7860-43a9-93f2-3e12b49962f9'; // teacher user ID
    
    // 1. Ensure School
    let school = await prisma.school.findFirst();
    if (!school) {
        school = await prisma.school.create({ data: { name: 'Marketing Academy', timezone: 'UTC' } });
    }

    // 2. Ensure Grade
    let grade = await prisma.grade.findFirst({ where: { schoolId: school.id } });
    if (!grade) {
        grade = await prisma.grade.create({ data: { name: 'Grade 10', level: 10, schoolId: school.id } });
    }

    // 3. Ensure Subject
    let subject = await prisma.subject.findFirst({ where: { schoolId: school.id } });
    if (!subject) {
        subject = await prisma.subject.create({ data: { name: 'Advanced Astrophysics', code: 'ASTRO101', schoolId: school.id, gradeId: grade.id } });
    }

    // 4. Ensure Term
    let term = await prisma.academicTerm.findFirst({ where: { schoolId: school.id } });
    if (!term) {
        term = await prisma.academicTerm.create({ data: { name: 'Q1 Fall Term', schoolId: school.id, startDate: new Date(), endDate: new Date() } });
    }

    // 5. Create Exam
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
            creatorId: userId,
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

    console.log('EXAM CREATED SUCCESSFULLY: ' + exam.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
