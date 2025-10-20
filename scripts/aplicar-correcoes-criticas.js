// Script para aplicar correções críticas no banco de dados
// Execute este script se tiver acesso direto ao banco

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function aplicarCorrecoesCriticas() {
  console.log('🔧 Aplicando correções críticas no banco de dados...');

  try {
    // 1. Adicionar campo tipo na tabela Motorista (via SQL direto)
    await prisma.$executeRaw`
      ALTER TABLE "Motorista" ADD COLUMN IF NOT EXISTS tipo TEXT
    `;

    // 2. Definir valores padrão baseado na CNH e transportadora
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

    // 3. Tornar campo obrigatório
    await prisma.$executeRaw`
      ALTER TABLE "Motorista" ALTER COLUMN tipo SET NOT NULL
    `;

    // 4. Corrigir ACERT para ACCERT em ControleCarga
    await prisma.$executeRaw`
      UPDATE "ControleCarga" SET transportadora = 'ACCERT' WHERE transportadora = 'ACERT'
    `;

    // 5. Corrigir ACERT para ACCERT em NotaFiscal
    await prisma.$executeRaw`
      UPDATE "NotaFiscal" SET transportadora = 'ACCERT' WHERE transportadora = 'ACERT'
    `;

    // 6. Corrigir ACERT para ACCERT em Motorista
    await prisma.$executeRaw`
      UPDATE "Motorista" SET "transportadoraId" = 'ACCERT' WHERE "transportadoraId" = 'ACERT'
    `;

    console.log('✅ Correções críticas aplicadas com sucesso!');
    console.log('🔄 Aplicando correções de materiais...');

    // 7. Criar materiais básicos
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
      await prisma.materialEstoque.upsert({
        where: { nome: material.nome },
        update: material,
        create: {
          id: require('crypto').randomUUID(),
          ...material
        }
      });
    }

    console.log('✅ Materiais básicos criados!');
    console.log('🎉 Todas as correções aplicadas com sucesso!');

    // Verificações finais
    const motoristas = await prisma.motorista.count();
    const controles = await prisma.controleCarga.count();
    const materiaisCount = await prisma.materialEstoque.count();

    console.log(`📊 Status atual:`);
    console.log(`   - Motoristas: ${motoristas}`);
    console.log(`   - Controles: ${controles}`);
    console.log(`   - Materiais: ${materiaisCount}`);

  } catch (error) {
    console.error('❌ Erro ao aplicar correções:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  aplicarCorrecoesCriticas()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { aplicarCorrecoesCriticas };
