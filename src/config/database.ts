import { PrismaClient } from '@prisma/client';
import { config } from './index';

// Create Prisma client instance
export const prisma = new PrismaClient({
  log: config.server.env === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  errorFormat: 'pretty',
});

// Handle cleanup on app termination
const cleanup = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);