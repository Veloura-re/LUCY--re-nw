import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const schoolId = "587b37a2-13d0-4ba7-99a7-761585a1dec7"
  const school = await prisma.school.findUnique({ where: { id: schoolId } })
  console.log('School in DB:', JSON.stringify(school, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
