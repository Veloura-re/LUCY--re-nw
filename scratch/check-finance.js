require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const totalInvoices = await prisma.invoice.count();
    const paidInvoices = await prisma.invoice.count({ where: { status: 'PAID' } });
    const pendingInvoices = await prisma.invoice.count({ where: { status: 'PENDING' } });
    const overdueInvoices = await prisma.invoice.count({ where: { status: 'OVERDUE' } });
    
    console.log('--- Invoice Statistics ---');
    console.log('Total Invoices:', totalInvoices);
    console.log('Paid Invoices:', paidInvoices);
    console.log('Pending Invoices:', pendingInvoices);
    console.log('Overdue Invoices:', overdueInvoices);

    const totalPayments = await prisma.payment.count();
    const successPayments = await prisma.payment.count({ where: { status: 'SUCCESS' } });
    const pendingPayments = await prisma.payment.count({ where: { status: 'PENDING' } });
    const failedPayments = await prisma.payment.count({ where: { status: 'FAILED' } });

    console.log('\n--- Payment Statistics ---');
    console.log('Total Payments:', totalPayments);
    console.log('Success Payments:', successPayments);
    console.log('Pending Payments:', pendingPayments);
    console.log('Failed Payments:', failedPayments);

    console.log('\n--- Recent Payments ---');
    const recentPayments = await prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: {
          include: {
            student: true
          }
        }
      }
    });

    recentPayments.forEach(p => {
      console.log(`Payment ID: ${p.id}, Amount: ${p.amount}, Method: ${p.method}, Status: ${p.status}, Invoice Status: ${p.invoice.status}, Student: ${p.invoice.student.firstName} ${p.invoice.student.lastName}`);
    });

    console.log('\n--- Fee Structures ---');
    const fees = await prisma.feeStructure.findMany({ take: 5 });
    fees.forEach(f => {
      console.log(`Fee: ${f.name}, Amount: ${f.amount}, Category: ${f.category}, Frequency: ${f.frequency}`);
    });

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
