// Script detalhado para atualizar dados existentes no banco
// Este script identifica e corrige dados específicos que podem estar usando valores incorretos

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateExistingData() {
  console.log('🔍 Analisando dados existentes no banco...');

  try {
    // 1. Verificar controles com ACERT (deveriam ser ACCERT)
    const controlesComAcert = await prisma.controleCarga.findMany({
      where: { transportadora: 'ACERT' },
      select: { id: true, motorista: true, transportadora: true }
    });

    console.log(`\n📋 Controles usando ACERT (serão atualizados para ACCERT): ${controlesComAcert.length}`);
    controlesComAcert.forEach(c => {
      console.log(`   - ${c.id}: ${c.motorista} (${c.transportadora})`);
    });

    // 2. Verificar motoristas com ACERT
    const motoristasComAcert = await prisma.motorista.findMany({
      where: { transportadoraId: 'ACERT' },
      select: { id: true, nome: true, transportadoraId: true }
    });

    console.log(`\n👥 Motoristas usando ACERT (serão atualizados para ACCERT): ${motoristasComAcert.length}`);
    motoristasComAcert.forEach(m => {
      console.log(`   - ${m.id}: ${m.nome} (${m.transportadoraId})`);
    });

    // 3. Verificar controles com valores inválidos no enum
    const transportadorasInvalidas = ['ACERT']; // Valores que não estão no enum atual
    const controlesInvalidos = await prisma.controleCarga.findMany({
      where: {
        transportadora: { in: transportadorasInvalidas }
      },
      select: { id: true, motorista: true, transportadora: true }
    });

    console.log(`\n⚠️  Controles com transportadoras inválidas: ${controlesInvalidos.length}`);

    // 4. Aplicar correções
    if (controlesComAcert.length > 0) {
      console.log('\n🔄 Atualizando controles ACERT -> ACCERT...');
      const resultado = await prisma.controleCarga.updateMany({
        where: { transportadora: 'ACERT' },
        data: { transportadora: 'ACCERT' }
      });
      console.log(`✅ ${resultado.count} controles atualizados`);
    }

    if (motoristasComAcert.length > 0) {
      console.log('\n🔄 Atualizando motoristas ACERT -> ACCERT...');
      const resultado = await prisma.motorista.updateMany({
        where: { transportadoraId: 'ACERT' },
        data: { transportadoraId: 'ACCERT' }
      });
      console.log(`✅ ${resultado.count} motoristas atualizados`);
    }

    // 5. Verificar se há controles sem motorista válido
    const controlesSemMotorista = await prisma.controleCarga.findMany({
      where: {
        motorista: {
          in: ['PENDENTE', '', null]
        }
      },
      select: { id: true, motorista: true, cpfMotorista: true }
    });

    if (controlesSemMotorista.length > 0) {
      console.log(`\n⚠️  Controles com motorista PENDENTE: ${controlesSemMotorista.length}`);
      console.log('Isso é normal se forem controles antigos sem motorista definido.');
    }

    // 6. Estatísticas finais
    const estatisticasFinais = {
      controles: await prisma.controleCarga.count(),
      motoristas: await prisma.motorista.count(),
      usuarios: await prisma.usuario.count(),
      notas: await prisma.notaFiscal.count()
    };

    console.log('\n📊 Estatísticas finais do banco:');
    Object.entries(estatisticasFinais).forEach(([tabela, count]) => {
      console.log(`   ${tabela}: ${count} registros`);
    });

    console.log('\n✅ Análise e correções concluídas!');

  } catch (error) {
    console.error('❌ Erro durante análise/correção:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  updateExistingData()
    .then(() => {
      console.log('\n🎉 Análise concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha na análise:', error);
      process.exit(1);
    });
}
