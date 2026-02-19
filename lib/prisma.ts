import { PrismaClient } from '@prisma/client';

// Adiciona o PrismaClient ao objeto global em desenvolvimento para evitar
// esgotar o limite de conexões do banco de dados.
// Saiba mais: https://pris.ly/d/help/next-js-best-practices

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

