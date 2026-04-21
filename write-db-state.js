const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    try {
        const url = process.env.DATABASE_URL || 'MISSING';
        const redactedUrl = url.replace(/:[^:@]+@/, ':***@');

        const allUsers = await prisma.user.findMany();

        let output = `DATABASE_URL: ${redactedUrl}\n\n`;
        output += `Total Users: ${allUsers.length}\n`;
        allUsers.forEach(u => {
            output += `Email: ${u.email} | ID: ${u.id} | Role: ${u.role}\n`;
        });

        fs.writeFileSync('db_debug_output.txt', output);
        console.log('Diagnostic output written to db_debug_output.txt');
    } catch (e) {
        fs.writeFileSync('db_debug_output.txt', `ERROR: ${e.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

main();
