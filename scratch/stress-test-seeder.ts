import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Starting database stress test seeding...");
    const startTime = Date.now();

    // 1. Generate password hash
    console.log("⏳ Pre-computing bcrypt password hash for 'password123'...");
    const passwordHash = await bcrypt.hash('password123', 10);
    console.log("✅ Hash generated.");

    // 2. Prepare school data
    const NUM_SCHOOLS = 2000;
    const USERS_PER_SCHOOL = 5; // 1 Owner, 1 Principal, 3 Teachers
    
    console.log(`📦 Generating data structures for ${NUM_SCHOOLS} schools...`);
    
    const schools = [];
    const users = [];

    for (let i = 1; i <= NUM_SCHOOLS; i++) {
        const schoolId = randomUUID();
        const schoolCode = `STRESS-${i}`;
        
        schools.push({
            id: schoolId,
            name: `Stress Demo School ${i}`,
            schoolCode: schoolCode,
            status: 'ACTIVE' as const,
        });

        // Owner
        users.push({
            id: randomUUID(),
            email: `owner.${i}@lucy-stress.edu`,
            passwordHash,
            name: `Stress Owner ${i}`,
            role: 'OWNER' as const,
            schoolId,
            verified: true,
        });

        // Principal
        users.push({
            id: randomUUID(),
            email: `principal.${i}@lucy-stress.edu`,
            passwordHash,
            name: `Stress Principal ${i}`,
            role: 'PRINCIPAL' as const,
            schoolId,
            verified: true,
        });

        // 3 Teachers
        for (let j = 1; j <= 3; j++) {
            users.push({
                id: randomUUID(),
                email: `teacher.${i}.${j}@lucy-stress.edu`,
                passwordHash,
                name: `Stress Teacher ${i} ${j}`,
                role: 'TEACHER' as const,
                schoolId,
                verified: true,
            });
        }
    }

    // 3. Batch insert Schools
    console.log(`💾 Inserting ${schools.length} schools into database...`);
    const schoolBatchSize = 500;
    for (let k = 0; k < schools.length; k += schoolBatchSize) {
        const batch = schools.slice(k, k + schoolBatchSize);
        await prisma.school.createMany({
            data: batch,
            skipDuplicates: true
        });
        console.log(`   Processed schools ${k + batch.length}/${schools.length}`);
    }

    // 4. Batch insert Users
    console.log(`💾 Inserting ${users.length} users into database...`);
    const userBatchSize = 1000;
    for (let k = 0; k < users.length; k += userBatchSize) {
        const batch = users.slice(k, k + userBatchSize);
        await prisma.user.createMany({
            data: batch,
            skipDuplicates: true
        });
        console.log(`   Processed users ${k + batch.length}/${users.length}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 SUCCESS! Seeded ${NUM_SCHOOLS} schools and ${users.length} users in ${duration}s.`);
}

main()
    .catch(err => {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
