const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const demos = await prisma.$queryRaw`SELECT id, nome, email, tipo FROM "Usuario" WHERE tipo = 'DEMO'`;
    if (!demos || demos.length === 0) {
      console.log('Nenhum usuário com tipo DEMO encontrado.');
    } else {
      console.log('Usuários com tipo DEMO:');
      console.table(demos);
    }
  } catch (err) {
    console.error('Erro ao buscar usuários DEMO:', err && err.message ? err.message : err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
