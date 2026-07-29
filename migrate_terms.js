const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const schools = await prisma.school.findMany({ include: { terms: true } });
    
    for (const school of schools) {
        let activeTerm = school.terms.find(t => t.isActive);
        if (!activeTerm && school.terms.length > 0) {
            activeTerm = school.terms[0];
        }
        
        if (activeTerm) {
            // Update Exams
            const eRes = await prisma.exam.updateMany({
                where: { class: { grade: { schoolId: school.id } }, termId: null },
                data: { termId: activeTerm.id }
            });
            console.log(`Updated ${eRes.count} exams for school ${school.name}`);
            
            // Update MarklistConfig
            const mRes = await prisma.marklistConfig.updateMany({
                where: { schoolId: school.id, termId: null },
                data: { termId: activeTerm.id }
            });
            console.log(`Updated ${mRes.count} marklist configs for school ${school.name}`);
            
            // Update Remarks
            const rRes = await prisma.studentRemark.updateMany({
                where: { student: { schoolId: school.id }, termId: null },
                data: { termId: activeTerm.id }
            });
            console.log(`Updated ${rRes.count} remarks for school ${school.name}`);
        }
    }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
