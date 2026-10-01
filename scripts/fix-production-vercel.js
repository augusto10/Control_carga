// Script para corrigir problemas de produção no Vercel
// Execute este script no ambiente de produção do Vercel

const { PrismaClient } = require('@prisma/client');

async function fixProductionDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Iniciando correção do banco de produção...');
    
    // 1. Verificar se a coluna tipo existe
    console.log('\n1️⃣ Verificando coluna tipo na tabela Motorista...');
    try {
      const motoristas = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Motorista' AND column_name = 'tipo'
      `;
      
      if (motoristas.length === 0) {
        console.log('❌ Coluna tipo não existe. Criando...');
        
        // Adicionar coluna tipo
        await prisma.$executeRaw`
          ALTER TABLE "Motorista" 
          ADD COLUMN "tipo" "TipoPessoa"
        `;
        console.log('✅ Coluna tipo criada');
        
        // Definir valores padrão baseado na lógica de negócio
        await prisma.$executeRaw`
          UPDATE "Motorista" 
          SET "tipo" = CASE 
            WHEN "cnh" IS NOT NULL AND "cnh" != '' THEN 'MOTORISTA'::"TipoPessoa"
            WHEN "transportadoraId" IS NOT NULL THEN 'FUNCIONARIO'::"TipoPessoa"
            ELSE 'MOTORISTA'::"TipoPessoa"
          END
        `;
        console.log('✅ Valores padrão definidos para campo tipo');
        
        // Tornar a coluna NOT NULL
        await prisma.$executeRaw`
          ALTER TABLE "Motorista" 
          ALTER COLUMN "tipo" SET NOT NULL
        `;
        console.log('✅ Campo tipo configurado como NOT NULL');
      } else {
        console.log('✅ Coluna tipo já existe');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar/criar coluna tipo:', error.message);
    }
    
    // 2. Corrigir valores ACERT para ACCERT
    console.log('\n2️⃣ Corrigindo valores ACERT para ACCERT...');
    
    try {
      // Verificar se existem valores ACERT
      const acertCount = await prisma.$queryRaw`
        SELECT 
          (SELECT COUNT(*) FROM "ControleCarga" WHERE "transportadora"::text = 'ACERT') as controles,
          (SELECT COUNT(*) FROM "NotaFiscal" WHERE "transportadora"::text = 'ACERT') as notas,
          (SELECT COUNT(*) FROM "Motorista" WHERE "transportadoraId"::text = 'ACERT') as motoristas
      `;
      
      console.log('📊 Registros com ACERT encontrados:', acertCount[0]);
      
      // Corrigir ControleCarga
      const resultControles = await prisma.$executeRaw`
        UPDATE "ControleCarga" 
        SET "transportadora" = 'ACCERT'::"Transportadora"
        WHERE "transportadora"::text = 'ACERT'
      `;
      console.log(`✅ ${resultControles} registros corrigidos em ControleCarga`);
      
      // Corrigir NotaFiscal
      const resultNotas = await prisma.$executeRaw`
        UPDATE "NotaFiscal" 
        SET "transportadora" = 'ACCERT'::"Transportadora"
        WHERE "transportadora"::text = 'ACERT'
      `;
      console.log(`✅ ${resultNotas} registros corrigidos em NotaFiscal`);
      
      // Corrigir Motorista
      const resultMotoristas = await prisma.$executeRaw`
        UPDATE "Motorista" 
        SET "transportadoraId" = 'ACCERT'::"Transportadora"
        WHERE "transportadoraId"::text = 'ACERT'
      `;
      console.log(`✅ ${resultMotoristas} registros corrigidos em Motorista`);
      
    } catch (error) {
      console.error('❌ Erro ao corrigir valores ACERT:', error.message);
    }
    
    // 3. Verificar se as correções funcionaram
    console.log('\n3️⃣ Testando APIs após correção...');
    
    try {
      const motoristas = await prisma.motorista.findMany({ take: 1 });
      console.log('✅ API motoristas funcionando');
      
      const controles = await prisma.controleCarga.findMany({ take: 1 });
      console.log('✅ API controles funcionando');
      
      const notas = await prisma.notaFiscal.findMany({ take: 1 });
      console.log('✅ API notas funcionando');
      
    } catch (error) {
      console.error('❌ Erro ao testar APIs:', error.message);
    }
    
    console.log('\n🎉 Correção do banco de produção concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se for chamado diretamente
if (require.main === module) {
  fixProductionDatabase()
    .then(() => {
      console.log('✅ Script executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = { fixProductionDatabase };
