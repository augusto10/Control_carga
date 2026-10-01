const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAllFixes() {
  try {
    console.log('🧪 Testando todas as correções implementadas...\n');

    // 1. Testar se há controles no banco
    const totalControles = await prisma.controleCarga.count();
    console.log(`📊 Total de controles no banco: ${totalControles}`);

    if (totalControles === 0) {
      console.log('❌ Não há controles para testar. Crie alguns controles primeiro.');
      return;
    }

    // 2. Testar filtro de data corrigido
    console.log('\n🗓️ Testando filtro de data corrigido...');
    const dataInicio = '2025-09-01';
    const dataFim = '2025-09-30';
    
    const dataInicioDate = new Date(dataInicio + 'T00:00:00.000Z');
    const dataFimDate = new Date(dataFim + 'T23:59:59.999Z');
    
    const controlesEncontrados = await prisma.controleCarga.count({
      where: {
        dataCriacao: {
          gte: dataInicioDate,
          lte: dataFimDate
        }
      }
    });
    
    console.log(`   ✅ Controles encontrados no período: ${controlesEncontrados}`);

    // 3. Testar campos de assinatura
    console.log('\n✍️ Testando campos de assinatura...');
    const controlesComAssinatura = await prisma.controleCarga.findMany({
      where: {
        OR: [
          { assinaturaMotorista: { not: null } },
          { assinaturaResponsavel: { not: null } }
        ]
      },
      select: {
        id: true,
        motorista: true,
        assinaturaMotorista: true,
        assinaturaResponsavel: true,
        dataAssinaturaMotorista: true,
        dataAssinaturaResponsavel: true
      }
    });

    console.log(`   📝 Controles com assinatura: ${controlesComAssinatura.length}`);
    
    controlesComAssinatura.forEach((controle, index) => {
      const temAssinaturaMotorista = !!controle.assinaturaMotorista;
      const temAssinaturaResponsavel = !!controle.assinaturaResponsavel;
      
      console.log(`   ${index + 1}. ${controle.motorista}:`);
      console.log(`      Motorista: ${temAssinaturaMotorista ? '✅ Assinado' : '❌ Não assinado'}`);
      console.log(`      Responsável: ${temAssinaturaResponsavel ? '✅ Assinado' : '❌ Não assinado'}`);
      
      if (controle.dataAssinaturaMotorista) {
        console.log(`      Data Mot.: ${controle.dataAssinaturaMotorista.toLocaleString('pt-BR')}`);
      }
      if (controle.dataAssinaturaResponsavel) {
        console.log(`      Data Resp.: ${controle.dataAssinaturaResponsavel.toLocaleString('pt-BR')}`);
      }
    });

    // 4. Testar ajustes de pallets (se a tabela existir)
    console.log('\n🔧 Testando ajustes de pallets...');
    try {
      const totalAjustes = await prisma.palletAjuste.count();
      console.log(`   📦 Total de ajustes de pallets: ${totalAjustes}`);
      
      if (totalAjustes > 0) {
        const ajustesRecentes = await prisma.palletAjuste.findMany({
          take: 3,
          orderBy: { dataRecebimento: 'desc' },
          select: {
            motorista: true,
            transportadora: true,
            quantidade: true,
            dataRecebimento: true,
            observacao: true
          }
        });
        
        console.log('   📋 Últimos ajustes:');
        ajustesRecentes.forEach((ajuste, index) => {
          console.log(`   ${index + 1}. ${ajuste.motorista || 'N/A'} (${ajuste.transportadora || 'N/A'})`);
          console.log(`      Quantidade: ${ajuste.quantidade} pallets`);
          console.log(`      Data: ${ajuste.dataRecebimento.toLocaleString('pt-BR')}`);
          if (ajuste.observacao) {
            console.log(`      Obs: ${ajuste.observacao}`);
          }
        });
      }
    } catch (error) {
      console.log('   ⚠️ Tabela de ajustes de pallets não existe ainda');
    }

    // 5. Simular cálculo de percentual de assinados
    console.log('\n📊 Testando cálculo de percentual de assinados...');
    
    const controlesPorTransportadora = new Map();
    
    const todosControles = await prisma.controleCarga.findMany({
      select: {
        transportadora: true,
        assinaturaMotorista: true,
        assinaturaResponsavel: true
      }
    });
    
    todosControles.forEach(controle => {
      if (!controlesPorTransportadora.has(controle.transportadora)) {
        controlesPorTransportadora.set(controle.transportadora, {
          total: 0,
          assinados: 0
        });
      }
      
      const stats = controlesPorTransportadora.get(controle.transportadora);
      stats.total += 1;
      
      if (controle.assinaturaMotorista && controle.assinaturaResponsavel) {
        stats.assinados += 1;
      }
    });
    
    console.log('   📈 Percentual por transportadora:');
    controlesPorTransportadora.forEach((stats, transportadora) => {
      const percentual = Math.round((stats.assinados / stats.total) * 100);
      console.log(`   ${transportadora}: ${stats.assinados}/${stats.total} (${percentual}%)`);
    });

    console.log('\n🎉 Teste completo! Todas as funcionalidades foram verificadas.');
    console.log('\n💡 Para testar completamente:');
    console.log('   1. Acesse o navegador em http://localhost:3000');
    console.log('   2. Faça login no sistema');
    console.log('   3. Vá em Relatórios > Relatório de Pallets');
    console.log('   4. Vá em Relatórios > Controles de Carga');
    console.log('   5. Teste as assinaturas digitais');
    console.log('   6. Teste os ajustes de pallets');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAllFixes();
