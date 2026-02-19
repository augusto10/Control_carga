const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('Testando conexão com o banco...');

    // Teste simples: contar controles
    const count = await prisma.controleCarga.count();
    console.log(`✅ Conexão OK! Total de controles: ${count}`);

    // Teste: listar apenas IDs para verificar se funciona
    const controles = await prisma.controleCarga.findMany({
      select: { id: true },
      take: 5
    });

    console.log(`✅ Query OK! Encontrados ${controles.length} controles (mostrando até 5)`);

  } catch (error) {
    console.error('❌ Erro de conexão:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
