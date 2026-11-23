import { PrismaClient, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('[LUCY OS] Initiating Superadmin Bootstrap...');

    const email = (process.env.SUPERADMIN_EMAIL || process.argv[2] || 'superadmin@5-cn.net').toLowerCase().trim();
    const password = process.env.SUPERADMIN_PASSWORD || process.argv[3] || 'LucyMasterAdmin#2026!';
    const name = process.env.SUPERADMIN_NAME || 'Root Superadmin';

    // Verify existing superadmin count
    const existing = await prisma.adminUser.findFirst({
        where: { role: AdminRole.SUPERADMIN },
    });

    if (existing) {
        console.error(`[LUCY OS] Error: A Superadmin account already exists (${existing.email}). Only one superadmin is permitted.`);
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.adminUser.create({
        data: {
            email,
            passwordHash,
            name,
            role: AdminRole.SUPERADMIN,
            failedLoginAttempts: 0,
            lockedUntil: null,
        },
    });

    await prisma.adminAuditLog.create({
        data: {
            adminId: admin.id,
            action: 'BOOTSTRAP_SUPERADMIN_PROVISIONED',
            targetResource: 'AdminUser',
            targetId: admin.id,
            ipAddress: '127.0.0.1',
            metadata: { email: admin.email, bootstrap: true },
        },
    });

    console.log(`[LUCY OS] Success: Root Superadmin provisioned successfully.`);
    console.log(`  ID:    ${admin.id}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Role:  ${admin.role}`);
}

main()
    .catch((err) => {
        console.error('[LUCY OS] Bootstrap Failed:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
