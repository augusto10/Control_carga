const { Pool } = require('pg');
require('dotenv').config();

// Verifica se a DATABASE_URL está definida
if (!process.env.DATABASE_URL) {
  console.error('❌ Erro: DATABASE_URL não está definida no arquivo .env');
  process.exit(1);
}

console.log('🔍 Testando conexão PostgreSQL direta...');
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
    if (tablesResult.rows.length === 0) {
      console.log('   Nenhuma tabela encontrada (banco pode estar vazio)');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
    // Testa tabelas principais se existirem
    const mainTables = ['usuario', 'controlecarga', 'notafiscal'];
    
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
    
    // Testa estrutura da tabela controlecarga se existir
    if (tablesResult.rows.some(row => row.table_name.toLowerCase() === 'controlecarga')) {
      try {
        const columnsQuery = `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'controlecarga' 
          ORDER BY ordinal_position
        `;
        const columnsResult = await client.query(columnsQuery);
        
        console.log('\n📋 Estrutura da tabela controlecarga:');
        columnsResult.rows.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
        });
      } catch (e) {
        console.log('⚠️ Erro ao verificar estrutura da tabela controlecarga');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:');
    console.error(error.message);
    
    // Detalhes adicionais sobre o erro
    if (error.code === 'ENOTFOUND') {
      console.error('\n🔴 Erro de DNS: Não foi possível resolver o endereço do servidor.');
      console.error('Verifique se o hostname está correto.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n🔴 Tempo limite de conexão excedido.');
      console.error('O servidor pode estar inativo ou inacessível.');
    } else if (error.code === '3D000') {
      console.error('\n🔴 Banco de dados não encontrado.');
      console.error('Verifique se o nome do banco de dados está correto.');
    } else if (error.code === '28P01') {
      console.error('\n🔴 Falha na autenticação.');
      console.error('Verifique usuário e senha no arquivo .env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🔴 Conexão recusada pelo servidor.');
      console.error('Verifique se o PostgreSQL está em execução na porta 5432.');
    }
    
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testConnection();
