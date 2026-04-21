const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'MISSING');
    try {
        const schools = await prisma.school.count();
        const users = await prisma.user.count();
        const students = await prisma.student.count();
        const grades = await prisma.grade.count();
        const auditLogs = await prisma.auditLog.count();

        const adminEmail = 'admin@lucy.edu';
        const admins = await prisma.user.findMany({ where: { email: adminEmail } });
        console.log(`Found ${admins.length} records for ${adminEmail}:`);
        admins.forEach(a => console.log(` - ID: ${a.id} | Role: ${a.role}`));

        const allUsers = await prisma.user.findMany();
        console.log('--- FULL USER AUDIT ---');
        allUsers.forEach(u => {
            console.log(`Email: ${u.email} | ID: ${u.id} | Role: ${u.role}`);
        });
        console.log(`Total: ${allUsers.length}`);

        const lastUser = await prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
        console.log('Last User:', lastUser?.email || 'None');

    } catch (e) {
        console.log('PRISMA_ERROR_CODE: ' + e.code);
        console.log('PRISMA_ERROR_MESSAGE: ' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
