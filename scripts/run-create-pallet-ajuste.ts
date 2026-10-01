import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prismaScript } from './util/prismaScriptClient';

async function main() {
  const sqlPath = path.resolve(process.cwd(), 'scripts', 'sql', 'create_pallet_ajuste.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('[run-create-pallet-ajuste] Applying SQL at:', sqlPath);
  // Split SQL into individual statements and run sequentially
  const statements = sql
    .split(/;\s*\n|;\s*$/gm)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    console.log('[run-create-pallet-ajuste] Executing:', stmt.substring(0, 120).replace(/\n/g, ' ') + (stmt.length > 120 ? '...' : ''));
    await prismaScript.$executeRawUnsafe(stmt);
  }
  console.log('[run-create-pallet-ajuste] PalletAjuste ensured.');
}

main()
  .catch((e) => {
    console.error('[run-create-pallet-ajuste] Error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaScript.$disconnect();
  });
