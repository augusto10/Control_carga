const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testLocalPostgresConnection() {
  console.log('=== TESTE DE CONEXÃO COM POSTGRES LOCAL ===');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não está configurado no arquivo .env');
    return false;
  }

  // Usar PostgreSQL direto para desenvolvimento local
  let datasourceUrl = process.env.DATABASE_URL;
  
  // Garantir que estamos usando postgresql:// para desenvolvimento local
  if (datasourceUrl.startsWith('postgres://')) {
    console.log('✅ Usando URL PostgreSQL local (já está no formato correto)');
  } else if (datasourceUrl.startsWith('prisma+postgres://')) {
    datasourceUrl = datasourceUrl.replace('prisma+postgres://', 'postgresql://');
    console.log('🔄 Convertendo prisma+postgres:// para postgresql://');
  } else if (datasourceUrl.startsWith('postgresql://')) {
    console.log('✅ Usando URL PostgreSQL local (já está no formato correto)');
  } else {
    console.error('❌ Formato de URL não suportado:', datasourceUrl.split('://')[0] + '://');
    return false;
  }

  console.log('🔗 URL de conexão (formato):', datasourceUrl.split('://')[0] + '://***');

  // Criar Prisma Client sem validação de schema
  const prisma = new PrismaClient({
    datasourceUrl,
    log: ['error', 'warn', 'query'],
  });

  try {
    console.log('🔄 Testando conexão com PostgreSQL local...');
    
    // Teste simples de conexão
    await prisma.$connect();
    console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
    
    // Teste de consulta simples
    const result = await prisma.$queryRaw`SELECT 1 as test, version() as version`;
    console.log('✅ Consulta de teste executada com sucesso:', result);
    
    // Listar tabelas disponíveis
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    console.log('✅ Tabelas encontradas no banco:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Teste de consulta à tabela de usuários (se existir)
    try {
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
    } catch (userError) {
      console.log('⚠️  Erro ao consultar tabela de usuários (pode não existir ainda):', userError.message);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro na conexão com PostgreSQL:');
    console.error('Tipo do erro:', error.constructor.name);
    console.error('Mensagem:', error.message);
    
    if (error.code) {
      console.error('Código do erro:', error.code);
      
      // Erros comuns e suas soluções
      switch (error.code) {
        case 'ECONNREFUSED':
          console.error('🔧 Solução: Verifique se o PostgreSQL está rodando na porta 5432');
          break;
        case '28P01': // authentication
          console.error('🔧 Solução: Verifique usuário e senha do PostgreSQL');
          break;
        case '3D000': // database does not exist
          console.error('🔧 Solução: Crie o banco de dados "controle_carga_local"');
          break;
        default:
          console.error('🔧 Verifique a configuração do PostgreSQL');
      }
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
testLocalPostgresConnection().then(success => {
  console.log('\n=== RESUMO DO TESTE ===');
  if (success) {
    console.log('✅ Todos os testes passaram com sucesso!');
    console.log('🔧 O sistema está pronto para usar o login!');
    process.exit(0);
  } else {
    console.log('❌ Ocorreram erros durante os testes!');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});
