import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient instance to avoid multiple connections
const prisma = new PrismaClient();

export default prisma;
