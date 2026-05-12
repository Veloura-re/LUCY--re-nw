import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log('--- ALL USERS ---');
    users.forEach(u => console.log(`- ${u.email} (${u.role}) ID: ${u.id}`));
}

main().finally(() => prisma.$disconnect());
