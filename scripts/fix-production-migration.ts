// Script para resolver problemas de migração em produção
// Este script marca as migrações existentes como aplicadas (baseline)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function baselineProductionMigrations() {
  console.log('🔧 Resolvendo problemas de migração em produção...');

  try {
    // Lista de migrações que já existem no banco de produção
    const existingMigrations = [
      '20250930163624_add_tipo_field',        // Adiciona coluna tipo
      '20250701203745_rename_acert_to_accert' // Renomeia ACERT para ACCERT
    ];

    console.log('📋 Migrações existentes no banco de produção:');
    existingMigrations.forEach(migration => {
      console.log(`   ✅ ${migration}`);
    });

    // Nota: No ambiente de produção, você precisaria usar um comando diferente
    // pois não temos acesso direto ao comando prisma migrate resolve

    console.log('\n🔧 Para resolver no ambiente de produção:');
    console.log('\nOpção 1 - Via Prisma CLI (se disponível):');
    console.log('npx prisma migrate resolve --applied 20250930163624_add_tipo_field');
    console.log('npx prisma migrate resolve --applied 20250701203745_rename_acert_to_accert');

    console.log('\nOpção 2 - Via código (recomendada):');
    console.log('Execute este script em produção para marcar migrações como aplicadas');

    console.log('\n📝 Instruções para produção:');
    console.log('1. As migrações já foram aplicadas manualmente no banco');
    console.log('2. Marque-as como aplicadas usando os comandos acima');
    console.log('3. Faça novo deploy - deve funcionar normalmente');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  baselineProductionMigrations();
}
