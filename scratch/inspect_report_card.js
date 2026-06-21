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
        const studentId = '03ae601b-a3a0-4ec1-a516-6a6bcebb2b0b';
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                class: {
                    include: {
                        grade: true
                    }
                },
                school: true,
                parentLinks: {
                    include: {
                        parent: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        });

        const grades = await prisma.gradeRecord.findMany({
            where: { studentId },
            include: {
                subject: true,
                exam: true
            },
            orderBy: { exam: { availableFrom: 'asc' } }
        });

        console.log('Student Class & Grade:', student?.class);
        console.log('Student GradeRecords count:', grades.length);
        grades.forEach(g => {
            console.log(` - Grade: ${g.exam?.title} | Score: ${g.score} | MaxMarks: ${g.exam?.totalMarks}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
