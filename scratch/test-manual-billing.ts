import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const action = args[0];

    const school = await prisma.school.findFirst({
        include: { users: true }
    });
    if (!school) {
        console.error("❌ No school found in the database.");
        process.exit(1);
    }

    const owner = school.users.find(u => u.role === 'OWNER' || u.role === 'PRINCIPAL');
    if (!owner) {
        console.error(`❌ No Owner or Principal found for school "${school.name}". Please seed users first.`);
        process.exit(1);
    }

    console.log(`🏫 Target School: "${school.name}" (${school.id})`);
    console.log(`👤 Submitter: "${owner.name}" (${owner.email})`);

    if (action === '--submit') {
        const reference = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
        console.log(`📤 Submitting billing receipt (Ref: ${reference}, Amount: $149.00)...`);
        
        const receipt = await prisma.billingReceipt.create({
            data: {
                schoolId: school.id,
                submittedById: owner.id,
                amount: 149.00,
                reference,
                receiptUrl: 'https://example.com/receipts/proof.png',
                status: 'PENDING',
                notes: 'Simulated CLI wire submission'
            }
        });
        
        console.log(`✅ Billing receipt created with ID: ${receipt.id}. Status: PENDING.`);
    } else if (action === '--approve-all') {
        console.log(`📥 Fetching all pending receipts for "${school.name}"...`);
        const pendingReceipts = await prisma.billingReceipt.findMany({
            where: { schoolId: school.id, status: 'PENDING' }
        });

        if (pendingReceipts.length === 0) {
            console.log("ℹ️ No pending receipts found.");
            return;
        }

        for (const receipt of pendingReceipts) {
            console.log(`⚡ Approving receipt ${receipt.id} (Ref: ${receipt.reference})...`);
            
            await prisma.$transaction(async (tx) => {
                await tx.billingReceipt.update({
                    where: { id: receipt.id },
                    data: { status: 'APPROVED' }
                });

                const extendedTrialDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
                await tx.school.update({
                    where: { id: school.id },
                    data: {
                        subscriptionStatus: 'active',
                        trialEndsAt: extendedTrialDate
                    }
                });
            });
            console.log(`✅ Approved. School subscriptionStatus set to 'active'.`);
        }
    } else if (action === '--list') {
        const receipts = await prisma.billingReceipt.findMany({
            where: { schoolId: school.id },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`📋 Billing receipts history (${receipts.length} items):`);
        receipts.forEach(r => {
            console.log(`  - ID: ${r.id} | Ref: ${r.reference} | Amount: $${r.amount} | Status: ${r.status} | Date: ${r.createdAt}`);
        });
    } else {
        console.log("Options:");
        console.log("  --submit      - Simulates submitting a manual bank receipt from the Owner.");
        console.log("  --approve-all - Approves all pending receipts and activates school subscription.");
        console.log("  --list        - Lists all submitted receipts.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
