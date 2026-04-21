import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const ghostId = 'cbf58852-4405-49f9-8807-34468ea0916f';
    const correctId = '1172f392-1e2a-4d47-8824-f06b1ca362fd';

    console.log(`Deleting ghost user ${ghostId}...`);
    try {
        const deleted = await prisma.user.delete({ where: { id: ghostId } });
        console.log('SUCCESS! Ghost user deleted:', deleted.email);
    } catch (e: any) {
        console.warn('Ghost user not found or already deleted:', e.message);
    }

    // Now ensure the correct ID has the SUPERADMIN role
    console.log(`Ensuring ${correctId} is SUPERADMIN...`);
    try {
        const updated = await prisma.user.update({
            where: { id: correctId },
            data: { role: 'SUPERADMIN' }
        });
        console.log('SUCCESS! Correct user is now SUPERADMIN.');
    } catch (e: any) {
        console.error('FAILED to update correct user!', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
