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
            // remove quotes if any
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
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'MISSING');
    try {
        const users = await prisma.user.findMany();
        console.log('--- USERS ---');
        users.forEach(u => {
            console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | SchoolId: ${u.schoolId} | Name: ${u.name}`);
        });

        const students = await prisma.student.findMany({
            include: {
                class: true
            }
        });
        console.log('--- STUDENTS ---');
        students.forEach(s => {
            console.log(`ID: ${s.id} | Name: ${s.firstName} ${s.lastName} | Code: ${s.studentCode} | SchoolId: ${s.schoolId} | ClassId: ${s.classId} | ClassName: ${s.class?.className}`);
        });

        const exams = await prisma.exam.findMany({
            include: {
                class: true,
                subject: true
            }
        });
        console.log('--- EXAMS ---');
        exams.forEach(e => {
            console.log(`ID: ${e.id} | Title: ${e.title} | SubjectId: ${e.subjectId} | ClassId: ${e.classId} | TotalMarks: ${e.totalMarks}`);
        });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
