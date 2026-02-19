const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function corrigirRelatorioControleCarga() {
  console.log('=== CORRIGINDO RELATÓRIO DE CONTROLE DE CARGA ===');
  
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

    // 1. Verificar motoristas VLOG
    console.log('\n🔍 VERIFICANDO MOTORISTAS VLOG:');
    const motoristasVLOG = await prisma.$queryRawUnsafe(`
      SELECT id, nome, "transportadoraId" 
      FROM "Motorista" 
      WHERE "transportadoraId" = 'VLOG' OR nome ILIKE '%vlog%'
    `);
    
    console.log(`Encontrados ${motoristasVLOG.length} motoristas VLOG:`);
    motoristasVLOG.forEach((m, i) => {
      console.log(`  ${i+1}. ID: ${m.id} - ${m.nome} (${m.transportadoraId})`);
    });

    // 2. Verificar controles desses motoristas
    console.log('\n🔍 VERIFICANDO CONTROLES:');
    const idsMotoristas = motoristasVLOG.map(m => `'${m.id}'`).join(',');
    
    if (idsMotoristas) {
      const controles = await prisma.$queryRawUnsafe(`
        SELECT id, motorista, transportadora, "motoristaId"
        FROM "ControleCarga"
        WHERE "motoristaId" IN (${idsMotoristas})
        ORDER BY "dataCriacao" DESC
        LIMIT 10
      `);
      
      console.log(`Encontrados ${controles.length} controles desses motoristas:`);
      controles.forEach((c, i) => {
        console.log(`  ${i+1}. ID: ${c.id} - MotoristaID: ${c.motoristaId} - Transportadora: ${c.transportadora}`);
      });

      // 3. Corrigir transportadora nos controles
      console.log('\n🔧 CORRIGINDO TRANSPORTADORA NOS CONTROLES:');
      const resultado = await prisma.$queryRawUnsafe(`
        UPDATE "ControleCarga"
        SET transportadora = 'VLOG'
        WHERE "motoristaId" IN (${idsMotoristas})
        AND transportadora != 'VLOG'
        RETURNING id, motorista, transportadora
      `);
      
      console.log(`✅ Controles atualizados: ${resultado.length}`);
      resultado.forEach((r, i) => {
        console.log(`  ${i+1}. ID: ${r.id} - ${r.motorista} -> ${r.transportadora}`);
      });
    } else {
      console.log('⚠️ Nenhum motorista VLOG encontrado para verificar controles');
    }

    // 4. Verificar se há registros de ControleCarga com motorista VLOG mas transportadora errada
    console.log('\n🔍 VERIFICANDO INCONSISTÊNCIAS RESTANTES:');
    const inconsistencias = await prisma.$queryRawUnsafe(`
      SELECT c.id, c.motorista, c.transportadora, m.nome as nome_motorista, m."transportadoraId"
      FROM "ControleCarga" c
      JOIN "Motorista" m ON c."motoristaId" = m.id
      WHERE m."transportadoraId" = 'VLOG' 
      AND c.transportadora != 'VLOG'
      LIMIT 10
    `);
    
    if (inconsistencias.length > 0) {
      console.log(`⚠️ Ainda existem ${inconsistencias.length} controles com motorista VLOG mas transportadora incorreta:`);
      inconsistencias.forEach((item, i) => {
        console.log(`  ${i+1}. ID: ${item.id} - Motorista: ${item.nome_motorista} (${item.transportadoraId}) - Transportadora no controle: ${item.transportadora}`);
      });
      
      // Tentar corrigir novamente com abordagem mais ampla
      console.log('\n🔄 TENTANDO CORREÇÃO ALTERNATIVA...');
      const correcaoAlternativa = await prisma.$queryRawUnsafe(`
        UPDATE "ControleCarga" c
        SET transportadora = 'VLOG'
        FROM "Motorista" m
        WHERE c."motoristaId" = m.id
        AND m."transportadoraId" = 'VLOG'
        AND c.transportadora != 'VLOG'
        RETURNING c.id, c.motorista, c.transportadora
      `);
      
      console.log(`✅ Controles corrigidos na correção alternativa: ${correcaoAlternativa.length}`);
    } else {
      console.log('✅ Nenhuma inconsistência encontrada!');
    }

  } catch (error) {
    console.error('❌ Erro ao corrigir relatório:', error);
  } finally {
    await prisma.$disconnect();
  }
}

corrigirRelatorioControleCarga().then(() => {
  console.log('\n✅ Verificação completa!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});
