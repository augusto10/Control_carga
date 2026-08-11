/**
 * Diagnostico das tabelas de etiquetas de transporte.
 * Verifica se EtiquetaLote/EtiquetaVolume existem e se a coluna cnpj esta presente.
 *
 * Uso: node scripts/diagnostico-etiquetas.js
 */
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('[diagnostico-etiquetas] Conectando...');
  await prisma.$connect();
  console.log('[diagnostico-etiquetas] Conectado.');

  const cols = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name IN ('EtiquetaLote', 'EtiquetaVolume')
    ORDER BY table_name, ordinal_position
  `);

  if (Array.isArray(cols) && cols.length > 0) {
    console.log('[diagnostico-etiquetas] Colunas encontradas:');
    for (const c of cols) {
      console.log(`  ${c.table_name}.${c.column_name} (${c.data_type}, null=${c.is_nullable})`);
    }

    const temTabelaLote = cols.some((c) => c.table_name === 'EtiquetaLote');
    const temCnpj = cols.some((c) => c.table_name === 'EtiquetaLote' && c.column_name === 'cnpj');

    if (temTabelaLote && !temCnpj) {
      console.log('[diagnostico-etiquetas] RESULTADO: EtiquetaLote existe, mas a coluna cnpj NAO existe.');
      console.log('[diagnostico-etiquetas] Aplique: prisma/migrations/20260807150000_add_cnpj_etiqueta_lote/migration.sql');
      process.exit(2);
    }
    if (!temTabelaLote) {
      console.log('[diagnostico-etiquetas] RESULTADO: tabela EtiquetaLote NAO existe.');
      console.log('[diagnostico-etiquetas] Aplique: prisma/migrations/20260807120000_add_etiquetas_transporte/migration.sql');
      process.exit(2);
    }
    console.log('[diagnostico-etiquetas] RESULTADO: tudo pronto (tabelas e coluna cnpj presentes).');
  } else {
    console.log('[diagnostico-etiquetas] Nenhuma tabela de etiquetas encontrada no banco.');
    console.log('[diagnostico-etiquetas] RESULTADO: tabelas NAO existem.');
    process.exit(2);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('[diagnostico-etiquetas] ERRO:', error?.message || String(error));
    return prisma.$disconnect().finally(() => process.exit(1));
  });
