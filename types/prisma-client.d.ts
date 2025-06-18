import { PrismaClient } from '@prisma/client';

declare module 'lib/prisma' {
  const prisma: PrismaClient;
  export default prisma;
}
