#!/usr/bin/env node
/**
 * scripts/check-db-all.js
 * Orquestrador simples para rodar uma sequência de checagens/ scripts de DB
 * Uso: node scripts/check-db-all.js
 * Requer: Node.js, variáveis de ambiente (ex: DATABASE_URL) conforme seus scripts.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function fileExists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function run(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: 'pipe', shell: true, env: process.env, ...opts });
    console.log('\n>>> RUNNING:', cmd, args.join(' '));
    proc.stdout.on('data', (d) => process.stdout.write(d));
    proc.stderr.on('data', (d) => process.stderr.write(d));
    proc.on('close', (code) => {
      console.log('<<< EXIT CODE:', code);
      resolve(code === 0);
    });
  });
}

async function main() {
  console.log('check-db-all: iniciando checagens sequenciais. Pressione Ctrl+C para cancelar.');

  const steps = [];

  // Node scripts that may exist in the repo
  const nodeScripts = [
    'list-all-tables.js',
    'check-tables.js',
    'test-db-connection.js',
    'test-db-connection.ts',
    'scripts/test-connection.ts',
    'create-historico-table.js',
    'scripts/verificar-estrutura-banco.js'
  ];

  // Add found node scripts to steps
  for (const rel of nodeScripts) {
    if (fileExists(rel)) {
      const full = path.join(root, rel);
      // prefer node for .js, ts-node for .ts if available
      if (rel.endsWith('.ts')) {
        steps.push({ cmd: 'npx', args: ['ts-node', rel] });
      } else {
        steps.push({ cmd: 'node', args: [rel] });
      }
    } else {
      console.log('– script não encontrado (pula):', rel);
    }
  }

  // If Prisma schema exists, add a dry-run db push (print-only) if possible
  if (fileExists('prisma/schema.prisma')) {
    // Use `npx prisma db push --schema=prisma/schema.prisma --preview-feature --print` if available
    steps.push({ cmd: 'npx', args: ['prisma', 'db', 'push', '--schema=prisma/schema.prisma', '--preview-feature', '--dry-run'] });
  } else {
    console.log('– prisma/schema.prisma não encontrado. Pulando passo prisma.');
  }

  // Run each step sequentially
  const results = [];
  for (const s of steps) {
    try {
      const ok = await run(s.cmd, s.args);
      results.push({ step: s, ok });
      if (!ok) {
        console.log('!!! step falhou, mas continuo para os próximos.');
      }
    } catch (err) {
      console.error('Erro ao executar step:', s, err && err.stack ? err.stack : err);
      results.push({ step: s, ok: false });
    }
  }

  // Sumário
  console.log('\n=== SUMÁRIO ===');
  results.forEach((r, i) => {
    const cmd = r.step.cmd + ' ' + (r.step.args || []).join(' ');
    console.log(`${i + 1}. ${cmd} -> ${r.ok ? 'OK' : 'FALHOU'}`);
  });

  const failed = results.filter(r => !r.ok).length;
  console.log('\nResultado final:', failed === 0 ? 'TODOS OK' : `${failed} passo(s) falharam`);
  process.exit(failed === 0 ? 0 : 2);
}

main().catch(err => {
  console.error('Erro inesperado:', err && err.stack ? err.stack : err);
  process.exit(1);
});
