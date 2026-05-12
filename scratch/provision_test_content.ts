import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DIRECT_URL
        }
    }
});

async function main() {
    console.log('--- Creating Institutional Content (Corrected Fields v3) ---');
    
    const school = await prisma.school.findFirst({ where: { schoolCode: 'NEURAL-001' } });
    const teacher = await prisma.user.findFirst({ where: { email: 'teacher@neural.edu' } });
    const studentClass = await prisma.class.findFirst({ where: { name: 'Alpha-1' } });
    const subject = await prisma.subject.findFirst({ where: { name: 'Mathematics' } });

    if (!school || !teacher || !studentClass || !subject) {
        console.error('ERROR: Missing foundational data (School/Teacher/Class/Subject)');
        return;
    }

    // 1. Create Assignment
    const assignment = await prisma.assignment.upsert({
        where: { id: 'assignment-neural-001' },
        update: {},
        create: {
            id: 'assignment-neural-001',
            title: 'Neural Synapse Analysis',
            description: 'Analyze the neural path of information transfer.',
            schoolId: school.id,
            classId: studentClass.id,
            subjectId: subject.id,
            teacherId: teacher.id,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            maxScore: 100,
            isPublished: true,
            type: 'HOMEWORK'
        } as any
    });
    console.log('Created Assignment:', assignment.title);

    // 2. Create Exam
    const exam = await prisma.exam.upsert({
        where: { id: 'exam-neural-001' },
        update: {},
        create: {
            id: 'exam-neural-001',
            title: 'Final Neural Evaluation',
            description: 'Comprehensive evaluation of neural OS knowledge.',
            classId: studentClass.id,
            subjectId: subject.id,
            createdById: teacher.id,
            totalMarks: 100,
            isPublished: true,
            category: 'TEST',
            dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks from now
        } as any
    });
    console.log('Created Exam:', exam.title);

    // 3. Create Lesson
    const lesson = await prisma.lesson.upsert({
        where: { id: 'lesson-neural-001' },
        update: {},
        create: {
            id: 'lesson-neural-001',
            topic: 'Information Transfer',
            objectives: 'A deep dive into how neurons communicate within the OS.',
            classId: studentClass.id,
            subjectId: subject.id,
            teacherId: teacher.id,
            date: new Date()
        } as any
    });
    console.log('Created Lesson:', lesson.topic);

    console.log('--- Content Provisioning Complete ---');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
