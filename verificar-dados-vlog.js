const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function verificarDadosVLOG() {
  console.log('=== VERIFICANDO DADOS DE VLOG vs TERCEIRIZADA ===');
  
  // Forçar uso de postgresql:// direto para desenvolvimento local
  let datasourceUrl = process.env.DATABASE_URL;
  if (datasourceUrl.startsWith('prisma+postgres://')) {
    datasourceUrl = datasourceUrl.replace('prisma+postgres://', 'postgresql://');
  }

  const prisma = new PrismaClient({
    datasourceUrl,
    log: ['error', 'warn'],
  });

  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados');

    // 1. Verificar ControleCarga
    console.log('\n📋 VERIFICANDO ControleCarga:');
    const controleQuery = `
      SELECT 
        'ControleCarga' as tabela,
        COUNT(*) as total_terceirizada,
        COUNT(*) FILTER (WHERE motorista ILIKE '%vlog%' OR responsavel ILIKE '%vlog%') as possiveis_vlog
      FROM "ControleCarga" 
      WHERE transportadora = 'TERCEIRIZADA'
    `;
    
    const controleResult = await prisma.$queryRawUnsafe(controleQuery);
    console.log('ControleCarga:', controleResult[0]);

    // Verificar exemplos específicos
    const exemplosControle = await prisma.$queryRawUnsafe(`
      SELECT id, motorista, responsavel, transportadora, observacao
      FROM "ControleCarga" 
      WHERE transportadora = 'TERCEIRIZADA' 
      AND (motorista ILIKE '%vlog%' OR responsavel ILIKE '%vlog%' OR observacao ILIKE '%vlog%')
      LIMIT 5
    `);
    
    if (exemplosControle.length > 0) {
      console.log('\n🔍 Exemplos de ControleCarga que precisam correção:');
      exemplosControle.forEach((item, i) => {
        console.log(`  ${i+1}. ID: ${item.id}`);
        console.log(`     Motorista: ${item.motorista}`);
        console.log(`     Responsável: ${item.responsavel}`);
        console.log(`     Transportadora: ${item.transportadora}`);
        console.log(`     Observação: ${item.observacao || 'N/A'}`);
        console.log('');
      });
    }

    // 2. Verificar Motorista
    console.log('\n📋 VERIFICANDO Motorista:');
    const motoristaQuery = `
      SELECT 
        'Motorista' as tabela,
        COUNT(*) as total_terceirizada,
        COUNT(*) FILTER (WHERE nome ILIKE '%vlog%') as possiveis_vlog
      FROM "Motorista" 
      WHERE "transportadoraId" = 'TERCEIRIZADA'
    `;
    
    const motoristaResult = await prisma.$queryRawUnsafe(motoristaQuery);
    console.log('Motorista:', motoristaResult[0]);

    // Verificar exemplos específicos
    const exemplosMotorista = await prisma.$queryRawUnsafe(`
      SELECT id, nome, "transportadoraId", cnh
      FROM "Motorista" 
      WHERE "transportadoraId" = 'TERCEIRIZADA' 
      AND nome ILIKE '%vlog%'
      LIMIT 5
    `);
    
    if (exemplosMotorista.length > 0) {
      console.log('\n🔍 Exemplos de Motorista que precisam correção:');
      exemplosMotorista.forEach((item, i) => {
        console.log(`  ${i+1}. ID: ${item.id}`);
        console.log(`     Nome: ${item.nome}`);
        console.log(`     Transportadora: ${item.transportadoraId}`);
        console.log(`     CNH: ${item.cnh || 'N/A'}`);
        console.log('');
      });
    }

    // 3. Verificar PalletAjuste
    console.log('\n📋 VERIFICANDO PalletAjuste:');
    const palletQuery = `
      SELECT 
        'PalletAjuste' as tabela,
        COUNT(*) as total_terceirizada,
        COUNT(*) FILTER (WHERE motorista ILIKE '%vlog%' OR observacao ILIKE '%vlog%') as possiveis_vlog
      FROM "PalletAjuste" 
      WHERE transportadora = 'TERCEIRIZADA'
    `;
    
    const palletResult = await prisma.$queryRawUnsafe(palletQuery);
    console.log('PalletAjuste:', palletResult[0]);

    // Verificar exemplos específicos
    const exemplosPallet = await prisma.$queryRawUnsafe(`
      SELECT id, motorista, transportadora, observacao
      FROM "PalletAjuste" 
      WHERE transportadora = 'TERCEIRIZADA' 
      AND (motorista ILIKE '%vlog%' OR observacao ILIKE '%vlog%')
      LIMIT 5
    `);
    
    if (exemplosPallet.length > 0) {
      console.log('\n🔍 Exemplos de PalletAjuste que precisam correção:');
      exemplosPallet.forEach((item, i) => {
        console.log(`  ${i+1}. ID: ${item.id}`);
        console.log(`     Motorista: ${item.motorista || 'N/A'}`);
        console.log(`     Transportadora: ${item.transportadora}`);
        console.log(`     Observação: ${item.observacao || 'N/A'}`);
        console.log('');
      });
    }

    // Resumo final
    const totalPossiveisVLOG = 
      Number(controleResult[0].possiveis_vlog || 0) + 
      Number(motoristaResult[0].possiveis_vlog || 0) + 
      Number(palletResult[0].possiveis_vlog || 0);
    
    console.log('\n📊 RESUMO:');
    console.log(`Total de registros que podem ser da VLOG: ${totalPossiveisVLOG}`);
    
    if (totalPossiveisVLOG > 0) {
      console.log('\n🎯 RECOMENDAÇÃO:');
      console.log('Execute o script de correção para atualizar esses registros para VLOG');
      return true;
    } else {
      console.log('\n✅ Nenhum registro de VLOG encontrado como TERCEIRIZADA');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

verificarDadosVLOG().then((temCorrecoes) => {
  console.log('\n=== FIM DA VERIFICAÇÃO ===');
  if (temCorrecoes) {
    console.log('📝 Pronto para executar as correções');
  } else {
    console.log('✅ Nenhuma correção necessária');
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});
