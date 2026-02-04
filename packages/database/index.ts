import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    }).$extends({
        query: {
            $allModels: {
                async findMany({ args, query }) {
                    // RLS LOGIC PLACEHOLDER
                    // In a real implementation, we would extract the current Tenant ID from the Context/AsyncLocalStorage
                    // and inject it into the query args.
                    // Example: args.where = { ...args.where, organizationId: currentTenantId }
                    return query(args);
                }
            }
        }
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma as unknown as PrismaClient;
