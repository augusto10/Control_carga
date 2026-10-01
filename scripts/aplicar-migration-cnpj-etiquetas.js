/**
 * Aplica a migration 20260807150000_add_cnpj_etiqueta_lote no banco de producao.
 * Adiciona a coluna "cnpj" em "EtiquetaLote" (idempotente: ADD COLUMN IF NOT EXISTS).
 *
 * Observacao: a conexao via Prisma Accelerate (DATABASE_URL) NAO tem permissao
 * para ALTER TABLE ("must be owner of table"). Para aplicar, configure um
 * DIRECT_URL (conexao direta do Neon/Supabase) no .env, ou rode o SQL abaixo
 * direto no console do banco:
 *
 *   ALTER TABLE "EtiquetaLote" ADD COLUMN IF NOT EXISTS "cnpj" TEXT;
 *
 * Uso: node scripts/aplicar-migration-cnpj-etiquetas.js
 */
require('dotenv/config');
const fs = require('fs');
const path = require('path');

const SQL_PATH = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '20260807150000_add_cnpj_etiqueta_lote',
  'migration.sql'
);

function lerStatements() {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function viaPg() {
  const { Client } = require('pg');
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error('DIRECT_URL nao definida no .env');
  }
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });
  try {
    console.log('[aplicar-migration-cnpj-etiquetas] Conectando via pg (DIRECT_URL)...');
    await client.connect();
    const statements = lerStatements();
    for (const statement of statements) {
      await client.query(statement);
      console.log(`[aplicar-migration-cnpj-etiquetas] OK: ${statement.slice(0, 120)}`);
    }
    return true;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function viaPrisma() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    console.log('[aplicar-migration-cnpj-etiquetas] Tentando via PrismaClient (acelerador)...');
    await prisma.$connect();
    const statements = lerStatements();
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
      console.log(`[aplicar-migration-cnpj-etiquetas] OK: ${statement.slice(0, 120)}`);
    }
    return true;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function verificar() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'EtiquetaLote' AND column_name = 'cnpj'
    `);
    const ok = Array.isArray(cols) && cols.length > 0;
    console.log(
      ok
        ? '[aplicar-migration-cnpj-etiquetas] Coluna cnpj presente no banco.'
        : '[aplicar-migration-cnpj-etiquetas] ATENCAO: coluna cnpj ainda nao encontrada.'
    );
    return ok;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function main() {
  let aplicado = false;
  try {
    aplicado = await viaPg();
  } catch (pgError) {
    console.warn('[aplicar-migration-cnpj-etiquetas] pg falhou:', pgError?.message || String(pgError));
    try {
      aplicado = await viaPrisma();
    } catch (prismaError) {
      console.error(
        '[aplicar-migration-cnpj-etiquetas] Nao foi possivel aplicar via conexao atual.'
      );
      console.error('[aplicar-migration-cnpj-etiquetas] Erro:', prismaError?.message || String(prismaError));
      console.error('[aplicar-migration-cnpj-etiquetas] Execute no console do banco:');
      console.error('  ALTER TABLE "EtiquetaLote" ADD COLUMN IF NOT EXISTS "cnpj" TEXT;');
      process.exitCode = 1;
      return;
    }
  }

  if (aplicado && (await verificar())) {
    console.log('[aplicar-migration-cnpj-etiquetas] Migration aplicada com sucesso.');
  }
}

main().catch((error) => {
  console.error('[aplicar-migration-cnpj-etiquetas] ERRO:', error?.message || String(error));
  process.exitCode = 1;
});

