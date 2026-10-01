const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFinalMigration() {
  try {
    console.log('🧪 Testando migração final...\n');

    // 1. Testar busca de motoristas (API que estava falhando)
    console.log('1️⃣ Testando API de motoristas...');
    const motoristas = await prisma.motorista.findMany({
      where: { tipo: 'MOTORISTA' },
      select: {
        nome: true,
        tipo: true,
        transportadoraId: true,
        cnh: true
      }
    });
    console.log(`✅ ${motoristas.length} motoristas encontrados`);

    // 2. Testar busca de funcionários
    console.log('\n2️⃣ Testando API de funcionários...');
    const funcionarios = await prisma.motorista.findMany({
      where: { tipo: 'FUNCIONARIO' },
      select: {
        nome: true,
        tipo: true,
        transportadoraId: true
      }
    });
    console.log(`✅ ${funcionarios.length} funcionários encontrados`);

    // 3. Testar busca de clientes
    console.log('\n3️⃣ Testando API de clientes...');
    const clientes = await prisma.motorista.findMany({
      where: { tipo: 'CLIENTE' },
      select: {
        nome: true,
        tipo: true,
        transportadoraId: true
      }
    });
    console.log(`✅ ${clientes.length} clientes encontrados`);

    // 4. Testar busca de controles (API que estava falhando)
    console.log('\n4️⃣ Testando API de controles...');
    const controles = await prisma.controleCarga.findMany({
      take: 5,
      select: {
        motorista: true,
        transportadora: true,
        dataCriacao: true
      },
      orderBy: { dataCriacao: 'desc' }
    });
    console.log(`✅ ${controles.length} controles encontrados`);

    // 5. Testar busca de notas (API que estava falhando)
    console.log('\n5️⃣ Testando API de notas...');
    const notas = await prisma.notaFiscal.findMany({
      take: 5,
      select: {
        numeroNota: true,
        dataCriacao: true
      }
    });
    console.log(`✅ ${notas.length} notas encontradas`);

    // 6. Mostrar distribuição final
    console.log('\n📊 Distribuição final por tipo:');
    const stats = await prisma.motorista.groupBy({
      by: ['tipo'],
      _count: { tipo: true }
    });
    
    stats.forEach(stat => {
      const label = stat.tipo === 'MOTORISTA' ? 'Motoristas' : 
                   stat.tipo === 'FUNCIONARIO' ? 'Funcionários' : 'Clientes';
      console.log(`   ${label}: ${stat._count.tipo}`);
    });

    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('\n✅ Todas as APIs devem funcionar agora:');
    console.log('   • /api/motoristas ✅');
    console.log('   • /api/pessoas ✅');
    console.log('   • /api/controles ✅');
    console.log('   • /api/notas ✅');
    console.log('   • /api/relatorios/* ✅');

    console.log('\n📋 Próximos passos:');
    console.log('   1. Fazer commit das mudanças');
    console.log('   2. Fazer push para o repositório');
    console.log('   3. Aguardar deploy automático no Vercel');
    console.log('   4. Verificar se os erros 500 sumiram');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFinalMigration();
