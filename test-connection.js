const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Testando conexão com o banco...');

    // Teste básico de conexão
    await prisma.$connect();
    console.log('✅ Conexão estabelecida com sucesso');

    // Teste de query simples
    const count = await prisma.usuario.count();
    console.log(`✅ Query executada: ${count} usuários encontrados`);

    // Teste de controles
    const controlesCount = await prisma.controleCarga.count();
    console.log(`✅ Controles: ${controlesCount} registros`);

  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    console.error('Código do erro:', error.code);
    console.error('Meta:', error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
