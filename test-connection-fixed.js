const { Pool } = require('pg');
require('dotenv').config();

// Verifica se a DATABASE_URL está definida
if (!process.env.DATABASE_URL) {
  console.error('❌ Erro: DATABASE_URL não está definida no arquivo .env');
  process.exit(1);
}

console.log('🔍 Testando conexão PostgreSQL (nomes corretos)...');
console.log(`📡 URL de conexão: ${process.env.DATABASE_URL.split('@')[1]}`);

// Converte URL para formato PostgreSQL se necessário
let connectionString = process.env.DATABASE_URL;
if (connectionString.startsWith('prisma+postgres://')) {
  connectionString = connectionString.replace('prisma+postgres://', 'postgresql://');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function testConnection() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    // Teste de conexão
    const result = await client.query('SELECT 1 as test, NOW() as current_time');
    console.log('✅ Conexão bem-sucedida!');
    console.log('📅 Servidor time:', result.rows[0].current_time);
    
    // Lista tabelas
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    const tablesResult = await client.query(tablesQuery);
    
    console.log('\n📊 Tabelas encontradas:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Testa tabelas principais com nomes corretos (PascalCase)
    const mainTables = ['Usuario', 'ControleCarga', 'NotaFiscal'];
    
    console.log('\n📈 Verificando tabelas principais:');
    for (const table of mainTables) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM "${table}"`;
        const countResult = await client.query(countQuery);
        console.log(`   ✅ ${table}: ${countResult.rows[0].count} registros`);
      } catch (e) {
        console.log(`   ❌ ${table}: tabela não encontrada`);
      }
    }
    
    // Testa estrutura da tabela ControleCarga
    if (tablesResult.rows.some(row => row.table_name === 'ControleCarga')) {
      try {
        const columnsQuery = `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'ControleCarga' 
          ORDER BY ordinal_position
        `;
        const columnsResult = await client.query(columnsQuery);
        
        console.log('\n📋 Estrutura da tabela ControleCarga:');
        columnsResult.rows.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
        });
        
        // Mostra primeiros registros
        const sampleQuery = `
          SELECT id, dataCriacao, motorista, numeroManifesto, status 
          FROM "ControleCarga" 
          ORDER BY dataCriacao DESC 
          LIMIT 3
        `;
        const sampleResult = await client.query(sampleQuery);
        
        console.log('\n📝 Últimos registros (ControleCarga):');
        sampleResult.rows.forEach((row, i) => {
          console.log(`   ${i+1}. ID: ${row.id} | Motorista: ${row.motorista} | Manifesto: ${row.numeroManifesto} | Status: ${row.status}`);
        });
        
      } catch (e) {
        console.log('⚠️ Erro ao verificar estrutura da tabela ControleCarga:', e.message);
      }
    }
    
    // Testa tabela Usuario
    if (tablesResult.rows.some(row => row.table_name === 'Usuario')) {
      try {
        const userCount = await client.query('SELECT COUNT(*) as count FROM "Usuario"');
        const adminCount = await client.query('SELECT COUNT(*) as count FROM "Usuario" WHERE tipo = \'ADMIN\'');
        
        console.log('\n👤 Usuários:');
        console.log(`   Total: ${userCount.rows[0].count}`);
        console.log(`   Admins: ${adminCount.rows[0].count}`);
        
      } catch (e) {
        console.log('⚠️ Erro ao verificar tabela Usuario:', e.message);
      }
    }
    
    console.log('\n✅ Teste de conexão concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:');
    console.error(error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testConnection();
