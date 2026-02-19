// test-connection-postgres-direct.js
// Teste de conexão direta com PostgreSQL sem Prisma

const { Client } = require('pg');
require('dotenv').config();

async function testDirectPostgresConnection() {
  console.log('=== TESTE DE CONEXÃO DIRETA POSTGRESQL ===');
  
  // URL do banco de dados
  const databaseUrl = process.env.DATABASE_URL;
  console.log('📡 URL do banco:', databaseUrl ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
  
  if (!databaseUrl) {
    console.log('❌ DATABASE_URL não está configurado');
    return;
  }
  
  // Configurar cliente PostgreSQL
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('🔄 Conectando ao PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado com sucesso ao PostgreSQL!');
    
    // Testar query simples
    console.log('🔍 Executando query de teste...');
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Query executada com sucesso!');
    console.log('📅 Data/Hora do servidor:', result.rows[0].current_time);
    console.log('📋 Versão PostgreSQL:', result.rows[0].version.split('\n')[0]);
    
    // Listar tabelas
    console.log('📊 Verificando tabelas...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📋 Encontradas ${tablesResult.rows.length} tabelas:`);
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    // Verificar tabela Usuario
    console.log('👤 Verificando tabela Usuario...');
    const userTableResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Usuario' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    if (userTableResult.rows.length > 0) {
      console.log('✅ Tabela Usuario encontrada com colunas:');
      userTableResult.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
      
      // Contar usuários
      const userCount = await client.query('SELECT COUNT(*) as count FROM "Usuario"');
      console.log(`👥 Total de usuários: ${userCount.rows[0].count}`);
      
      // Listar usuários admin
      const adminUsers = await client.query(`
        SELECT id, nome, email, tipo, ativo 
        FROM "Usuario" 
        WHERE tipo = 'ADMIN'
        LIMIT 5
      `);
      
      if (adminUsers.rows.length > 0) {
        console.log('👑 Usuários ADMIN encontrados:');
        adminUsers.rows.forEach(user => {
          console.log(`   - ${user.nome} (${user.email}) - ${user.ativo ? 'ATIVO' : 'INATIVO'}`);
        });
      }
    } else {
      console.log('❌ Tabela Usuario não encontrada');
    }
    
    console.log('✅ Todos os testes concluídos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na conexão com PostgreSQL:');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensagem:', error.message);
    
    if (error.code) {
      console.error('Código PostgreSQL:', error.code);
      console.error('Detalhes:', error.detail);
    }
    
    // Dicas específicas para erros comuns
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 DICA: PostgreSQL não está rodando ou porta incorreta');
      console.log('   - Verifique se o PostgreSQL está instalado');
      console.log('   - Verifique se o serviço está rodando na porta 5432');
      console.log('   - Teste com: psql -h localhost -U postgres -d controle_carga_local');
    } else if (error.message.includes('password authentication failed')) {
      console.log('\n🔧 DICA: Senha do PostgreSQL incorreta');
      console.log('   - Verifique a senha do usuário postgres');
      console.log('   - Atualize o .env com a senha correta');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('\n🔧 DICA: Banco de dados não existe');
      console.log('   - Crie o banco: CREATE DATABASE controle_carga_local;');
      console.log('   - Conecte como postgres e execute o comando acima');
    }
    
  } finally {
    await client.end();
    console.log('🔌 Conexão encerrada');
  }
}

// Executar teste
testDirectPostgresConnection().catch(console.error);
