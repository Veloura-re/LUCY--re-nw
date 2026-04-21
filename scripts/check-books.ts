import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const count = await prisma.book.count()
    console.log('Total books:', count)
    if (count > 0) {
        const books = await prisma.book.findMany({
            take: 5,
            include: { school: true }
        })
        console.log('Sample books:', JSON.stringify(books, null, 2))
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
