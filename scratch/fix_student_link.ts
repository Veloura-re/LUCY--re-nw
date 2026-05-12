import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Linking Student Profile ---');
    
    // Find student user
    const studentUser = await prisma.user.findFirst({
        where: { email: 'student@neural.edu' }
    });

    if (!studentUser) {
        console.error('ERROR: Student user (student@neural.edu) not found');
        return;
    }

    // Find student profile
    const studentProfile = await prisma.student.findFirst({
        where: { studentCode: 'STU-001' }
    });

    if (!studentProfile) {
        console.error('ERROR: Student profile (STU-001) not found');
        return;
    }

    // Link them
    await prisma.student.update({
        where: { id: studentProfile.id },
        data: { userId: studentUser.id }
    });

    console.log(`Successfully linked User ${studentUser.id} to Student Profile ${studentProfile.id}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
