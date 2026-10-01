const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAcertData() {
  try {
    console.log('🔍 Verificando dados com ACERT...\n');

    // Usar query raw para evitar erro de enum
    console.log('📊 Controles com ACERT:');
    const controlesAcert = await prisma.$queryRaw`
      SELECT id, motorista, transportadora 
      FROM "ControleCarga" 
      WHERE transportadora = 'ACERT'
      LIMIT 10
    `;
    
    console.log(`Encontrados: ${controlesAcert.length} controles`);
    controlesAcert.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.motorista} - ${c.transportadora}`);
    });

    console.log('\n📊 Motoristas com ACERT:');
    const motoristasAcert = await prisma.$queryRaw`
      SELECT id, nome, "transportadoraId" 
      FROM "Motorista" 
      WHERE "transportadoraId" = 'ACERT'
      LIMIT 10
    `;
    
    console.log(`Encontrados: ${motoristasAcert.length} motoristas`);
    motoristasAcert.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.nome} - ${m.transportadoraId}`);
    });

    // Corrigir usando query raw
    if (controlesAcert.length > 0) {
      console.log('\n🔧 Corrigindo controles...');
      const resultControles = await prisma.$executeRaw`
        UPDATE "ControleCarga" 
        SET transportadora = 'ACCERT' 
        WHERE transportadora = 'ACERT'
      `;
      console.log(`✅ ${resultControles} controles corrigidos`);
    }

    if (motoristasAcert.length > 0) {
      console.log('\n🔧 Corrigindo motoristas...');
      const resultMotoristas = await prisma.$executeRaw`
        UPDATE "Motorista" 
        SET "transportadoraId" = 'ACCERT' 
        WHERE "transportadoraId" = 'ACERT'
      `;
      console.log(`✅ ${resultMotoristas} motoristas corrigidos`);
    }

    // Verificar se ainda há ACERT
    const verificacaoControles = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "ControleCarga" WHERE transportadora = 'ACERT'
    `;
    
    const verificacaoMotoristas = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "Motorista" WHERE "transportadoraId" = 'ACERT'
    `;

    console.log('\n✅ Verificação final:');
    console.log(`   Controles com ACERT: ${verificacaoControles[0].count}`);
    console.log(`   Motoristas com ACERT: ${verificacaoMotoristas[0].count}`);

    if (verificacaoControles[0].count == 0 && verificacaoMotoristas[0].count == 0) {
      console.log('\n🎉 Todos os dados ACERT foram corrigidos para ACCERT!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAcertData();
