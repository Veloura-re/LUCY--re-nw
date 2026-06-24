require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function run() {
  try {
    // 1. Find the school and student
    const school = await prisma.school.findFirst();
    if (!school) {
      console.error('No school found in the database!');
      return;
    }
    console.log('Using school:', school.name, school.id);

    const student = await prisma.student.findFirst({
      where: { firstName: 'MICHAEL', lastName: 'JACKSON' }
    });
    if (!student) {
      console.error('No student MICHAEL JACKSON found in the database!');
      return;
    }
    console.log('Using student:', student.firstName, student.lastName, student.id);

    // 2. Create Parent User if not exists
    let parent = await prisma.user.findUnique({
      where: { email: 'parent@lucy.local' }
    });

    if (!parent) {
      const passwordHash = await bcrypt.hash('password123', 10);
      parent = await prisma.user.create({
        data: {
          email: 'parent@lucy.local',
          name: 'Parent of Michael',
          passwordHash: passwordHash,
          role: 'PARENT',
          schoolId: school.id,
          verified: true
        }
      });
      console.log('Created parent user:', parent.email, parent.id);
    } else {
      console.log('Parent user already exists:', parent.email, parent.id);
    }

    // 3. Create ParentStudentLink if not exists
    const existingLink = await prisma.parentStudentLink.findFirst({
      where: {
        parentId: parent.id,
        studentId: student.id
      }
    });

    if (!existingLink) {
      const link = await prisma.parentStudentLink.create({
        data: {
          parentId: parent.id,
          studentId: student.id,
          pairingMethod: 'ADMIN',
          verifiedAt: new Date()
        }
      });
      console.log('Created ParentStudentLink:', link.id);
    } else {
      console.log('ParentStudentLink already exists');
    }

    // 4. Create FeeStructure if not exists
    let fee = await prisma.feeStructure.findFirst({
      where: { schoolId: school.id, name: 'Term 1 Tuition' }
    });

    if (!fee) {
      fee = await prisma.feeStructure.create({
        data: {
          schoolId: school.id,
          name: 'Term 1 Tuition',
          amount: 1500.00,
          category: 'TUITION',
          frequency: 'TERM'
        }
      });
      console.log('Created FeeStructure:', fee.name, fee.amount);
    } else {
      console.log('FeeStructure already exists:', fee.name, fee.amount);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
