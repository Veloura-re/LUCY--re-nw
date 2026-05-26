import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { email: { in: ['teacher@lucy.edu', 'student@lucy.edu', 'admin@lucy.edu', 'teacher@genesis.edu', 'student@genesis.edu'] } },
        include: { school: true }
    });

    console.log("Users found:");
    for (const u of users) {
        console.log(`- ${u.email}: Role=${u.role}, School=${u.school?.name || 'NONE'}`);
        if (u.role === 'STUDENT') {
            const student = await prisma.student.findFirst({ where: { userId: u.id } });
            console.log(`  Student Record: ${student ? 'YES' : 'NO'}`);
        }
        if (u.role === 'TEACHER') {
            const assignments = await prisma.teacherAssignment.count({ where: { teacherId: u.id } });
            console.log(`  Teacher Assignments: ${assignments}`);
        }
    }
}
main().finally(() => prisma.$disconnect());
