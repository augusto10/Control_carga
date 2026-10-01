const { Client } = require('pg');
require('dotenv/config');

async function createPalletTable() {
  // Extrair URL direta do DATABASE_URL (remover accelerate se presente)
  let connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL não encontrada no .env');
    process.exit(1);
  }

  // Se for URL do Accelerate, extrair a URL original
  if (connectionString.includes('accelerate.prisma-data.net')) {
    // Formato: prisma://accelerate.prisma-data.net/eyJ...?api_key=...
    // Precisamos da URL original do banco
    console.log('Detectado Prisma Accelerate. Verifique se há DIRECT_URL no .env');
    connectionString = process.env.DIRECT_URL || connectionString;
  }

  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('[create-pallet-table] Conectando ao banco...');
    await client.connect();
    
    console.log('[create-pallet-table] Criando tabela PalletAjuste...');
    
    // Criar tabela
    await client.query(`
      CREATE TABLE IF NOT EXISTS "PalletAjuste" (
        id uuid PRIMARY KEY,
        "dataCriacao" timestamptz NOT NULL DEFAULT now(),
        "dataRecebimento" timestamptz NOT NULL DEFAULT now(),
        motorista text NULL,
        transportadora text NULL,
        quantidade integer NOT NULL,
        observacao text NULL,
        "usuarioId" text NOT NULL,
        CONSTRAINT fk_usuario FOREIGN KEY ("usuarioId") REFERENCES "Usuario"(id) ON DELETE RESTRICT
      );
    `);
    
    console.log('[create-pallet-table] Criando índices...');
    
    // Criar índices
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_data ON "PalletAjuste" ("dataRecebimento");`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_transportadora ON "PalletAjuste" (transportadora);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_usuario ON "PalletAjuste" ("usuarioId");`);
    
    console.log('[create-pallet-table] ✅ Tabela PalletAjuste criada com sucesso!');
    
  } catch (error) {
    console.error('[create-pallet-table] ❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createPalletTable();
