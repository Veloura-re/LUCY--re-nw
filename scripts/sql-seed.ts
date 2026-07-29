import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = '349bf9be-7860-43a9-93f2-3e12b49962f9'; 
    const schoolId = '7ea12c3d-f81b-4cf9-b92f-850e74226698';

    // Random IDs
    const gradeId = '11111111-1111-1111-1111-111111111111';
    const subjectId = '22222222-2222-2222-2222-222222222222';
    const termId = '33333333-3333-3333-3333-333333333333';
    const examId = '44444444-4444-4444-4444-444444444444';

    try {
        await prisma.$executeRawUnsafe(`
            INSERT INTO "Grade" (id, name, level, "schoolId", "createdAt", "updatedAt") 
            VALUES ('${gradeId}', 'Grade 10', 10, '${schoolId}', NOW(), NOW())
            ON CONFLICT DO NOTHING;
        `);
        console.log('Grade checked/inserted');

        await prisma.$executeRawUnsafe(`
            INSERT INTO "Subject" (id, name, code, "schoolId", "gradeId", "createdAt", "updatedAt") 
            VALUES ('${subjectId}', 'Astrophysics', 'ASTRO', '${schoolId}', '${gradeId}', NOW(), NOW())
            ON CONFLICT DO NOTHING;
        `);
        console.log('Subject checked/inserted');

        await prisma.$executeRawUnsafe(`
            INSERT INTO "AcademicTerm" (id, name, "startDate", "endDate", "schoolId", "createdAt", "updatedAt") 
            VALUES ('${termId}', 'Fall Term', NOW(), NOW() + INTERVAL '3 months', '${schoolId}', NOW(), NOW())
            ON CONFLICT DO NOTHING;
        `);
        console.log('Term checked/inserted');

        await prisma.$executeRawUnsafe(`
            INSERT INTO "Exam" (id, title, date, "availableFrom", "availableUntil", "duration", status, "subjectId", "schoolId", "gradeId", "termId", "creatorId", type, config, questions, "createdAt", "updatedAt") 
            VALUES ('${examId}', 'Midterm Astrophysics Assessment', NOW(), NOW(), NOW() + INTERVAL '7 days', 60, 'DRAFT', '${subjectId}', '${schoolId}', '${gradeId}', '${termId}', '${userId}', 'EXAM', '{"durationMinutes": 60, "maxScore": 100}', '[]', NOW(), NOW())
            ON CONFLICT DO NOTHING;
        `);
        console.log('EXAM CREATED SUCCESSFULLY: ' + examId);
    } catch (e) {
        console.error(e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
