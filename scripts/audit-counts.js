const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllCounts() {
    const tables = [
        'School', 'User', 'Grade', 'Class', 'Subject', 'Student',
        'Exam', 'GradeRecord', 'AttendanceRecord', 'Invoice', 'Payment'
    ];

    console.log('--- Table Count Audit ---');
    for (const table of tables) {
        try {
            const count = await prisma[table.toLowerCase()].count();
            console.log(`${table}: ${count}`);
        } catch (e) {
            console.log(`${table}: ERROR (${e.message.substring(0, 50)}...)`);
        }
    }
    console.log('-------------------------');
    await prisma.$disconnect();
}

checkAllCounts();
