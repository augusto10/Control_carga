const { PrismaClient } = require('@prisma/client');

async function migrateFuncionarioClienteSimple() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Iniciando migração simples da tabela FuncionarioCliente...');
    
    // Criar tabela FuncionarioCliente usando TEXT para tipo (sem enum)
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "FuncionarioCliente" (
          "id" TEXT NOT NULL,
          "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "nome" TEXT NOT NULL,
          "cpf" TEXT,
          "telefone" TEXT,
          "email" TEXT,
          "tipo" TEXT NOT NULL CHECK ("tipo" IN ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE', 'RESPONSAVEL')),
          "transportadoraId" TEXT,
          "cnh" TEXT,
          "ativo" BOOLEAN NOT NULL DEFAULT true,
          "observacoes" TEXT,
          CONSTRAINT "FuncionarioCliente_pkey" PRIMARY KEY ("id")
      );
    `;
    console.log('✅ Tabela FuncionarioCliente criada');
    
    // Criar índices
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "FuncionarioCliente_tipo_idx" ON "FuncionarioCliente"("tipo");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "FuncionarioCliente_ativo_idx" ON "FuncionarioCliente"("ativo");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "FuncionarioCliente_nome_idx" ON "FuncionarioCliente"("nome");`;
    console.log('✅ Índices criados');
    
    // Inserir dados de exemplo
    try {
      const id1 = require('crypto').randomUUID();
      const id2 = require('crypto').randomUUID();
      const id3 = require('crypto').randomUUID();
      
      await prisma.$executeRaw`
        INSERT INTO "FuncionarioCliente" ("id", "nome", "tipo", "ativo") 
        SELECT ${id1}, 'João Silva', 'MOTORISTA', true
        WHERE NOT EXISTS (SELECT 1 FROM "FuncionarioCliente" WHERE nome = 'João Silva');
      `;
      
      await prisma.$executeRaw`
        INSERT INTO "FuncionarioCliente" ("id", "nome", "tipo", "ativo") 
        SELECT ${id2}, 'Maria Santos', 'FUNCIONARIO', true
        WHERE NOT EXISTS (SELECT 1 FROM "FuncionarioCliente" WHERE nome = 'Maria Santos');
      `;
      
      await prisma.$executeRaw`
        INSERT INTO "FuncionarioCliente" ("id", "nome", "tipo", "ativo") 
        SELECT ${id3}, 'Cliente Exemplo', 'CLIENTE', true
        WHERE NOT EXISTS (SELECT 1 FROM "FuncionarioCliente" WHERE nome = 'Cliente Exemplo');
      `;
      console.log('✅ Dados de exemplo inseridos');
    } catch (error) {
      console.log('ℹ️  Dados de exemplo já existem ou erro esperado:', error.message);
    }
    
    console.log('✅ Migração executada com sucesso!');
    
    // Verificar se a tabela foi criada
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'FuncionarioCliente'
    `;
    
    if (result.length > 0) {
      console.log('✅ Tabela FuncionarioCliente confirmada no banco de dados!');
      
      // Contar registros
      const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "FuncionarioCliente"`;
      console.log(`📊 Registros na tabela: ${count[0].count}`);
    } else {
      console.log('❌ Tabela FuncionarioCliente não foi encontrada!');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a migração
migrateFuncionarioClienteSimple()
  .then(() => {
    console.log('🎉 Migração simples concluída!');
    console.log('💡 Agora execute: npx prisma generate');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  });
