// Criar tabela PalletAjuste usando abordagem mais direta
const { Client } = require('pg');
require('dotenv').config();

async function createTableDirect() {
  let client;
  
  try {
    console.log('🔨 Criando tabela PalletAjuste diretamente...');
    
    // Extrair informações da DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não encontrada');
    }
    
    console.log('📡 Conectando ao banco...');
    
    // Usar pg client diretamente
    client = new Client({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ Conectado ao banco!');
    
    // SQL para criar a tabela
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "PalletAjuste" (
        "id" TEXT NOT NULL,
        "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "motorista" TEXT,
        "transportadora" TEXT,
        "quantidade" INTEGER NOT NULL,
        "observacao" TEXT,
        "usuarioId" TEXT NOT NULL,
        CONSTRAINT "PalletAjuste_pkey" PRIMARY KEY ("id")
      );
    `;
    
    console.log('📝 Executando SQL para criar tabela...');
    await client.query(createTableSQL);
    console.log('✅ Tabela PalletAjuste criada!');
    
    // Criar índices
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "PalletAjuste_dataRecebimento_idx" ON "PalletAjuste"("dataRecebimento");',
      'CREATE INDEX IF NOT EXISTS "PalletAjuste_transportadora_idx" ON "PalletAjuste"("transportadora");',
      'CREATE INDEX IF NOT EXISTS "PalletAjuste_usuarioId_idx" ON "PalletAjuste"("usuarioId");'
    ];
    
    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }
    console.log('✅ Índices criados!');
    
    // Verificar se a tabela foi criada
    const checkTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'PalletAjuste'
    `);
    
    if (checkTable.rows.length > 0) {
      console.log('🎉 Tabela PalletAjuste confirmada no banco!');
      
      // Contar registros
      const count = await client.query('SELECT COUNT(*) as count FROM "PalletAjuste"');
      console.log(`📊 Total de registros: ${count.rows[0].count}`);
      
      console.log('✅ Sucesso! A funcionalidade de ajustes de pallets deve funcionar agora.');
      console.log('🔄 Reinicie o servidor Next.js para aplicar as mudanças.');
      
    } else {
      console.log('❌ Tabela não foi encontrada após criação');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (error.message.includes('permission denied')) {
      console.log('💡 Erro de permissão. O usuário do banco não tem privilégios para criar tabelas.');
      console.log('📞 Entre em contato com o administrador do banco de dados.');
    } else if (error.message.includes('already exists')) {
      console.log('ℹ️ Tabela já existe - verificando...');
      
      try {
        const count = await client.query('SELECT COUNT(*) as count FROM "PalletAjuste"');
        console.log(`📊 Total de registros: ${count.rows[0].count}`);
        console.log('✅ Tabela existente está funcionando!');
      } catch (testError) {
        console.error('❌ Erro ao testar tabela:', testError.message);
      }
    }
  } finally {
    if (client) {
      await client.end();
    }
  }
}

createTableDirect();
