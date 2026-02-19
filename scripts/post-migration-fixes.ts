// Script para aplicar correções finais após migração
// Este script aplica correções específicas que podem ser necessárias após as migrações

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyPostMigrationFixes() {
  console.log('🔧 Aplicando correções pós-migração...');

  try {
    // 1. Atualizar controles que ainda usam ACERT para ACCERT
    const controlesAtualizados = await prisma.controleCarga.updateMany({
      where: { transportadora: 'ACERT' },
      data: { transportadora: 'ACCERT' }
    });

    console.log(`✅ Controles atualizados (ACERT -> ACCERT): ${controlesAtualizados.count}`);

    // 2. Atualizar motoristas que ainda usam ACERT para ACCERT
    const motoristasAtualizados = await prisma.motorista.updateMany({
      where: { transportadoraId: 'ACERT' },
      data: { transportadoraId: 'ACCERT' }
    });

    console.log(`✅ Motoristas atualizados (ACERT -> ACCERT): ${motoristasAtualizados.count}`);

    // 3. Verificar se todos os motoristas têm tipo definido
    const motoristasSemTipo = await prisma.motorista.findMany({
      where: { tipo: null },
      select: { id: true, nome: true }
    });

    if (motoristasSemTipo.length > 0) {
      console.log(`⚠️  Motoristas sem tipo definido: ${motoristasSemTipo.length}`);
      motoristasSemTipo.forEach(m => {
        console.log(`   - ${m.nome} (ID: ${m.id})`);
      });
    } else {
      console.log('✅ Todos os motoristas têm tipo definido');
    }

    // 4. Estatísticas finais
    const estatisticas = {
      controles: await prisma.controleCarga.count(),
      motoristas: await prisma.motorista.count(),
      controlesComAccert: await prisma.controleCarga.count({ where: { transportadora: 'ACCERT' } }),
      motoristasComAccert: await prisma.motorista.count({ where: { transportadoraId: 'ACCERT' } })
    };

    console.log('\n📊 Estatísticas finais:');
    Object.entries(estatisticas).forEach(([chave, valor]) => {
      console.log(`   ${chave}: ${valor}`);
    });

    console.log('\n✅ Correções pós-migração aplicadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante correções pós-migração:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  applyPostMigrationFixes()
    .then(() => {
      console.log('\n🎉 Correções concluídas com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha nas correções:', error);
      process.exit(1);
    });
}
