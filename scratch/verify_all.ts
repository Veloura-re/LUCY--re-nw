import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, schoolId: true, role: true }
    });
    console.log('Users:', JSON.stringify(users, null, 2));

    const schools = await prisma.school.findMany();
    console.log('Schools:', JSON.stringify(schools, null, 2));

    const students = await prisma.student.findMany();
    console.log('Students:', JSON.stringify(students, null, 2));
}

main().finally(() => prisma.$disconnect());
