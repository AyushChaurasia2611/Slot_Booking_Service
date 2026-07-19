import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing from .env');
}

if (process.env.NODE_ENV === 'production') {
  const adapter = new PrismaBetterSqlite3({ url: connectionString });
  prisma = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaBetterSqlite3({ url: connectionString });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };
