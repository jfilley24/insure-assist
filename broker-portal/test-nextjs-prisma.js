const { PrismaClient } = require('./src/lib/db/prisma');
async function run() {
    console.log("STARTING TEST");
    const client = await PrismaClient.client.findFirst({
        include: { policies: true }
    });
    console.log(JSON.stringify(client.policies, null, 2));
}
run();
