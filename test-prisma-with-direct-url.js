// test-prisma-with-direct-url.js
// Teste de Prisma com URL PostgreSQL direta (sem Prisma Accelerate)

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testPrismaWithDirectURL() {
  console.log('=== TESTE DE PRISMA COM URL DIRETA ===');
  
  // URL do banco de dados
  const databaseUrl = process.env.DATABASE_URL;
  console.log('📡 URL do banco:', databaseUrl ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
  
  if (!databaseUrl) {
    console.log('❌ DATABASE_URL não está configurado');
    return;
  }
  
  // Criar cliente Prisma com URL direta
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: ['warn', 'error']
  });
  
  try {
    console.log('🔄 Conectando ao Prisma...');
    await prisma.$connect();
    console.log('✅ Conectado com sucesso ao Prisma!');
    
    // Testar query simples
    console.log('🔍 Testando query Prisma...');
    const userCount = await prisma.usuario.count();
    console.log(`👥 Total de usuários: ${userCount}`);
    
    // Listar usuários admin
    console.log('👑 Buscando usuários ADMIN...');
    const adminUsers = await prisma.usuario.findMany({
      where: { tipo: 'ADMIN' },
      select: {
        id: true,
        nome: true,
        email: true,
        ativo: true,
        dataCriacao: true
      },
      take: 5
    });
    
    console.log(`✅ Encontrados ${adminUsers.length} usuários ADMIN:`);
    adminUsers.forEach(user => {
      console.log(`   - ${user.nome} (${user.email}) - ${user.ativo ? 'ATIVO' : 'INATIVO'}`);
    });
    
    // Testar ControleCarga
    console.log('📊 Testando ControleCarga...');
    const controleCount = await prisma.controleCarga.count();
    console.log(`📋 Total de controles de carga: ${controleCount}`);
    
    if (controleCount > 0) {
      const recentControles = await prisma.controleCarga.findMany({
        take: 3,
        orderBy: { dataCriacao: 'desc' },
        select: {
          id: true,
          motorista: true,
          transportadora: true,
          dataCriacao: true,
          finalizado: true
        }
      });
      
      console.log('📋 Controles recentes:');
      recentControles.forEach(controle => {
        console.log(`   - ${controle.motorista} (${controle.transportadora}) - ${controle.finalizado ? 'FINALIZADO' : 'ABERTO'}`);
      });
    }
    
    // Testar Motoristas
    console.log('🚚 Testando Motoristas...');
    const motoristaCount = await prisma.motorista.count();
    console.log(`👨‍✈️ Total de motoristas: ${motoristaCount}`);
    
    // Buscar motoristas VLOG
    const vlogMotoristas = await prisma.motorista.findMany({
      where: { transportadoraId: 'VLOG' },
      take: 5
    });
    
    console.log(`🏷️ Motoristas VLOG encontrados: ${vlogMotoristas.length}`);
    vlogMotoristas.forEach(motorista => {
      console.log(`   - ${motorista.nome}`);
    });
    
    console.log('✅ Todos os testes Prisma concluídos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na conexão com Prisma:');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensagem:', error.message);
    
    if (error.code) {
      console.error('Código Prisma:', error.code);
    }
    
    // Dicas específicas para erros do Prisma
    if (error.message.includes('prisma://') || error.message.includes('prisma+postgres://')) {
      console.log('\n🔧 DICA: Prisma está esperando URL do Prisma Accelerate');
      console.log('   - Para desenvolvimento local, use URL postgres:// normal');
      console.log('   - Verifique se não há configuração de Prisma Accelerate ativa');
      console.log('   - Adicione PRISMA_GENERATE_DATAPROXY=false ao .env');
    }
    
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Conexão Prisma encerrada');
  }
}

// Executar teste
testPrismaWithDirectURL().catch(console.error);
