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

async function mockGetReportCard(studentId, userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('Logged in user:', { id: user.id, role: user.role, schoolId: user.schoolId });

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

        if (!student) {
            console.log('Student not found in DB');
            return;
        }

        console.log('Student details:', {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            schoolId: student.schoolId
        });

        // Security check
        if (user.role === 'STUDENT') {
            if (student.userId !== user.id) {
                console.log('403 Forbidden: STUDENT not owner');
                return;
            }
        } else if (user.role !== 'SUPERADMIN' && student.schoolId !== user.schoolId) {
            console.log('403 Forbidden: School ID mismatch', { studentSchool: student.schoolId, userSchool: user.schoolId });
            return;
        }

        console.log('Access allowed!');
    } catch (err) {
        console.error(err);
    }
}

// Student: MICHAEL JACKSON ID '03ae601b-a3a0-4ec1-a516-6a6bcebb2b0b'
// Teacher: veloura2133@gmail.com ID '3e1f8679-95e5-4990-bf06-c7dcf652d922'
mockGetReportCard('03ae601b-a3a0-4ec1-a516-6a6bcebb2b0b', '3e1f8679-95e5-4990-bf06-c7dcf652d922')
    .then(() => prisma.$disconnect());
