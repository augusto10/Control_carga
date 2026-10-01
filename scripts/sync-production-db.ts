// Script para sincronizar banco de produção via código
// Execute com: npx ts-node scripts/sync-production-db.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncProductionDatabase() {
  console.log('🔄 Iniciando sincronização do banco de produção...');

  try {
    // 1. Verificar estrutura atual do banco
    console.log('📊 Verificando estrutura atual...');

    const motoristasCount = await prisma.motorista.count();
    const controlesCount = await prisma.controleCarga.count();

    console.log(`Motoristas no banco: ${motoristasCount}`);
    console.log(`Controles no banco: ${controlesCount}`);

    // 2. Atualizar transportadoras ACERT -> ACCERT
    console.log('🔄 Atualizando transportadoras ACERT -> ACCERT...');

    const controlesAtualizados = await prisma.controleCarga.updateMany({
      where: { transportadora: 'ACERT' },
      data: { transportadora: 'ACCERT' }
    });

    const motoristasAtualizados = await prisma.motorista.updateMany({
      where: { transportadoraId: 'ACERT' },
      data: { transportadoraId: 'ACCERT' }
    });

    console.log(`✅ Controles atualizados: ${controlesAtualizados.count}`);
    console.log(`✅ Motoristas atualizados: ${motoristasAtualizados.count}`);

    // 3. Verificar se precisamos adicionar coluna 'tipo' na tabela Motorista
    console.log('🔍 Verificando se coluna tipo existe...');

    try {
      // Tentar buscar motoristas com o campo tipo
      const motoristasComTipo = await prisma.motorista.findMany({
        take: 1,
        select: { tipo: true }
      });

      console.log('✅ Coluna tipo já existe na tabela Motorista');
    } catch (error: any) {
      if (error.code === 'P2022') {
        console.log('❌ Coluna tipo não existe. Será necessário executar o SQL manualmente.');
        console.log('Execute o arquivo: scripts/sql/sync-production-database.sql');
      } else {
        throw error;
      }
    }

    // 4. Verificar dados atuais
    console.log('📋 Verificando dados atuais...');

    const controlesVerificacao = await prisma.controleCarga.findMany({
      where: { transportadora: 'ACCERT' },
      take: 5,
      select: { id: true, transportadora: true }
    });

    const motoristasVerificacao = await prisma.motorista.findMany({
      where: { transportadoraId: 'ACCERT' },
      take: 5,
      select: { id: true, nome: true, transportadoraId: true }
    });

    console.log('Controles com ACCERT:', controlesVerificacao.length);
    console.log('Motoristas com ACCERT:', motoristasVerificacao.length);

    // 5. Verificar se enum Transportadora precisa ser atualizado
    console.log('🔍 Verificando enum Transportadora...');

    // Esta verificação seria mais complexa e pode precisar de acesso direto ao banco
    console.log('ℹ️  Para atualizar o enum Transportadora, execute o SQL manualmente');

    console.log('✅ Sincronização concluída!');
    console.log('📝 Resumo:');
    console.log(`   - Controles atualizados: ${controlesAtualizados.count}`);
    console.log(`   - Motoristas atualizados: ${motoristasAtualizados.count}`);

  } catch (error) {
    console.error('❌ Erro durante sincronização:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  syncProductionDatabase()
    .then(() => {
      console.log('🎉 Sincronização concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na sincronização:', error);
      process.exit(1);
    });
}
