const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFixDatas() {
  try {
    console.log('🧪 Testando correção de datas...\n');

    // Simular o novo filtro corrigido
    const dataInicio = '2025-09-01';
    const dataFim = '2025-09-30';
    
    console.log(`📅 Testando período: ${dataInicio} até ${dataFim}`);
    
    // Aplicar a correção
    const dataInicioDate = new Date(dataInicio + 'T00:00:00.000Z');
    const dataFimDate = new Date(dataFim + 'T23:59:59.999Z');
    
    console.log(`   Data início UTC: ${dataInicioDate.toISOString()}`);
    console.log(`   Data fim UTC: ${dataFimDate.toISOString()}`);

    // Testar o filtro corrigido
    const filtros = {
      dataCriacao: {
        gte: dataInicioDate,
        lte: dataFimDate
      }
    };

    const controlesEncontrados = await prisma.controleCarga.findMany({
      where: filtros,
      select: {
        id: true,
        motorista: true,
        transportadora: true,
        dataCriacao: true,
        qtdPalletsLevados: true,
        qtdPalletsDevolvidos: true
      }
    });

    console.log(`\n✅ Controles encontrados com filtro corrigido: ${controlesEncontrados.length}`);
    
    if (controlesEncontrados.length > 0) {
      console.log('\n📊 Detalhes dos controles:');
      controlesEncontrados.forEach((controle, index) => {
        const dataLocal = controle.dataCriacao.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        console.log(`${index + 1}. ${controle.motorista} (${controle.transportadora})`);
        console.log(`   Data: ${dataLocal}`);
        console.log(`   Pallets: ${controle.qtdPalletsLevados || 0} levados, ${controle.qtdPalletsDevolvidos || 0} devolvidos`);
      });

      // Simular agrupamento como na API de pallets
      const agrupamento = new Map();
      
      controlesEncontrados.forEach(controle => {
        const chave = `${controle.motorista}|${controle.transportadora}`;
        
        if (agrupamento.has(chave)) {
          const item = agrupamento.get(chave);
          item.totalPalletsLevados += controle.qtdPalletsLevados || 0;
          item.totalPalletsDevolvidos += controle.qtdPalletsDevolvidos || 0;
          item.totalControles += 1;
        } else {
          agrupamento.set(chave, {
            motorista: controle.motorista,
            transportadora: controle.transportadora,
            totalPalletsLevados: controle.qtdPalletsLevados || 0,
            totalPalletsDevolvidos: controle.qtdPalletsDevolvidos || 0,
            totalControles: 1
          });
        }
      });

      console.log('\n📈 Agrupamento por motorista/transportadora:');
      Array.from(agrupamento.values()).forEach((item, index) => {
        const diferenca = item.totalPalletsLevados - item.totalPalletsDevolvidos;
        console.log(`${index + 1}. ${item.motorista} (${item.transportadora})`);
        console.log(`   Controles: ${item.totalControles}`);
        console.log(`   Pallets: ${item.totalPalletsLevados} levados, ${item.totalPalletsDevolvidos} devolvidos`);
        console.log(`   Diferença: ${diferenca}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFixDatas();
