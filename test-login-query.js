// Testar a consulta específica usada na API de login
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testLoginQuery() {
  try {
    console.log('🔍 Testando consulta específica do login...');
    
    const email = 'admin@controlecarga.com';
    console.log('📧 Buscando usuário:', email);
    
    // Exatamente a mesma consulta da API de login
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        senha: true,
        nome: true,
        tipo: true,
        ativo: true,
        dataCriacao: true,
        ultimoAcesso: true,
      },
    });
    
    if (usuario) {
      console.log('✅ Usuário encontrado:');
      console.log({
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        tipo: usuario.tipo,
        ativo: usuario.ativo,
        dataCriacao: usuario.dataCriacao,
        ultimoAcesso: usuario.ultimoAcesso,
        senha: usuario.senha ? '***HASH_PRESENTE***' : 'SEM_SENHA'
      });
      
      // Testar comparação de senha
      const bcrypt = require('bcryptjs');
      const senhaTest = '12345678';
      
      console.log('🔐 Testando comparação de senha...');
      const senhaValida = await bcrypt.compare(senhaTest, usuario.senha);
      console.log('Senha válida:', senhaValida);
      
    } else {
      console.log('❌ Usuário não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro na consulta:', error);
    console.error('Código:', error.code);
    console.error('Mensagem:', error.message);
    
    if (error.message.includes('Unknown argument')) {
      console.log('💡 Problema: Campo não existe no modelo');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testLoginQuery();
