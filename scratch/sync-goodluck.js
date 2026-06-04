const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'goodluck97248@gmail.com';
    const id = 'c0296d97-b5ec-43be-8f23-32bd952c2fb7';
    const role = 'PRINCIPAL';
    const schoolId = '79f3659b-44e4-4881-944f-7f277c82e134';

    console.log(`Syncing ${email}...`);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                id,
                role,
                schoolId,
                name: "Mama",
                verified: true
            },
            create: {
                id,
                email,
                name: "Mama",
                role,
                schoolId,
                verified: true
            }
        });
        console.log('Successfully synced user:', user);
    } catch (e) {
        console.error('Failed to sync user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
