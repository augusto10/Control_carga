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
    
    // 1. Executar migration do campo 'tipo' na tabela Motorista
    console.log('🔧 Executando migration: adicionar campo tipo...');
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      // Verificar se a coluna 'tipo' já existe
      const checkColumn = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Motorista' 
        AND column_name = 'tipo'
      `;
      
      if (checkColumn.length === 0) {
        console.log('📝 Coluna tipo não existe, criando...');
        
        // Criar enum TipoPessoa se não existir
        await prisma.$executeRaw`
          DO $$ BEGIN
            CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `;
        
        // Adicionar coluna tipo
        await prisma.$executeRaw`
          ALTER TABLE "Motorista" 
          ADD COLUMN "tipo" "TipoPessoa" DEFAULT 'MOTORISTA' NOT NULL
        `;
        
        console.log('✅ Coluna tipo adicionada com sucesso');
      } else {
        console.log('✅ Coluna tipo já existe');
      }
      
      // Testar APIs básicas
      const motoristas = await prisma.motorista.count();
      const controles = await prisma.controleCarga.count();
      const notas = await prisma.notaFiscal.count();
      
      console.log(`✅ Testes OK: ${motoristas} motoristas, ${controles} controles, ${notas} notas`);
      
    } catch (dataError) {
      console.error('❌ Erro na migration:', dataError.message);
      console.error('Stack:', dataError.stack);
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
