const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
        if (match) {
            const key = match[1].trim();
            let val = match[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            process.env[key] = val;
        }
    });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const teacher = await prisma.user.findFirst({
            where: { email: 'veloura2133@gmail.com' }
        });
        const student = await prisma.student.findFirst({
            where: { firstName: 'MICHAEL' }
        });

        console.log('Teacher:', {
            id: teacher?.id,
            email: teacher?.email,
            role: teacher?.role,
            schoolId: teacher?.schoolId
        });

        console.log('Student:', {
            id: student?.id,
            firstName: student?.firstName,
            lastName: student?.lastName,
            schoolId: student?.schoolId
        });

        if (teacher && student) {
            console.log('Check match:', teacher.schoolId === student.schoolId);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
