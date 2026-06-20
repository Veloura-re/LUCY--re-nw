process.env.DATABASE_URL = "postgresql://postgres.caeeusbhwrkelnffbbub:Amsocookd2133%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const teacher = await prisma.user.findFirst({
            where: { email: 'veloura2133@gmail.com' }
        });
        if (!teacher) {
            console.log("Teacher not found!");
            return;
        }

        console.log(`Teacher found: ${teacher.name} (${teacher.email}), ID: ${teacher.id}`);

        const assignments = await prisma.teacherAssignment.findMany({
            where: { teacherId: teacher.id },
            include: {
                class: {
                    select: { name: true, grade: { select: { name: true } } }
                },
                subject: {
                    select: { name: true }
                }
            }
        });

        console.log("\nTEACHER ASSIGNMENTS IN DB:");
        assignments.forEach(a => {
            console.log(`- Class: ${a.class.grade.name} ${a.class.name}, Subject: ${a.subject.name}`);
        });

    } catch (e) {
        console.error("Prisma error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
