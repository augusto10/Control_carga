// test-prisma-final.js
// Teste final do Prisma com URL fixa

const { PrismaClient } = require('@prisma/client');

async function testPrismaFinal() {
  console.log('=== TESTE FINAL DO PRISMA ===');
  
  // Forçar URL do banco
  const databaseUrl = 'postgres://postgres:suporteadmin@localhost:5432/controle_carga_local?sslmode=disable';
  console.log('📡 URL do banco:', '***CONFIGURADO***');
  
  // Criar cliente Prisma com URL explícita
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: ['info', 'warn', 'error']
  });
  
  try {
    console.log('🔄 Conectando ao Prisma...');
    await prisma.$connect();
    console.log('✅ Conectado com sucesso ao Prisma!');
    
    // Testar query simples
    const userCount = await prisma.usuario.count();
    console.log(`👥 Total de usuários: ${userCount}`);
    
    // Listar usuários admin
    const adminUsers = await prisma.usuario.findMany({
      where: { tipo: 'ADMIN' },
      select: {
        id: true,
        nome: true,
        email: true,
        ativo: true,
        dataCriacao: true
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
    
  } catch (error) {
    console.error('❌ Erro na conexão com Prisma:');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensagem:', error.message);
    
    if (error.code) {
      console.error('Código:', error.code);
    }
    
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Conexão Prisma encerrada');
  }
}

// Executar teste
testPrismaFinal().catch(console.error);
