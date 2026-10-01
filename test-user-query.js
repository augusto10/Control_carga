// Teste específico para buscar usuário
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testUserQuery() {
  try {
    console.log('🔍 Buscando usuário admin...');
    
    // Tenta buscar o usuário admin (sem select específico primeiro)
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'admin@controlecarga.com' }
    });
    
    if (usuario) {
      console.log('✅ Usuário encontrado:');
      console.log({
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        tipo: usuario.tipo,
        ativo: usuario.ativo,
        senha: usuario.senha ? '***HASH_PRESENTE***' : 'SEM_SENHA'
      });
    } else {
      console.log('❌ Usuário não encontrado');
      
      // Listar todos os usuários para debug
      console.log('📋 Listando todos os usuários:');
      const todosUsuarios = await prisma.usuario.findMany({
        select: {
          id: true,
          email: true,
          nome: true,
          tipo: true,
          ativo: true
        }
      });
      console.log(todosUsuarios);
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserQuery();
