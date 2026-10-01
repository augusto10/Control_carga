const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function corrigirDadosVLOG() {
  console.log('=== CORRIGINDO DADOS DE VLOG ===');
  
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

    let totalCorrigidos = 0;

    // 1. Corrigir ControleCarga
    console.log('\n🔧 CORRIGINDO ControleCarga...');
    const updateControle = await prisma.$queryRawUnsafe(`
      UPDATE "ControleCarga" 
      SET transportadora = 'VLOG'
      WHERE transportadora = 'TERCEIRIZADA' 
      AND (
        motorista ILIKE '%vlog%' OR 
        responsavel ILIKE '%vlog%' OR
        observacao ILIKE '%vlog%'
      )
    `);
    
    console.log(`✅ ControleCarga atualizados: ${updateControle.length || 1} registros`);
    totalCorrigidos += updateControle.length || 1;

    // 2. Corrigir Motorista
    console.log('\n🔧 CORRIGINDO Motorista...');
    const updateMotorista = await prisma.$queryRawUnsafe(`
      UPDATE "Motorista" 
      SET "transportadoraId" = 'VLOG'
      WHERE "transportadoraId" = 'TERCEIRIZADA' 
      AND nome ILIKE '%vlog%'
    `);
    
    console.log(`✅ Motorista atualizados: ${updateMotorista.length || 1} registros`);
    totalCorrigidos += updateMotorista.length || 1;

    // 3. Corrigir PalletAjuste (se houver)
    console.log('\n🔧 CORRIGINDO PalletAjuste...');
    const updatePallet = await prisma.$queryRawUnsafe(`
      UPDATE "PalletAjuste" 
      SET transportadora = 'VLOG'
      WHERE transportadora = 'TERCEIRIZADA' 
      AND (
        motorista ILIKE '%vlog%' OR 
        observacao ILIKE '%vlog%'
      )
    `);
    
    console.log(`✅ PalletAjuste atualizados: ${updatePallet.length || 0} registros`);
    totalCorrigidos += updatePallet.length || 0;

    console.log('\n📊 RESUMO DA CORREÇÃO:');
    console.log(`Total de registros corrigidos: ${totalCorrigidos}`);

    // Verificar resultado
    console.log('\n🔍 VERIFICANDO RESULTADO...');
    
    const verificaControle = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as total FROM "ControleCarga" 
      WHERE transportadora = 'VLOG' AND 
      (motorista ILIKE '%vlog%' OR responsavel ILIKE '%vlog%')
    `);
    
    const verificaMotorista = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as total FROM "Motorista" 
      WHERE "transportadoraId" = 'VLOG' AND nome ILIKE '%vlog%'
    `);
    
    console.log(`✅ ControleCarga com VLOG: ${verificaControle[0].total}`);
    console.log(`✅ Motorista com VLOG: ${verificaMotorista[0].total}`);

    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('📝 Os relatórios agora mostrarão VLOG corretamente');
    
    return true;

  } catch (error) {
    console.error('❌ Erro ao corrigir dados:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

corrigirDadosVLOG().then((sucesso) => {
  console.log('\n=== FIM DA CORREÇÃO ===');
  if (sucesso) {
    console.log('✅ Todos os dados foram corrigidos com sucesso!');
    console.log('🔄 Reinicie o servidor para ver as alterações nos relatórios');
  } else {
    console.log('❌ Ocorreu um erro durante a correção');
  }
  process.exit(sucesso ? 0 : 1);
}).catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});
