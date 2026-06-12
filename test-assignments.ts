import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const schoolId = 'dummy'; // We just want to see if it throws on types
    try {
        const assignments = await prisma.assignment.findMany({
            where: { schoolId, isPublished: true },
            include: { subject: { select: { name: true } } }
        });
        console.log("assignments ok");

        const statusCounts = await prisma.assignmentSubmission.groupBy({
            by: ['status'],
            where: { schoolId },
            _count: true
        });
        console.log("groupBy ok", statusCounts);
        
        const oversight = await prisma.assignment.findMany({
            where: { schoolId, isPublished: true },
            include: {
                class: { select: { name: true } },
                subject: { select: { name: true } },
                teacher: { select: { name: true } },
                _count: { select: { submissions: true } }
            },
            orderBy: { dueDate: 'asc' },
            take: 50
        });
        console.log("oversight ok");
    } catch (e) {
        console.error("ERROR", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
