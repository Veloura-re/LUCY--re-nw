import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'goodluck97248@gmail.com' }
  })
  
  if (user) {
    console.log('User found:', JSON.stringify(user, null, 2))
  } else {
    console.log('User not found: goodluck97248@gmail.com')
    const allUsers = await prisma.user.findMany({ select: { email: true, role: true } })
    console.log('Existing users emails:', allUsers.map(u => u.email))
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
