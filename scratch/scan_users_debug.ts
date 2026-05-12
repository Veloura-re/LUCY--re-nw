import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- SCANNING ALL USERS ---');
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users.`);
    users.forEach(u => {
        console.log(`Email: [${u.email}] Role: [${u.role}] ID: [${u.id}]`);
    });
}

main().finally(() => prisma.$disconnect());
