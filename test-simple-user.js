// Teste simples de consulta de usuário
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testSimpleUser() {
  try {
    console.log('🔍 Testando consulta simples de usuário...');
    
    // Primeiro, tentar contar usuários
    const count = await prisma.usuario.count();
    console.log(`📊 Total de usuários: ${count}`);
    
    // Tentar buscar todos os usuários (limitado)
    const usuarios = await prisma.usuario.findMany({
      take: 3
    });
    
    console.log('👥 Usuários encontrados:');
    usuarios.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.nome} (${user.tipo})`);
    });
    
  } catch (error) {
    console.error('❌ Erro na consulta:', error);
    console.error('Código do erro:', error.code);
    console.error('Mensagem:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSimpleUser();
