import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const policies = await prisma.policy.findMany({ orderBy: { updatedAt: 'desc' }, take: 1 });
  console.log(policies[0].acord_fields_json);
}
main().catch(console.error).finally(() => prisma.$disconnect());
