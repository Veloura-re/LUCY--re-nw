import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const action = args[0];

    const school = await prisma.school.findFirst();
    if (!school) {
        console.error("❌ No school found in the database. Run the stress-test seeder first!");
        process.exit(1);
    }

    console.log(`🏫 Target School: "${school.name}" (${school.id})`);
    console.log(`   Current Status: SubscriptionStatus=${school.subscriptionStatus || 'NONE'}, TrialEndsAt=${school.trialEndsAt || 'NONE'}\n`);

    if (action === '--expire') {
        console.log("⏳ Setting school trial as EXPIRED (trialEndsAt = 1 day ago, subscriptionStatus = 'trialing')...");
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await prisma.school.update({
            where: { id: school.id },
            data: {
                trialEndsAt: yesterday,
                subscriptionStatus: 'trialing'
            }
        });
        console.log("✅ School set to EXPIRED. Accessing /dashboard should now redirect to /dashboard/billing (for Owner/Principal) or /school-suspended (for others).");
    } else if (action === '--activate') {
        console.log("💳 Setting school subscription as ACTIVE...");
        await prisma.school.update({
            where: { id: school.id },
            data: {
                subscriptionStatus: 'active',
                stripeCustomerId: 'cus_test_cli',
                stripeSubscriptionId: 'sub_test_cli',
                trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
        });
        console.log("✅ School set to ACTIVE. Dashboard access fully restored.");
    } else if (action === '--reset') {
        console.log("🔄 Resetting school to standard 60-day trial...");
        const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        await prisma.school.update({
            where: { id: school.id },
            data: {
                subscriptionStatus: 'trialing',
                stripeCustomerId: null,
                stripeSubscriptionId: null,
                trialEndsAt: sixtyDaysFromNow
            }
        });
        console.log("✅ School reset to 60-day trial. Access allowed.");
    } else {
        console.log("Options:");
        console.log("  --expire   - Sets trial as expired to test block redirection.");
        console.log("  --activate - Sets subscription as active to restore access.");
        console.log("  --reset    - Sets standard 60-day trialing state.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
