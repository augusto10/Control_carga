// Listar todas as tabelas do banco
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function listAllTables() {
  try {
    console.log('📊 Listando todas as tabelas do banco...');
    
    const tables = await prisma.$queryRaw`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('📋 Tabelas encontradas:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.table_name} (${table.table_type})`);
    });
    
    console.log(`\n📈 Total: ${tables.length} tabelas`);
    
    // Verificar especificamente por PalletAjuste (case sensitive)
    const palletTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND LOWER(table_name) LIKE '%pallet%'
    `;
    
    console.log('\n🔍 Tabelas relacionadas a "pallet":');
    if (palletTables.length > 0) {
      palletTables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    } else {
      console.log('  Nenhuma tabela relacionada a "pallet" encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao listar tabelas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllTables();
