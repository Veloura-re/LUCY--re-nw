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
        const exams = await prisma.exam.findMany({
            include: {
                class: true,
                subject: true,
                gradeRecords: true,
                attempts: true
            }
        });

        console.log(`Found ${exams.length} exams.`);
        for (const e of exams) {
            console.log(`\nExam ID: ${e.id} | Title: ${e.title} | Class ID: ${e.classId}`);
            console.log(`GradeRecords count: ${e.gradeRecords.length}`);
            e.gradeRecords.forEach(gr => {
                console.log(` - GradeRecord: Student ${gr.studentId} | Score: ${gr.score} | Status: ${gr.status}`);
            });
            console.log(`attempts count: ${e.attempts.length}`);
            e.attempts.forEach(ea => {
                console.log(` - ExamAttempt: Student ${ea.studentId} | Score: ${ea.score} | Status: ${ea.status}`);
            });

            // Let's check students of this class
            const students = await prisma.student.findMany({
                where: { classId: e.classId }
            });
            console.log(`Students in class: ${students.length}`);
            students.forEach(s => {
                console.log(` - Student: ${s.firstName} ${s.lastName} | ID: ${s.id}`);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
