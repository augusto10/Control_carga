const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugDatas() {
  try {
    console.log('🕐 Investigando problema de datas...\n');

    // 1. Ver as datas exatas dos controles
    const controles = await prisma.controleCarga.findMany({
      select: {
        id: true,
        motorista: true,
        dataCriacao: true
      },
      orderBy: {
        dataCriacao: 'desc'
      }
    });

    console.log('📅 Datas exatas dos controles no banco:');
    controles.forEach((controle, index) => {
      console.log(`${index + 1}. ${controle.motorista}: ${controle.dataCriacao.toISOString()}`);
    });

    // 2. Simular o filtro que está sendo usado na API
    console.log('\n🔍 Simulando filtro da API:');
    
    const dataInicio = '2025-09-01';
    const dataFim = '2025-09-30';
    
    console.log(`   dataInicio string: ${dataInicio}`);
    console.log(`   dataFim string: ${dataFim}`);
    
    const dataInicioDate = new Date(dataInicio);
    const dataFimDate = new Date(dataFim);
    dataFimDate.setHours(23, 59, 59, 999);
    
    console.log(`   dataInicio Date: ${dataInicioDate.toISOString()}`);
    console.log(`   dataFim Date: ${dataFimDate.toISOString()}`);

    // 3. Testar o filtro exato
    const filtros = {
      dataCriacao: {
        gte: dataInicioDate,
        lte: dataFimDate
      }
    };

    console.log('\n🎯 Testando filtro:');
    console.log('   Filtro:', JSON.stringify(filtros, null, 2));

    const controlesEncontrados = await prisma.controleCarga.findMany({
      where: filtros,
      select: {
        id: true,
        motorista: true,
        dataCriacao: true
      }
    });

    console.log(`\n📊 Controles encontrados com filtro: ${controlesEncontrados.length}`);
    controlesEncontrados.forEach((controle, index) => {
      console.log(`${index + 1}. ${controle.motorista}: ${controle.dataCriacao.toISOString()}`);
    });

    // 4. Testar sem filtro de data fim
    console.log('\n🧪 Testando apenas com data início:');
    const controlesApenaInicio = await prisma.controleCarga.findMany({
      where: {
        dataCriacao: {
          gte: dataInicioDate
        }
      },
      select: {
        id: true,
        motorista: true,
        dataCriacao: true
      }
    });

    console.log(`   Encontrados: ${controlesApenaInicio.length}`);

    // 5. Testar com data de hoje
    console.log('\n📆 Testando com data de hoje:');
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999);
    
    console.log(`   Início hoje: ${inicioHoje.toISOString()}`);
    console.log(`   Fim hoje: ${fimHoje.toISOString()}`);

    const controlesHoje = await prisma.controleCarga.findMany({
      where: {
        dataCriacao: {
          gte: inicioHoje,
          lte: fimHoje
        }
      },
      select: {
        id: true,
        motorista: true,
        dataCriacao: true
      }
    });

    console.log(`   Controles hoje: ${controlesHoje.length}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDatas();
