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
    const assignments = await prisma.assignment.findMany();
    const exams = await prisma.exam.findMany();
    
    console.log('--- ASSIGNMENTS ---');
    console.log(JSON.stringify(assignments, null, 2));
    
    console.log('--- EXAMS ---');
    console.log(JSON.stringify(exams, null, 2));
}

main().finally(() => prisma.$disconnect());
