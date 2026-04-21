import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const email = 'admin@lucy.edu';
    const supabaseId = '1172f392-1e2a-4d47-8824-f06b1ca362fd';

    console.log(`Syncing ID for ${email} to ${supabaseId}...`);

    try {
        // We can't simply update the ID because it's a primary key and likely has relations
        // But since it's a fresh DB with 0 schools (besides 1 test), let's try direct deletion and recreation
        // or a raw update if Prisma allows it.

        await prisma.$executeRaw`UPDATE "User" SET id = ${supabaseId} WHERE email = ${email}`;

        console.log('SUCCESS! Admin ID synchronized.');
    } catch (e: any) {
        console.error('FAILED!', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
