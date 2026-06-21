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
        const user = await prisma.user.findUnique({
            where: { email: 'veloura2133@gmail.com' }
        });
        console.log('User:', user);

        const students = await prisma.student.findMany({
            where: { schoolId: user.schoolId, classId: 'bd51c694-3f73-42ed-b73b-b1ba67e07cb8' }
        });
        console.log('Students in class:', students);

        const examId = '95080bf9-10ba-4fd3-8e1f-98da2bf18ba9';
        const graderecords = await prisma.gradeRecord.findMany({
            where: { examId },
        });
        console.log('GradeRecords:', graderecords);

        const attempts = await prisma.examAttempt.findMany({
            where: { examId }
        });
        console.log('Attempts:', attempts);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
