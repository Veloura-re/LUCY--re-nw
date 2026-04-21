import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const correctId = '1172f392-1e2a-4d47-8824-f06b1ca362fd';
    const email = 'admin@lucy.edu';

    console.log(`Cleaning up duplicates for ${email}...`);
    try {
        const deletedCount = await prisma.$executeRaw`DELETE FROM "User" WHERE email = ${email} AND id != ${correctId}`;
        console.log(`SUCCESS! Deleted ${deletedCount} ghost records.`);

        const remaining = await prisma.user.findMany({ where: { email } });
        console.log(`Remaining records for ${email}: ${remaining.length}`);
        remaining.forEach(r => console.log(` - ID: ${r.id} | Role: ${r.role}`));

    } catch (e: any) {
        console.error('FAILED cleanup!', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
