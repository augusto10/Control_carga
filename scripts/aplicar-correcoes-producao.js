// Script para aplicar correções no banco de produção existente
// Este script é seguro e só aplica correções necessárias

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function aplicarCorrecoesProducao() {
  console.log('🔧 Aplicando correções no banco de produção existente...');

  try {
    // 1. Verificar e adicionar campo tipo se necessário
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Motorista" ADD COLUMN IF NOT EXISTS tipo TEXT
      `;
      console.log('✅ Campo tipo adicionado/verificado na tabela Motorista');
    } catch (error) {
      console.log('ℹ️ Campo tipo já existe ou erro controlado:', error.message);
    }

    // 2. Definir valores padrão baseado na CNH e transportadora
    const motoristasSemTipo = await prisma.motorista.count({
      where: { tipo: null }
    });

    if (motoristasSemTipo > 0) {
      await prisma.$executeRaw`
        UPDATE "Motorista"
        SET tipo = CASE
            WHEN cnh IS NOT NULL AND cnh != '' THEN 'MOTORISTA'
            WHEN "transportadoraId" = 'RETIRA_CLIENTE' THEN 'CLIENTE'
            WHEN "transportadoraId" = 'RETIRA_VENDEDOR' THEN 'FUNCIONARIO'
            ELSE 'MOTORISTA'
        END
        WHERE tipo IS NULL
      `;
      console.log(`✅ ${motoristasSemTipo} motoristas tiveram tipo definido`);
    } else {
      console.log('ℹ️ Todos os motoristas já têm tipo definido');
    }

    // 3. Tornar campo obrigatório
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Motorista" ALTER COLUMN tipo SET NOT NULL
      `;
      console.log('✅ Campo tipo definido como obrigatório');
    } catch (error) {
      console.log('ℹ️ Campo tipo já é obrigatório ou erro controlado:', error.message);
    }

    // 4. Corrigir ACERT para ACCERT em ControleCarga
    const controlesComAcert = await prisma.controleCarga.count({
      where: { transportadora: 'ACERT' }
    });

    if (controlesComAcert > 0) {
      await prisma.$executeRaw`
        UPDATE "ControleCarga" SET transportadora = 'ACCERT' WHERE transportadora = 'ACERT'
      `;
      console.log(`✅ ${controlesComAcert} controles tiveram ACERT corrigido para ACCERT`);
    } else {
      console.log('ℹ️ Nenhum controle com ACERT encontrado');
    }

    // 5. Corrigir ACERT para ACCERT em NotaFiscal
    const notasComAcert = await prisma.notaFiscal.count({
      where: { transportadora: 'ACERT' }
    });

    if (notasComAcert > 0) {
      await prisma.$executeRaw`
        UPDATE "NotaFiscal" SET transportadora = 'ACCERT' WHERE transportadora = 'ACERT'
      `;
      console.log(`✅ ${notasComAcert} notas tiveram ACERT corrigido para ACCERT`);
    } else {
      console.log('ℹ️ Nenhuma nota com ACERT encontrada');
    }

    // 6. Corrigir ACERT para ACCERT em Motorista
    const motoristasComAcert = await prisma.motorista.count({
      where: { transportadoraId: 'ACERT' }
    });

    if (motoristasComAcert > 0) {
      await prisma.$executeRaw`
        UPDATE "Motorista" SET "transportadoraId" = 'ACCERT' WHERE "transportadoraId" = 'ACERT'
      `;
      console.log(`✅ ${motoristasComAcert} motoristas tiveram ACERT corrigido para ACCERT`);
    } else {
      console.log('ℹ️ Nenhum motorista com ACERT encontrado');
    }

    // 7. Verificar tabelas de materiais
    const materiaisExistem = await prisma.materialEstoque.count();

    if (materiaisExistem === 0) {
      // Criar materiais básicos apenas se não houver nenhum
      const materiais = [
        {
          nome: 'Fita Adesiva',
          descricao: 'Fita adesiva transparente 48mm x 100m',
          unidade: 'Rolo',
          estoqueAtual: 50,
          estoqueMinimo: 10
        },
        {
          nome: 'Stretch Film',
          descricao: 'Filme stretch transparente 500mm x 300m',
          unidade: 'Rolo',
          estoqueAtual: 30,
          estoqueMinimo: 5
        },
        {
          nome: 'Papel A4',
          descricao: 'Resma de papel sulfite A4 75g',
          unidade: 'Resma',
          estoqueAtual: 100,
          estoqueMinimo: 20
        }
      ];

      for (const material of materiais) {
        await prisma.materialEstoque.create({
          data: {
            id: require('crypto').randomUUID(),
            ...material
          }
        });
      }
      console.log('✅ Materiais básicos criados');
    } else {
      console.log(`ℹ️ Já existem ${materiaisExistem} materiais cadastrados`);
    }

    console.log('🎉 Todas as correções aplicadas com sucesso!');

    // Verificações finais
    const motoristas = await prisma.motorista.count();
    const controles = await prisma.controleCarga.count();
    const materiaisCount = await prisma.materialEstoque.count();

    console.log(`📊 Status atual:`);
    console.log(`   - Motoristas: ${motoristas}`);
    console.log(`   - Controles: ${controles}`);
    console.log(`   - Materiais: ${materiaisCount}`);

    // Verificar distribuição por tipo
    const distribuicaoTipo = await prisma.motorista.groupBy({
      by: ['tipo'],
      _count: true
    });

    console.log(`📋 Distribuição por tipo:`);
    distribuicaoTipo.forEach(item => {
      console.log(`   - ${item.tipo}: ${item._count}`);
    });

  } catch (error) {
    console.error('❌ Erro ao aplicar correções:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  aplicarCorrecoesProducao()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { aplicarCorrecoesProducao };
