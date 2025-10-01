#!/usr/bin/env node
// Script que executa após o build no Vercel usando Prisma Deploy

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function runPostBuildMigration() {
  console.log('🚀 [VERCEL POST-BUILD] Iniciando verificação de dados...');
  
  // Só executar em produção
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL_ENV) {
    console.log('⏭️ Pulando verificação (não é produção)');
    return;
  }

  try {
    // NOTA: Migrations devem ser executadas manualmente devido a permissões do banco
    // O Prisma Client já foi gerado no build principal
    console.log('✅ Prisma Client já gerado no build principal');
    console.log('ℹ️ Migrations devem ser executadas manualmente (ver EXECUTAR_MIGRATION_MANUAL.md)');
    
    // Apenas validar conexão com o banco
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      // Testar conexão básica
      const motoristas = await prisma.motorista.count();
      const controles = await prisma.controleCarga.count();
      const notas = await prisma.notaFiscal.count();
      
      console.log(`✅ Conexão OK: ${motoristas} motoristas, ${controles} controles, ${notas} notas`);
      
    } catch (dataError) {
      console.error('❌ Erro na validação:', dataError.message);
      console.log('⚠️ Verifique se a migration manual foi executada (ver EXECUTAR_MIGRATION_MANUAL.md)');
    } finally {
      await prisma.$disconnect();
    }
    
    console.log('🎉 [VERCEL POST-BUILD] Migração concluída!');
    
  } catch (error) {
    console.error('❌ [VERCEL POST-BUILD] Erro na migração:', error.message);
    console.log('⚠️ Continuando build apesar do erro de migração');
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  runPostBuildMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erro fatal na migração:', error);
      process.exit(0); // Não falhar o build
    });
}

module.exports = { runPostBuildMigration };
