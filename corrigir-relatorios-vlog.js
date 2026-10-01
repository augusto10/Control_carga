const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function corrigirRelatoriosVLOG() {
  console.log('=== CORRIGINDO RELATÓRIOS VLOG ===');
  
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

    // 1. Corrigir ControleCarga onde indica VLOG no texto mas transportadora não é VLOG
    console.log('\n🔧 CORRIGINDO CONTROLES DE CARGA:');
    
    const resultadoControles = await prisma.$queryRawUnsafe(`
      UPDATE "ControleCarga" 
      SET transportadora = 'VLOG'
      WHERE transportadora <> 'VLOG' 
      AND (
        motorista ILIKE '%vlog%' OR 
        responsavel ILIKE '%vlog%' OR
        observacao ILIKE '%vlog%'
      )
      RETURNING id, motorista, transportadora
    `);
    
    console.log(`✅ Controles corrigidos: ${resultadoControles.length}`);
    resultadoControles.forEach((controle, i) => {
      console.log(`  ${i+1}. ID: ${controle.id} - Motorista: ${controle.motorista} - Transportadora atualizada para: ${controle.transportadora}`);
    });

    // 2. Corrigir PalletAjuste onde indica VLOG no texto mas transportadora não é VLOG
    console.log('\n🔧 CORRIGINDO AJUSTES DE PALLETS:');
    
    const resultadoPallets = await prisma.$queryRawUnsafe(`
      UPDATE "PalletAjuste" 
      SET transportadora = 'VLOG'
      WHERE transportadora <> 'VLOG' 
      AND (
        motorista ILIKE '%vlog%' OR 
        observacao ILIKE '%vlog%'
      )
      RETURNING id, motorista, transportadora
    `);
    
    console.log(`✅ Pallets corrigidos: ${resultadoPallets.length}`);
    resultadoPallets.forEach((pallet, i) => {
      console.log(`  ${i+1}. ID: ${pallet.id} - Motorista: ${pallet.motorista} - Transportadora atualizada para: ${pallet.transportadora}`);
    });

    // 3. Verificar se há registros NULL e corrigir
    console.log('\n🔧 CORRIGINDO REGISTROS COM TRANSPORTADORA NULL:');
    
    const controlesNull = await prisma.$queryRawUnsafe(`
      UPDATE "ControleCarga" 
      SET transportadora = 'VLOG'
      WHERE transportadora IS NULL
      AND (
        motorista ILIKE '%vlog%' OR 
        responsavel ILIKE '%vlog%' OR
        observacao ILIKE '%vlog%'
      )
      RETURNING id, motorista, transportadora
    `);
    
    console.log(`✅ Controles com NULL corrigidos: ${controlesNull.length}`);
    controlesNull.forEach((controle, i) => {
      console.log(`  ${i+1}. ID: ${controle.id} - Motorista: ${controle.motorista} - Transportadora atualizada para: ${controle.transportadora}`);
    });

    const palletsNull = await prisma.$queryRawUnsafe(`
      UPDATE "PalletAjuste" 
      SET transportadora = 'VLOG'
      WHERE transportadora IS NULL
      AND (
        motorista ILIKE '%vlog%' OR 
        observacao ILIKE '%vlog%'
      )
      RETURNING id, motorista, transportadora
    `);
    
    console.log(`✅ Pallets com NULL corrigidos: ${palletsNull.length}`);
    palletsNull.forEach((pallet, i) => {
      console.log(`  ${i+1}. ID: ${pallet.id} - Motorista: ${pallet.motorista} - Transportadora atualizada para: ${pallet.transportadora}`);
    });

    // 4. Verificação final
    console.log('\n🔍 VERIFICAÇÃO FINAL:');
    
    const verificacaoControles = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as total
      FROM "ControleCarga" 
      WHERE (
        motorista ILIKE '%vlog%' OR 
        responsavel ILIKE '%vlog%' OR
        observacao ILIKE '%vlog%'
      )
      AND transportadora <> 'VLOG'
    `);
    
    const verificacaoPallets = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as total
      FROM "PalletAjuste" 
      WHERE (
        motorista ILIKE '%vlog%' OR 
        observacao ILIKE '%vlog%'
      )
      AND transportadora <> 'VLOG'
    `);
    
    console.log(`Controles restantes com inconsistência: ${verificacaoControles[0].total}`);
    console.log(`Pallets restantes com inconsistência: ${verificacaoPallets[0].total}`);

    return {
      controlesCorrigidos: resultadoControles.length,
      palletsCorrigidos: resultadoPallets.length,
      controlesNullCorrigidos: controlesNull.length,
      palletsNullCorrigidos: palletsNull.length,
      controlesRestantes: verificacaoControles[0].total,
      palletsRestantes: verificacaoPallets[0].total
    };

  } catch (error) {
    console.error('❌ Erro ao corrigir dados:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

corrigirRelatoriosVLOG().then((resultado) => {
  console.log('\n📊 RESUMO DAS CORREÇÕES DOS RELATÓRIOS:');
  if (resultado) {
    console.log(`Controles corrigidos: ${resultado.controlesCorrigidos}`);
    console.log(`Pallets corrigidos: ${resultado.palletsCorrigidos}`);
    console.log(`Controles com NULL corrigidos: ${resultado.controlesNullCorrigidos}`);
    console.log(`Pallets com NULL corrigidos: ${resultado.palletsNullCorrigidos}`);
    console.log(`Controles restantes com inconsistência: ${resultado.controlesRestantes}`);
    console.log(`Pallets restantes com inconsistência: ${resultado.palletsRestantes}`);
    
    if (resultado.controlesRestantes === 0 && resultado.palletsRestantes === 0) {
      console.log('\n✅ TODAS AS INCONSISTÊNCIAS FORAM CORRIGIDAS!');
      console.log('🎉 Os relatórios agora devem mostrar VLOG corretamente!');
    } else {
      console.log('\n⚠️ Ainda há inconsistências restantes que precisam de atenção manual');
    }
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});
