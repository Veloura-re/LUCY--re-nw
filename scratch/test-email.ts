import { sendInviteEmail } from '../lib/email';
import { prisma } from '../lib/prisma';

async function main() {
    const res = await sendInviteEmail("lucyosck21@gmail.com", "http://test", "Test School", "token123", "PRINCIPAL", "test-school");
    console.log(res);
}
main().catch(console.error);
