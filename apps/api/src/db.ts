import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';
export function database() {
 if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
 return new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
}
