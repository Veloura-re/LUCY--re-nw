import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DIRECT_URL
        }
    }
});

async function main() {
    const users = await prisma.user.findMany();
    console.log('--- ALL USERS ---');
    users.forEach(u => console.log(`- ${u.email} (${u.role}) ID: ${u.id}`));
}

main().finally(() => prisma.$disconnect());
