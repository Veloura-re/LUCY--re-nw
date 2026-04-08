const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const count = await prisma.book.count()
        console.log('Total books:', count)
        if (count > 0) {
            const books = await prisma.book.findMany({
                take: 5,
                include: { school: { select: { name: true } } }
            })
            console.log('Sample books:', JSON.stringify(books, null, 2))
        }
    } catch (err) {
        console.error(err)
    } finally {
        await prisma.$disconnect()
    }
}

main()
