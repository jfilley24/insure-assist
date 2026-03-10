import { Prisma, PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient()
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Creates a secure, tenant-isolated Prisma client using Prisma Client Extensions.
 * This dynamically intercepts queries and forces Row-Level Security (RLS) constraints
 * based on the decoded Firebase Token.
 * 
 * @param token Firebase DecodedIdToken containing `role`, `brokerId`, and `uid`
 */
export function getSecurePrisma(token: any) {
    if (!token || !token.brokerId) {
        throw new Error("Secure Prisma Initialization Failed: Missing brokerId in token.");
    }

    const brokerId = token.brokerId;
    const uid = token.uid;
    const isBrokerAdmin = token.role === 'broker_admin';

    // Base filter applied to everyone (Tenant Isolation)
    const baseFilter: any = { brokerId };

    // Agent Isolation: Only Agents are locked to their specific agentId. Admins see all.
    if (!isBrokerAdmin) {
        baseFilter.agentId = uid;
    }

    // Extended client
    return prisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    // Models that should be isolated by Broker/Agent
                    // Note: Policy is implicitly isolated because we always fetch/verify the Client first.
                    const isolatedModels = ['Client', 'COIRequest', 'CommunicationLog'];

                    if (isolatedModels.includes(model as string)) {
                        const anyArgs = args as any;

                        // For find, update, delete operations, merge the RLS filter into the `where` clause
                        if (['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate'].includes(operation)) {
                            if (!anyArgs) args = {} as any;
                            anyArgs.where = { ...anyArgs?.where, ...baseFilter };
                        }

                        // For create operations, forcefully inject the owner fields
                        if (['create', 'createMany'].includes(operation)) {
                            if (!anyArgs) args = {} as any;
                            if (operation === 'create') {
                                anyArgs.data = { ...anyArgs?.data, ...baseFilter };
                            } else if (operation === 'createMany' && Array.isArray(anyArgs?.data)) {
                                anyArgs.data = anyArgs.data.map((item: any) => ({ ...item, ...baseFilter }));
                            }
                        }
                    }

                    return query(args);
                }
            }
        }
    });
}
