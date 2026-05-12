import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    let retries = 5;
    while (retries > 0) {
        try {
            console.log(`--- Linking Student Profile (Attempt ${6 - retries}) ---`);
            
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
            return;
        } catch (e) {
            console.warn(`Attempt failed: ${e.message}`);
            retries--;
            if (retries > 0) {
                console.log('Waiting 2 seconds before retry...');
                await new Promise(r => setTimeout(r, 2000));
            } else {
                console.error('All attempts failed.');
                throw e;
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
