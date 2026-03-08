const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding MVP mock data...');

    // 1. Create a Mock Broker to satisfy the Foreign Key constraint for Clients
    const broker = await prisma.broker.upsert({
        where: { ingestionDomain: '@wfains.com' },
        update: {},
        create: {
            id: "test-broker-123", // Matches the hardcoded ID in AddClientSheet for MVP testing
            name: 'WFA Insurance Agency',
            ingestionDomain: '@wfains.com',
            brokerAdminIds: 'mock-admin-uid-1,mock-admin-uid-2',
        },
    });

    console.log('Created Mock Broker:', broker.name);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
