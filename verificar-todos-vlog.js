const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function verificarTodosMotoristasVLOG() {
  console.log('=== VERIFICANDO TODOS OS MOTORISTAS VLOG ===');
  
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

    // 1. Verificar todos os motoristas com VLOG no nome
    console.log('\n🔍 MOTORISTAS COM "VLOG" NO NOME:');
    const motoristasVLOG = await prisma.$queryRawUnsafe(`
      SELECT id, nome, "transportadoraId", ativo
      FROM "Motorista" 
      WHERE nome ILIKE '%vlog%'
      ORDER BY nome
    `);
    
    console.log(`Encontrados ${motoristasVLOG.length} motoristas com VLOG no nome:`);
    motoristasVLOG.forEach((motorista, i) => {
      console.log(`  ${i+1}. ID: ${motorista.id}`);
      console.log(`     Nome: ${motorista.nome}`);
      console.log(`     Transportadora: ${motorista.transportadoraId}`);
      console.log(`     Ativo: ${motorista.ativo ? 'Sim' : 'Não'}`);
      console.log('');
    });

    // 2. Verificar todos os motoristas com transportadora VLOG
    console.log('\n🔍 MOTORISTAS COM TRANSPORTADORA "VLOG":');
    const motoristasComVLOG = await prisma.$queryRawUnsafe(`
      SELECT id, nome, "transportadoraId", ativo
      FROM "Motorista" 
      WHERE "transportadoraId" = 'VLOG'
      ORDER BY nome
    `);
    
    console.log(`Encontrados ${motoristasComVLOG.length} motoristas com transportadora VLOG:`);
    motoristasComVLOG.forEach((motorista, i) => {
      console.log(`  ${i+1}. ID: ${motorista.id}`);
      console.log(`     Nome: ${motorista.nome}`);
      console.log(`     Transportadora: ${motorista.transportadoraId}`);
      console.log(`     Ativo: ${motorista.ativo ? 'Sim' : 'Não'}`);
      console.log('');
    });

    // 3. Verificar controles que mencionam VLOG
    console.log('\n🔍 CONTROLES QUE MENCIONAM "VLOG":');
    const controlesVLOG = await prisma.$queryRawUnsafe(`
      SELECT id, motorista, responsavel, transportadora, "dataCriacao"
      FROM "ControleCarga" 
      WHERE (motorista ILIKE '%vlog%' OR responsavel ILIKE '%vlog%' OR observacao ILIKE '%vlog%')
      ORDER BY "dataCriacao" DESC
      LIMIT 10
    `);
    
    console.log(`Encontrados ${controlesVLOG.length} controles que mencionam VLOG:`);
    controlesVLOG.forEach((controle, i) => {
      console.log(`  ${i+1}. ID: ${controle.id}`);
      console.log(`     Motorista: ${controle.motorista}`);
      console.log(`     Responsável: ${controle.responsavel}`);
      console.log(`     Transportadora: ${controle.transportadora}`);
      console.log(`     Data: ${new Date(controle.dataCriacao).toLocaleDateString('pt-BR')}`);
      console.log('');
    });

    // 4. Identificar inconsistências
    console.log('\n🚨 INCONSISTÊNCIAS ENCONTRADAS:');
    
    // Motoristas com VLOG no nome mas transportadora diferente de VLOG
    const inconsistencias = motoristasVLOG.filter(m => m.transportadoraId !== 'VLOG');
    
    if (inconsistencias.length > 0) {
      console.log(`Motoristas com VLOG no nome mas transportadora incorreta:`);
      inconsistencias.forEach((motorista, i) => {
        console.log(`  ${i+1}. ${motorista.nome} - Atualmente: ${motorista.transportadoraId} → Deveria ser: VLOG`);
      });
    } else {
      console.log('✅ Nenhuma inconsistência encontrada nos motoristas');
    }

    return {
      totalMotoristasVLOG: motoristasVLOG.length,
      totalMotoristasComVLOG: motoristasComVLOG.length,
      inconsistencias: inconsistencias.length,
      totalControlesVLOG: controlesVLOG.length
    };

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

verificarTodosMotoristasVLOG().then((resultado) => {
  console.log('\n📊 RESUMO COMPLETO:');
  if (resultado) {
    console.log(`Motoristas com "VLOG" no nome: ${resultado.totalMotoristasVLOG}`);
    console.log(`Motoristas com transportadora "VLOG": ${resultado.totalMotoristasComVLOG}`);
    console.log(`Inconsistências encontradas: ${resultado.inconsistencias}`);
    console.log(`Controles que mencionam VLOG: ${resultado.totalControlesVLOG}`);
    
    if (resultado.inconsistencias > 0) {
      console.log('\n🎯 RECOMENDAÇÃO:');
      console.log('Execute a correção em lote para atualizar todos os motoristas inconsistentes');
    } else {
      console.log('\n✅ Todos os dados estão consistentes!');
    }
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});
