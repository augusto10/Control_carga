const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Verifica se a DATABASE_URL está definida
if (!process.env.DATABASE_URL) {
  console.error('❌ Erro: DATABASE_URL não está definida no arquivo .env');
  process.exit(1);
}

console.log('🔍 Testando conexão direta PostgreSQL...');
console.log(`📡 URL de conexão: ${process.env.DATABASE_URL.split('@')[1]}`);

// Força conexão direta PostgreSQL (bypass do Prisma Data Proxy)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL.replace('prisma+postgres://', 'postgresql://')
    }
  },
  log: ['query', 'info', 'warn', 'error']
});

async function testConnection() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    // Tenta conectar ao banco de dados
    await prisma.$connect();
    console.log('✅ Conexão bem-sucedida!');
    
    // Tenta fazer uma consulta simples
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Consulta de teste bem-sucedida:', result);
    
    // Tenta listar as tabelas
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('📊 Tabelas encontradas no banco de dados:');
    console.log(tables.map(t => t.table_name));
    
    // Testa contagem de registros
    try {
      const usuarioCount = await prisma.usuario.count();
      const controleCount = await prisma.controleCarga.count();
      
      console.log('\n📈 Registros:');
      console.log(`- Usuários: ${usuarioCount}`);
      console.log(`- Controles: ${controleCount}`);
    } catch (e) {
      console.log('⚠️ Tabelas principais não encontradas (banco pode estar vazio)');
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:');
    console.error(error.message);
    
    // Detalhes adicionais sobre o erro
    if (error.code === 'ENOTFOUND') {
      console.error('\n🔴 Erro de DNS: Não foi possível resolver o endereço do servidor de banco de dados.');
      console.error('Verifique sua conexão com a internet e se o endereço do servidor está correto.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n🔴 Tempo limite de conexão excedido.');
      console.error('O servidor de banco de dados pode estar inativo ou inacessível.');
    } else if (error.code === '3D000') {
      console.error('\n🔴 Banco de dados não encontrado.');
      console.error('Verifique se o nome do banco de dados está correto.');
    } else if (error.code === '28P01') {
      console.error('\n🔴 Falha na autenticação.');
      console.error('Verifique o nome de usuário e senha no arquivo .env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🔴 Conexão recusada pelo servidor.');
      console.error('Verifique se o servidor de banco de dados está em execução e acessível.');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
