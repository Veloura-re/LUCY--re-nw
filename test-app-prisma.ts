import { prisma } from './lib/prisma';

async function main() {
    console.log('--- APP PRISMA CLIENT TEST ---');
    try {
        const count = await prisma.user.count();
        console.log('SUCCESS! User count:', count);
    } catch (e: any) {
        console.error('FAILED!');
        console.error('Message:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
