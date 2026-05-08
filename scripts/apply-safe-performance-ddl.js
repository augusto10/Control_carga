const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const statements = [
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "ControleCarga_dataCriacao_idx" ON "ControleCarga" ("dataCriacao")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "ControleCarga_finalizado_idx" ON "ControleCarga" ("finalizado")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "Pedido_dataCriacao_idx" ON "Pedido" ("dataCriacao")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS "NotaFiscal_dataCriacao_idx" ON "NotaFiscal" ("dataCriacao")'
];

const assertSafeStatement = (sql) => {
  const normalized = sql.trim().toUpperCase();
  const allowed = normalized.startsWith('CREATE TABLE IF NOT EXISTS') ||
    normalized.startsWith('CREATE INDEX CONCURRENTLY IF NOT EXISTS');

  if (!allowed) {
    throw new Error(`Comando nao permitido neste script seguro: ${sql}`);
  }

  const forbidden = /\b(DROP|DELETE|TRUNCATE|ALTER\s+TABLE\s+.*DROP|UPDATE|INSERT)\b/i;
  if (forbidden.test(sql)) {
    throw new Error(`Comando bloqueado por seguranca: ${sql}`);
  }
};

async function main() {
  for (const statement of statements) {
    assertSafeStatement(statement);
    console.log(`[DDL seguro] Aplicando: ${statement}`);
    await prisma.$executeRawUnsafe(statement);
  }

  console.log('[DDL seguro] Finalizado sem comandos destrutivos.');
}

main()
  .catch((error) => {
    console.error('[DDL seguro] Falha:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
