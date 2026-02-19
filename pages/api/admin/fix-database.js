// API endpoint para corrigir problemas críticos do banco de dados
// Acesse: https://seu-dominio.vercel.app/api/admin/fix-database

const { PrismaClient } = require('@prisma/client');

export default async function handler(req, res) {
  // Só permitir POST para segurança
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const prisma = new PrismaClient();
  const results = {
    steps: [],
    success: false,
    errors: []
  };

  try {
    results.steps.push('🔧 Iniciando correção do banco de dados...');

    // 1. Verificar e corrigir coluna tipo
    results.steps.push('\n1️⃣ Verificando coluna tipo na tabela Motorista...');
    
    try {
      const motoristas = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Motorista' AND column_name = 'tipo'
      `;
      
      if (motoristas.length === 0) {
        results.steps.push('❌ Coluna tipo não existe. Criando...');
        
        // Adicionar coluna tipo
        await prisma.$executeRaw`
          ALTER TABLE "Motorista" 
          ADD COLUMN "tipo" "TipoPessoa"
        `;
        results.steps.push('✅ Coluna tipo criada');
        
        // Definir valores padrão
        await prisma.$executeRaw`
          UPDATE "Motorista" 
          SET "tipo" = CASE 
            WHEN "cnh" IS NOT NULL AND "cnh" != '' THEN 'MOTORISTA'::"TipoPessoa"
            WHEN "transportadoraId" IS NOT NULL THEN 'FUNCIONARIO'::"TipoPessoa"
            ELSE 'MOTORISTA'::"TipoPessoa"
          END
        `;
        results.steps.push('✅ Valores padrão definidos para campo tipo');
        
        // Tornar NOT NULL
        await prisma.$executeRaw`
          ALTER TABLE "Motorista" 
          ALTER COLUMN "tipo" SET NOT NULL
        `;
        results.steps.push('✅ Campo tipo configurado como NOT NULL');
      } else {
        results.steps.push('✅ Coluna tipo já existe');
      }
    } catch (error) {
      const errorMsg = `❌ Erro ao verificar/criar coluna tipo: ${error.message}`;
      results.steps.push(errorMsg);
      results.errors.push(errorMsg);
    }

    // 2. Corrigir valores ACERT para ACCERT
    results.steps.push('\n2️⃣ Corrigindo valores ACERT para ACCERT...');
    
    try {
      // Verificar quantos registros têm ACERT
      const acertCount = await prisma.$queryRaw`
        SELECT 
          (SELECT COUNT(*) FROM "ControleCarga" WHERE "transportadora"::text = 'ACERT') as controles,
          (SELECT COUNT(*) FROM "NotaFiscal" WHERE "transportadora"::text = 'ACERT') as notas,
          (SELECT COUNT(*) FROM "Motorista" WHERE "transportadoraId"::text = 'ACERT') as motoristas
      `;
      
      results.steps.push(`📊 Registros com ACERT: ${JSON.stringify(acertCount[0])}`);
      
      // Corrigir ControleCarga
      const resultControles = await prisma.$executeRaw`
        UPDATE "ControleCarga" 
        SET "transportadora" = 'ACCERT'::"Transportadora"
        WHERE "transportadora"::text = 'ACERT'
      `;
      results.steps.push(`✅ ${resultControles} registros corrigidos em ControleCarga`);
      
      // Corrigir NotaFiscal
      const resultNotas = await prisma.$executeRaw`
        UPDATE "NotaFiscal" 
        SET "transportadora" = 'ACCERT'::"Transportadora"
        WHERE "transportadora"::text = 'ACERT'
      `;
      results.steps.push(`✅ ${resultNotas} registros corrigidos em NotaFiscal`);
      
      // Corrigir Motorista
      const resultMotoristas = await prisma.$executeRaw`
        UPDATE "Motorista" 
        SET "transportadoraId" = 'ACCERT'::"Transportadora"
        WHERE "transportadoraId"::text = 'ACERT'
      `;
      results.steps.push(`✅ ${resultMotoristas} registros corrigidos em Motorista`);
      
    } catch (error) {
      const errorMsg = `❌ Erro ao corrigir valores ACERT: ${error.message}`;
      results.steps.push(errorMsg);
      results.errors.push(errorMsg);
    }

    // 3. Testar APIs
    results.steps.push('\n3️⃣ Testando APIs após correção...');
    
    try {
      const motoristas = await prisma.motorista.findMany({ take: 1 });
      results.steps.push('✅ API motoristas funcionando');
      
      const controles = await prisma.controleCarga.findMany({ take: 1 });
      results.steps.push('✅ API controles funcionando');
      
      const notas = await prisma.notaFiscal.findMany({ take: 1 });
      results.steps.push('✅ API notas funcionando');
      
      results.success = true;
      results.steps.push('\n🎉 Correção concluída com sucesso!');
      
    } catch (error) {
      const errorMsg = `❌ Erro ao testar APIs: ${error.message}`;
      results.steps.push(errorMsg);
      results.errors.push(errorMsg);
    }

    return res.status(200).json(results);

  } catch (error) {
    results.errors.push(`❌ Erro geral: ${error.message}`);
    results.steps.push(`❌ Erro geral: ${error.message}`);
    
    return res.status(500).json(results);
    
  } finally {
    await prisma.$disconnect();
  }
}
