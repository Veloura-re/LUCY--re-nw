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
    const ta = await prisma.teacherAssignment.findMany();
    const subjects = await prisma.subject.findMany();
    
    console.log('--- TEACHER ASSIGNMENTS ---');
    console.log(JSON.stringify(ta, null, 2));
    
    console.log('--- SUBJECTS ---');
    console.log(JSON.stringify(subjects, null, 2));
}

main().finally(() => prisma.$disconnect());
