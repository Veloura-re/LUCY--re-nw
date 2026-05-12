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
    console.log('--- FOUNDATIONAL DATA SCAN ---');
    
    const school = await prisma.school.findFirst({ where: { schoolCode: 'NEURAL-001' } });
    console.log('School (NEURAL-001):', school ? 'FOUND' : 'MISSING');
    if (school) console.log('  ID:', school.id);

    const teacher = await prisma.user.findFirst({ where: { email: 'teacher@neural.edu' } });
    console.log('Teacher (teacher@neural.edu):', teacher ? 'FOUND' : 'MISSING');
    if (teacher) console.log('  ID:', teacher.id);

    const classes = await prisma.class.findMany();
    console.log('Classes found:', classes.length);
    classes.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

    const subjects = await prisma.subject.findMany();
    console.log('Subjects found:', subjects.length);
    subjects.forEach(s => console.log(`  - ${s.name} (ID: ${s.id})`));

    const students = await prisma.student.findMany();
    console.log('Students found:', students.length);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
