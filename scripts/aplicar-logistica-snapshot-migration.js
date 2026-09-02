/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv/config');

const SQL_PATH = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '20260902130000_add_logistica_snapshot',
  'migration.sql'
);

function getConnectionString() {
  const directUrl = process.env.DIRECT_URL;
  const databaseUrl = process.env.DATABASE_URL;
  const connectionString = directUrl || databaseUrl;
  if (!connectionString) {
    throw new Error('Defina DIRECT_URL ou DATABASE_URL antes de aplicar a migration.');
  }
  if (!directUrl && databaseUrl?.startsWith('prisma+')) {
    throw new Error(
      'A migration exige DIRECT_URL PostgreSQL direta. A DATABASE_URL do Prisma Accelerate nao possui permissao para criar tabelas.'
    );
  }
  return connectionString;
}

function assertConfirmado() {
  if (process.env.CONFIRMAR_MIGRATION_LOGISTICA === 'SIM') return;

  throw new Error(
    'Protecao ativa: execute com CONFIRMAR_MIGRATION_LOGISTICA=SIM para aplicar no banco configurado.'
  );
}

function lerStatements() {
  return fs
    .readFileSync(SQL_PATH, 'utf8')
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function aplicarViaPrisma() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    console.log('[logistica-snapshot] Conectando via Prisma Client...');
    await prisma.$connect();
    for (const statement of lerStatements()) {
      await prisma.$executeRawUnsafe(statement);
    }
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function main() {
  assertConfirmado();

  const connectionString = getConnectionString();

  if (connectionString.startsWith('prisma+')) {
    await aplicarViaPrisma();
    console.log('[logistica-snapshot] Migration aplicada via Prisma Client.');
    return;
  }

  const client = new Client({
    connectionString,
    ssl:
      connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
  });

  try {
    console.log('[logistica-snapshot] Conectando ao banco...');
    await client.connect();

    console.log('[logistica-snapshot] Aplicando migration idempotente...');
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('PedidoLogisticaSnapshot', 'SincronizacaoLogistica')
      ORDER BY table_name
    `);

    console.log('[logistica-snapshot] Tabelas encontradas:', result.rows.map((row) => row.table_name));
    console.log('[logistica-snapshot] Migration aplicada com sucesso.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[logistica-snapshot] Erro ao aplicar migration:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

main();
