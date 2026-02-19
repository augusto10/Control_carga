// test-prisma-force-local.js
// Forçar Prisma a usar URL local sem validação de protocolo

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testPrismaForceLocal() {
  console.log('=== TESTE DE PRISMA FORÇADO LOCAL ===');
  
  // URL do banco de dados
  const databaseUrl = process.env.DATABASE_URL;
  console.log('📡 URL do banco:', databaseUrl ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
  
  if (!databaseUrl) {
    console.log('❌ DATABASE_URL não está configurado');
    return;
  }
  
  // Limpar environment variables que possam forçar Prisma Accelerate
  delete process.env.PRISMA_GENERATE_DATAPROXY;
  delete process.env.PRISMA_CLIENT_ENGINE;
  
  // Forçar ambiente de desenvolvimento
  process.env.NODE_ENV = 'development';
  
  console.log('🔧 Variáveis de ambiente limpas para forçar modo local');
  
  try {
    // Criar cliente Prisma com configuração explícita
    const prisma = new PrismaClient({
      log: ['info', 'warn', 'error'],
      errorFormat: 'pretty'
    });
    
    console.log('🔄 Tentando conectar ao Prisma (modo forçado local)...');
    
    // Testar conexão com query simples
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query raw executada com sucesso!');
    
    // Testar com modelo Usuario
    const userCount = await prisma.usuario.count();
    console.log(`👥 Total de usuários: ${userCount}`);
    
    // Listar usuários admin
    const adminUsers = await prisma.usuario.findMany({
      where: { tipo: 'ADMIN' },
      select: {
        id: true,
        nome: true,
        email: true,
        ativo: true
      },
      take: 3
    });
    
    console.log(`👑 Usuários ADMIN encontrados: ${adminUsers.length}`);
    adminUsers.forEach(user => {
      console.log(`   - ${user.nome} (${user.email}) - ${user.ativo ? 'ATIVO' : 'INATIVO'}`);
    });
    
    // Testar ControleCarga
    const controleCount = await prisma.controleCarga.count();
    console.log(`📋 Total de controles de carga: ${controleCount}`);
    
    // Buscar motoristas VLOG
    const vlogCount = await prisma.motorista.count({
      where: { transportadoraId: 'VLOG' }
    });
    console.log(`🏷️ Motoristas VLOG: ${vlogCount}`);
    
    console.log('✅ Todos os testes Prisma concluídos com sucesso!');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Erro na conexão com Prisma:');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensagem:', error.message);
    
    if (error.code) {
      console.error('Código:', error.code);
    }
    
    // Se ainda falhar, tentar abordagem alternativa
    if (error.message.includes('prisma://')) {
      console.log('\n🔄 Tentando abordagem alternativa com URL direta...');
      
      try {
        // Criar cliente com override de datasource
        const prismaAlt = new PrismaClient().$extends({
          query: {
            $allOperations: ({ args, query }) => {
              // Forçar uso de URL postgres://
              if (process.env.DATABASE_URL) {
                args = { ...args, };
              }
              return query(args);
            }
          }
        });
        
        await prismaAlt.usuario.count();
        console.log('✅ Abordagem alternativa funcionou!');
        
      } catch (altError) {
        console.error('❌ Abordagem alternativa também falhou:', altError.message);
      }
    }
  }
}

// Executar teste
testPrismaForceLocal().catch(console.error);
