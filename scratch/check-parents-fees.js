require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const parentLinks = await prisma.parentStudentLink.findMany({
      include: {
        parent: true,
        student: true
      }
    });
    console.log('--- Parent Student Links ---');
    console.log('Total Links:', parentLinks.length);
    parentLinks.forEach(link => {
      console.log(`Parent: ${link.parent.name} (${link.parent.email}) <-> Student: ${link.student.firstName} ${link.student.lastName}`);
    });

    const feeStructures = await prisma.feeStructure.findMany();
    console.log('\n--- Fee Structures ---');
    console.log('Total Fee Structures:', feeStructures.length);
    feeStructures.forEach(fee => {
      console.log(`ID: ${fee.id}, Name: ${fee.name}, Amount: ${fee.amount}, SchoolId: ${fee.schoolId}, GradeId: ${fee.gradeId}`);
    });

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
