require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const totalUsers = await prisma.user.count();
    const totalSchools = await prisma.school.count();
    const totalStudents = await prisma.student.count();
    
    console.log('--- DB Record Counts ---');
    console.log('Total Users:', totalUsers);
    console.log('Total Schools:', totalSchools);
    console.log('Total Students:', totalStudents);

    if (totalUsers > 0) {
      console.log('\n--- Recent Users ---');
      const users = await prisma.user.findMany({ take: 5, select: { id: true, name: true, email: true, role: true, schoolId: true } });
      users.forEach(u => console.log(u));
    }
    
    if (totalSchools > 0) {
      console.log('\n--- Recent Schools ---');
      const schools = await prisma.school.findMany({ take: 5 });
      schools.forEach(s => console.log(s));
    }

    if (totalStudents > 0) {
      console.log('\n--- Recent Students ---');
      const students = await prisma.student.findMany({ take: 5, include: { school: true, grade: true } });
      students.forEach(s => console.log(`${s.firstName} ${s.lastName} (${s.studentCode}) - Grade ${s.grade.name} at ${s.school.name}`));
    }
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
