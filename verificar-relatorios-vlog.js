const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function verificarRelatoriosVLOG() {
  console.log('=== VERIFICANDO RELATÓRIOS VLOG ===');
  
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

    // 1. Verificar ControleCarga com VLOG
    console.log('\n🔍 CONTROLES DE CARGA COM VLOG:');
    const controlesVLOG = await prisma.$queryRawUnsafe(`
      SELECT 
        id, 
        motorista, 
        transportadora, 
        "dataCriacao",
        CASE 
          WHEN motorista ILIKE '%vlog%' OR responsavel ILIKE '%vlog%' OR observacao ILIKE '%vlog%' 
          THEN 'POSSUI VLOG NO TEXTO'
          ELSE 'SEM VLOG NO TEXTO'
        END as indicacao_vlog
      FROM "ControleCarga" 
      WHERE (
        transportadora = 'VLOG' OR 
        motorista ILIKE '%vlog%' OR 
        responsavel ILIKE '%vlog%' OR 
        observacao ILIKE '%vlog%'
      )
      ORDER BY "dataCriacao" DESC
      LIMIT 10
    `);
    
    console.log(`Encontrados ${controlesVLOG.length} controles relacionados à VLOG:`);
    controlesVLOG.forEach((controle, i) => {
      console.log(`  ${i+1}. ID: ${controle.id}`);
      console.log(`     Motorista: ${controle.motorista}`);
      console.log(`     Transportadora: ${controle.transportadora}`);
      console.log(`     Indicação VLOG: ${controle.indicacao_vlog}`);
      console.log(`     Data: ${new Date(controle.dataCriacao).toLocaleDateString('pt-BR')}`);
      console.log('');
    });

    // 2. Verificar PalletAjuste com VLOG
    console.log('\n🔍 AJUSTES DE PALLETS COM VLOG:');
    const palletsVLOG = await prisma.$queryRawUnsafe(`
      SELECT 
        id, 
        motorista, 
        transportadora, 
        quantidade,
        "dataRecebimento",
        CASE 
          WHEN motorista ILIKE '%vlog%' OR observacao ILIKE '%vlog%' 
          THEN 'POSSUI VLOG NO TEXTO'
          ELSE 'SEM VLOG NO TEXTO'
        END as indicacao_vlog
      FROM "PalletAjuste" 
      WHERE (
        transportadora = 'VLOG' OR 
        motorista ILIKE '%vlog%' OR 
        observacao ILIKE '%vlog%'
      )
      ORDER BY "dataRecebimento" DESC
      LIMIT 10
    `);
    
    console.log(`Encontrados ${palletsVLOG.length} ajustes de pallets relacionados à VLOG:`);
    palletsVLOG.forEach((pallet, i) => {
      console.log(`  ${i+1}. ID: ${pallet.id}`);
      console.log(`     Motorista: ${pallet.motorista}`);
      console.log(`     Transportadora: ${pallet.transportadora}`);
      console.log(`     Quantidade: ${pallet.quantidade}`);
      console.log(`     Indicação VLOG: ${pallet.indicacao_vlog}`);
      console.log(`     Data: ${new Date(pallet.dataRecebimento).toLocaleDateString('pt-BR')}`);
      console.log('');
    });

    // 3. Verificar inconsistências específicas dos relatórios
    console.log('\n🚨 INCONSISTÊNCIAS ESPECÍFICAS DOS RELATÓRIOS:');
    
    // Controles onde o texto indica VLOG mas transportadora não é VLOG
    const inconsistenciasControles = controlesVLOG.filter(c => 
      c.indicacao_vlog === 'POSSUI VLOG NO TEXTO' && c.transportadora !== 'VLOG'
    );
    
    // Pallets onde o texto indica VLOG mas transportadora não é VLOG
    const inconsistenciasPallets = palletsVLOG.filter(p => 
      p.indicacao_vlog === 'POSSUI VLOG NO TEXTO' && p.transportadora !== 'VLOG'
    );
    
    console.log(`Controles com VLOG no texto mas transportadora incorreta: ${inconsistenciasControles.length}`);
    inconsistenciasControles.forEach((controle, i) => {
      console.log(`  ${i+1}. ID: ${controle.id} - ${controle.motorista} - Atual: ${controle.transportadora} → Deveria ser: VLOG`);
    });
    
    console.log(`\nPallets com VLOG no texto mas transportadora incorreta: ${inconsistenciasPallets.length}`);
    inconsistenciasPallets.forEach((pallet, i) => {
      console.log(`  ${i+1}. ID: ${pallet.id} - ${pallet.motorista} - Atual: ${pallet.transportadora} → Deveria ser: VLOG`);
    });

    // 4. Verificar se há registros NULL em transportadora
    console.log('\n🔍 REGISTROS COM TRANSPORTADORA NULL:');
    const controlesNull = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as total
      FROM "ControleCarga" 
      WHERE transportadora IS NULL
      AND (motorista ILIKE '%vlog%' OR responsavel ILIKE '%vlog%' OR observacao ILIKE '%vlog%')
    `);
    
    const palletsNull = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as total
      FROM "PalletAjuste" 
      WHERE transportadora IS NULL
      AND (motorista ILIKE '%vlog%' OR observacao ILIKE '%vlog%')
    `);
    
    console.log(`Controles com transportadora NULL e VLOG no texto: ${controlesNull[0].total}`);
    console.log(`Pallets com transportadora NULL e VLOG no texto: ${palletsNull[0].total}`);

    return {
      totalControlesVLOG: controlesVLOG.length,
      totalPalletsVLOG: palletsVLOG.length,
      inconsistenciasControles: inconsistenciasControles.length,
      inconsistenciasPallets: inconsistenciasPallets.length,
      controlesNull: controlesNull[0].total,
      palletsNull: palletsNull[0].total
    };

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

verificarRelatoriosVLOG().then((resultado) => {
  console.log('\n📊 RESUMO COMPLETO DOS RELATÓRIOS:');
  if (resultado) {
    console.log(`Controles relacionados à VLOG: ${resultado.totalControlesVLOG}`);
    console.log(`Pallets relacionados à VLOG: ${resultado.totalPalletsVLOG}`);
    console.log(`Inconsistências em controles: ${resultado.inconsistenciasControles}`);
    console.log(`Inconsistências em pallets: ${resultado.inconsistenciasPallets}`);
    console.log(`Controles com transportadora NULL: ${resultado.controlesNull}`);
    console.log(`Pallets com transportadora NULL: ${resultado.palletsNull}`);
    
    if (resultado.inconsistenciasControles > 0 || resultado.inconsistenciasPallets > 0) {
      console.log('\n🎯 RECOMENDAÇÃO:');
      console.log('Execute a correção específica para os relatórios para atualizar as inconsistências encontradas');
    } else {
      console.log('\n✅ Todos os dados dos relatórios estão consistentes!');
    }
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});
