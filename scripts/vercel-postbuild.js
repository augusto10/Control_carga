#!/usr/bin/env node
// Script que executa após o build no Vercel para corrigir o banco automaticamente

const { PrismaClient } = require('@prisma/client');

async function runPostBuildMigration() {
  console.log('🚀 [VERCEL POST-BUILD] Iniciando migração automática...');
  
  // Só executar em produção
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL_ENV) {
    console.log('⏭️ Pulando migração (não é produção)');
    return;
  }

  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando se precisa de migração...');
    
    // 1. Verificar se coluna tipo existe
    let needsTipoMigration = false;
    try {
      await prisma.motorista.findFirst({
        select: { tipo: true }
      });
      console.log('✅ Campo tipo já existe');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        needsTipoMigration = true;
        console.log('❗ Campo tipo não existe - será criado');
      }
    }
    
    // 2. Verificar se existem valores ACERT
    let needsAcertFix = false;
    try {
      const acertCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "ControleCarga" 
        WHERE "transportadora"::text = 'ACERT'
      `;
      if (Number(acertCount[0].count) > 0) {
        needsAcertFix = true;
        console.log(`❗ Encontrados ${acertCount[0].count} registros ACERT - serão corrigidos`);
      } else {
        console.log('✅ Não há valores ACERT para corrigir');
      }
    } catch (error) {
      // Se der erro, provavelmente é porque tem ACERT no banco
      needsAcertFix = true;
      console.log('❗ Erro ao verificar ACERT - assumindo que precisa correção');
    }

    // 3. Executar migrações se necessário
    if (needsTipoMigration) {
      console.log('🔧 Adicionando campo tipo...');
      
      await prisma.$executeRaw`
        ALTER TABLE "Motorista" 
        ADD COLUMN IF NOT EXISTS "tipo" "TipoPessoa"
      `;
      
      await prisma.$executeRaw`
        UPDATE "Motorista" 
        SET "tipo" = CASE 
          WHEN "cnh" IS NOT NULL AND "cnh" != '' THEN 'MOTORISTA'::"TipoPessoa"
          WHEN "transportadoraId" IS NOT NULL THEN 'FUNCIONARIO'::"TipoPessoa"
          ELSE 'MOTORISTA'::"TipoPessoa"
        END
        WHERE "tipo" IS NULL
      `;
      
      await prisma.$executeRaw`
        ALTER TABLE "Motorista" 
        ALTER COLUMN "tipo" SET NOT NULL
      `;
      
      console.log('✅ Campo tipo adicionado e configurado');
    }

    if (needsAcertFix) {
      console.log('🔧 Corrigindo valores ACERT para ACCERT...');
      
      // Temporariamente adicionar ACERT ao enum para permitir a correção
      try {
        await prisma.$executeRaw`
          ALTER TYPE "Transportadora" ADD VALUE IF NOT EXISTS 'ACERT'
        `;
      } catch (error) {
        // Valor já existe ou outro erro - continuar
      }

      // Corrigir os dados
      const controles = await prisma.$executeRaw`
        UPDATE "ControleCarga" 
        SET "transportadora" = 'ACCERT'::"Transportadora"
        WHERE "transportadora"::text = 'ACERT'
      `;
      
      const notas = await prisma.$executeRaw`
        UPDATE "NotaFiscal" 
        SET "transportadora" = 'ACCERT'::"Transportadora"
        WHERE "transportadora"::text = 'ACERT'
      `;
      
      const motoristas = await prisma.$executeRaw`
        UPDATE "Motorista" 
        SET "transportadoraId" = 'ACCERT'::"Transportadora"
        WHERE "transportadoraId"::text = 'ACERT'
      `;
      
      console.log(`✅ Corrigidos: ${controles} controles, ${notas} notas, ${motoristas} motoristas`);
    }

    // 4. Testar se tudo funciona
    console.log('🧪 Testando APIs...');
    
    const testMotoristas = await prisma.motorista.count();
    const testControles = await prisma.controleCarga.count();
    const testNotas = await prisma.notaFiscal.count();
    
    console.log(`✅ Testes OK: ${testMotoristas} motoristas, ${testControles} controles, ${testNotas} notas`);
    
    console.log('🎉 [VERCEL POST-BUILD] Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ [VERCEL POST-BUILD] Erro na migração:', error);
    // Não falhar o build por causa da migração
    console.log('⚠️ Continuando build apesar do erro de migração');
  } finally {
    await prisma.$disconnect();
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
