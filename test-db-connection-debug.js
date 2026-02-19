const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('=== TESTE DE CONEXÃO COM BANCO DE DADOS ===');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não está configurado no arquivo .env');
    return false;
  }

  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

  try {
    console.log('🔄 Testando conexão com o banco de dados...');
    
    // Teste simples de conexão
    await prisma.$connect();
    console.log('✅ Conexão com o banco estabelecida com sucesso!');
    
    // Teste de consulta simples
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Consulta de teste executada com sucesso:', result);
    
    // Teste de consulta à tabela de usuários
    const userCount = await prisma.usuario.count();
    console.log(`✅ Encontrados ${userCount} usuários no banco de dados`);
    
    // Verificar usuário específico do login
    const testEmail = 'logistica.transporte1@esplendoratacadista.com.br';
    const user = await prisma.usuario.findUnique({
      where: { email: testEmail.toLowerCase() },
      select: {
        id: true,
        email: true,
        nome: true,
        tipo: true,
        ativo: true,
        dataCriacao: true,
        ultimoAcesso: true,
      },
    });
    
    if (user) {
      console.log('✅ Usuário de teste encontrado:', {
        id: user.id,
        email: user.email,
        nome: user.nome,
        tipo: user.tipo,
        ativo: user.ativo,
      });
    } else {
      console.log('⚠️  Usuário de teste não encontrado:', testEmail);
      
      // Listar todos os usuários para debug
      const allUsers = await prisma.usuario.findMany({
        select: {
          id: true,
          email: true,
          nome: true,
          tipo: true,
          ativo: true,
        },
        take: 5,
      });
      
      console.log('📋 Primeiros 5 usuários encontrados:');
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.nome}) - ${u.tipo} - ${u.ativo ? 'ativo' : 'inativo'}`);
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro na conexão com o banco de dados:');
    console.error('Tipo do erro:', error.constructor.name);
    console.error('Mensagem:', error.message);
    
    if (error.code) {
      console.error('Código do erro:', error.code);
    }
    
    if (error.meta) {
      console.error('Meta informações:', error.meta);
    }
    
    return false;
    
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Conexão com o banco encerrada');
  }
}

// Executar o teste
testDatabaseConnection().then(success => {
  console.log('\n=== RESUMO DO TESTE ===');
  if (success) {
    console.log('✅ Todos os testes passaram com sucesso!');
    process.exit(0);
  } else {
    console.log('❌ Ocorreram erros durante os testes!');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});
