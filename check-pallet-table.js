// Verificar se a tabela PalletAjuste existe no banco
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkPalletTable() {
  try {
    console.log('🔍 Verificando se a tabela PalletAjuste existe...');
    
    // Verificar se a tabela existe usando SQL direto
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'PalletAjuste'
    `;
    
    console.log('📊 Resultado da consulta:', tables);
    
    if (tables.length > 0) {
      console.log('✅ Tabela PalletAjuste existe no banco!');
      
      // Tentar contar registros
      try {
        const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "PalletAjuste"`;
        console.log('📈 Total de registros na tabela:', count);
      } catch (countError) {
        console.log('⚠️ Erro ao contar registros:', countError.message);
      }
      
    } else {
      console.log('❌ Tabela PalletAjuste NÃO existe no banco!');
      console.log('💡 A tabela precisa ser criada.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPalletTable();
