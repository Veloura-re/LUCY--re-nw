require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const student = await prisma.student.findFirst({
      where: { firstName: 'MICHAEL', lastName: 'JACKSON' }
    });
    if (!student) {
      console.error('No student MICHAEL JACKSON found');
      return;
    }

    // 1. Create a dummy invoice
    const invoice = await prisma.invoice.create({
      data: {
        studentId: student.id,
        schoolId: student.schoolId,
        amount: 150.00,
        dueDate: new Date(),
        status: 'PENDING'
      }
    });
    console.log('Created Invoice:', invoice.id);

    // 2. Try to run the exact logic in webhooks/route.ts POST
    console.log('Simulating webhook execution...');
    
    // Find a valid user to satisfy the foreign key constraint
    const adminUser = await prisma.user.findFirst({
        where: {
            schoolId: invoice.schoolId,
            role: { in: ['PRINCIPAL', 'OWNER', 'SUPERADMIN'] }
        },
        select: { id: true }
    });
    
    let auditUserId = adminUser?.id;
    if (!auditUserId) {
        const anyUser = await prisma.user.findFirst({
            select: { id: true }
        });
        auditUserId = anyUser?.id;
    }
    
    console.log('Using resolved audit user ID:', auditUserId);

    await prisma.$transaction(async (tx) => {
      // 1. Create Payment Record
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: invoice.amount,
          method: 'CARD',
          reference: "AUTO_WEBHOOK_TEST",
          status: 'SUCCESS'
        }
      });

      // 2. Update Invoice Status
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID' }
      });

      // 3. Log highly sensitive audit event
      if (auditUserId) {
        await tx.auditLog.create({
          data: {
            userId: auditUserId,
            action: "AUTO_PAYMENT_CONFIRMATION",
            resourceType: "INVOICE",
            resourceId: invoice.id,
            after: { status: 'PAID', ref: "AUTO_WEBHOOK_TEST", note: "Test note" }
          }
        });
      }
    });

    console.log('Webhook simulation succeeded!');
  } catch (error) {
    console.error('Webhook simulation FAILED with error:', error);
  } finally {
    // Cleanup invoice and any child records we created to keep DB clean
    try {
      const dbInvoice = await prisma.invoice.findFirst({
        where: { payments: { some: { reference: 'AUTO_WEBHOOK_TEST' } } }
      });
      if (dbInvoice) {
        await prisma.payment.deleteMany({ where: { invoiceId: dbInvoice.id } });
        await prisma.auditLog.deleteMany({ where: { resourceId: dbInvoice.id } });
        await prisma.invoice.delete({ where: { id: dbInvoice.id } });
        console.log('Cleaned up dummy records.');
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    await prisma.$disconnect();
  }
}

run();
