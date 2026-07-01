import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
// Create PostgreSQL connection pool with optimized settings
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Connection pool optimization
    max: 20, // Maximum number of connections
    min: 5, // Minimum number of connections
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Timeout for acquiring connection
    // Keep connections alive
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});
// Create Prisma adapter
const adapter = new PrismaPg(pool);
// Global Prisma client instance
const globalForPrisma = globalThis;
// Only log errors in development to reduce overhead (change to ['query'] if you need to debug)
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: ['error'],
    });
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=prisma.js.map