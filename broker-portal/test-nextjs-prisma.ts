import { prisma } from './src/lib/db/prisma';

async function run() {
    console.log("STARTING TEST");
    const policies = await prisma.policy.findMany({ take: 1, orderBy: { uploadedAt: 'desc' } });
    console.log(JSON.stringify(policies, null, 2));
}
run();
