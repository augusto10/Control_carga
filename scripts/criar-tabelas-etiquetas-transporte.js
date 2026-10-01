/**
 * Cria as tabelas EtiquetaLote e EtiquetaVolume usadas pela pagina de
 * Etiquetas de Transporte (etiquetas por numero de pedido e volumes).
 *
 * Uso: node scripts/criar-tabelas-etiquetas-transporte.js
 *
 * Se o DATABASE_URL for do Prisma Accelerate (prisma://accelerate...), tenta
 * usar DIRECT_URL quando disponivel; caso contrario conecta direto.
 * Em ultimo caso, tenta executar via PrismaClient ($executeRawUnsafe).
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv/config');

const SQL_PATH = path.join(__dirname, '..', 'prisma', 'migrations', '20260807120000_add_etiquetas_transporte', 'migration.sql');

async function viaPg() {
  let connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL/DIRECT_URL nao definida');
  }

  const client = new Client({
    connectionString,
    ssl:
      connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
  });

  try {
    console.log('[etiquetas-transporte] Conectando via pg...');
    await client.connect();
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    await client.query(sql);
    console.log('[etiquetas-transporte] Tabelas EtiquetaLote/EtiquetaVolume criadas com sucesso (via pg).');
    return true;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function viaPrismaRaw() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    console.log('[etiquetas-transporte] Tentando executar via PrismaClient ($executeRawUnsafe)...');
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
    console.log('[etiquetas-transporte] Tabelas criadas com sucesso (via PrismaClient).');
    return true;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function main() {
  try {
    await viaPg();
  } catch (pgError) {
    console.warn('[etiquetas-transporte] pg falhou, tentando PrismaClient:', pgError.message);
    try {
      await viaPrismaRaw();
    } catch (prismaError) {
      console.error(
        '[etiquetas-transporte] ERRO: nao foi possivel criar as tabelas automaticamente.'
      );
      console.error('[etiquetas-transporte] Erro via pg:', pgError.message);
      console.error('[etiquetas-transporte] Erro via prisma:', prismaError.message);
      console.error(
        '[etiquetas-transporte] Aplique manualmente o arquivo:',
        SQL_PATH,
        'no console do Neon/Supabase.'
      );
      process.exit(1);
    }
  }
  console.log('[etiquetas-transporte] Concluido.');
}

main();
