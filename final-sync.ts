import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const correctId = '945d922d-f9e2-4a15-ba5c-807127b83272';
    const email = 'admin@lucy.edu';

    console.log(`Forcefully syncing ID for ${email} to ${correctId}...`);

    try {
        // Delete any existing records that might conflict
        await prisma.$executeRaw`DELETE FROM "User" WHERE email = ${email} AND id != ${correctId}`;

        // Update the existing record if it exists with wrong ID, or create it
        await prisma.user.upsert({
            where: { email },
            update: { id: correctId, role: 'SUPERADMIN' },
            create: {
                id: correctId,
                email,
                name: 'Super Admin',
                role: 'SUPERADMIN',
                verified: true
            }
        });

        console.log('SUCCESS! Database synchronized with Supabase ID.');
    } catch (e: any) {
        console.error('FAILED!', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
