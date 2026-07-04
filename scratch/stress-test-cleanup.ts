import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
    console.log("🧹 Starting database stress test cleanup...");
    const startTime = Date.now();

    // 1. Delete users
    console.log("⏳ Deleting stress-test users ending with '@lucy-stress.edu'...");
    const userDeleteResult = await prisma.user.deleteMany({
        where: {
            email: {
                endsWith: '@lucy-stress.edu'
            }
        }
    });
    console.log(`✅ Deleted ${userDeleteResult.count} users.`);

    // 2. Delete schools
    console.log("⏳ Deleting stress-test schools starting with 'STRESS-'...");
    const schoolDeleteResult = await prisma.school.deleteMany({
        where: {
            schoolCode: {
                startsWith: 'STRESS-'
            }
        }
    });
    console.log(`✅ Deleted ${schoolDeleteResult.count} schools.`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 SUCCESS! Cleanup complete in ${duration}s.`);
}

main()
    .catch(err => {
        console.error("❌ Cleanup failed:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
