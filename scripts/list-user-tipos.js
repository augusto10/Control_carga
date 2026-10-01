const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const tipos = await prisma.$queryRaw`SELECT DISTINCT "tipo" FROM "Usuario"`;
    console.log('Valores distintos em Usuario.tipo:');
    console.table(tipos);
  } catch (err) {
    console.error('Erro ao consultar tipos de usuário:', err && err.message ? err.message : err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
