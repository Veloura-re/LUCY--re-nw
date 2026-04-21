const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const school = await prisma.school.findFirst()
        if (!school) {
            console.log('No school found to seed books.')
            return
        }

        // Use relation filter to find metadata
        const grade = await prisma.grade.findFirst({ where: { school: { id: school.id } } })
        const subject = await prisma.subject.findFirst({ where: { school: { id: school.id } } })
        const cls = await prisma.class.findFirst({ where: { school: { id: school.id } } })

        if (!grade || !subject || !cls) {
            console.log('Missing metadata (Grade/Subject/Class) to seed books.')
            return
        }

        const books = [
            {
                title: "Quantum Nexus: Tactical Physics",
                author: "Neo Aether",
                description: "Advanced principles of tactical physics for the neural synchronization era.",
                fileUrl: "https://example.com/books/physics.pdf",
                schoolId: school.id,
                gradeId: grade.id,
                classId: cls.id,
                subjectId: subject.id,
                academicYear: "2024",
                edition: "1st Ed"
            },
            {
                title: "LUCY OS Operating Protocol",
                author: "DeepMind Tactical",
                description: "Official documentation for operating the LUCY Tactical OS.",
                fileUrl: "https://example.com/books/lucy-os.pdf",
                schoolId: school.id,
                gradeId: grade.id,
                classId: cls.id,
                subjectId: subject.id,
                academicYear: "2024",
                edition: "Rev 4.2"
            }
        ]

        for (const book of books) {
            await prisma.book.create({ data: book }).catch(e => {
                console.log(`Could not seed ${book.title}:`, e.message)
            })
        }
        console.log('Sample books seeding process finished.')
    } catch (err) {
        console.error(err)
    } finally {
        await prisma.$disconnect()
    }
}

main()
