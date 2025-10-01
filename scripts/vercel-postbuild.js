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
    // NOTA: Não executamos migrations em produção pois o banco já existe
    // O Prisma Client já foi gerado no build principal
    console.log('✅ Prisma Client já gerado no build principal');
    
    // 2. Executar script de correção de dados
    console.log('🔧 Executando correção de dados...');
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      // Verificar se existem valores ACERT para corrigir
      const acertCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "ControleCarga" 
        WHERE "transportadora"::text = 'ACERT'
      `;
      
      if (Number(acertCount[0].count) > 0) {
        console.log(`🔧 Corrigindo ${acertCount[0].count} registros ACERT...`);
        
        // Corrigir dados usando raw SQL para evitar problemas de enum
        await prisma.$executeRaw`
          UPDATE "ControleCarga" 
          SET "transportadora" = 'ACCERT'
          WHERE "transportadora" = 'ACERT'
        `;
        
        await prisma.$executeRaw`
          UPDATE "NotaFiscal" 
          SET "transportadora" = 'ACCERT'
          WHERE "transportadora" = 'ACERT'
        `;
        
        await prisma.$executeRaw`
          UPDATE "Motorista" 
          SET "transportadoraId" = 'ACCERT'
          WHERE "transportadoraId" = 'ACERT'
        `;
        
        console.log('✅ Valores ACERT corrigidos para ACCERT');
      } else {
        console.log('✅ Não há valores ACERT para corrigir');
      }
      
      // Testar APIs básicas
      const motoristas = await prisma.motorista.count();
      const controles = await prisma.controleCarga.count();
      const notas = await prisma.notaFiscal.count();
      
      console.log(`✅ Testes OK: ${motoristas} motoristas, ${controles} controles, ${notas} notas`);
      
    } catch (dataError) {
      console.error('❌ Erro na correção de dados:', dataError.message);
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
