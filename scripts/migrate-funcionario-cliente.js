const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function migrateFuncionarioCliente() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Iniciando migração segura da tabela FuncionarioCliente...');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'add-funcionario-cliente-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar comandos SQL separadamente
    console.log('📦 Executando migração SQL...');
    
    // 1. Criar enum TipoFuncionarioCliente
    try {
      await prisma.$executeRaw`
        DO $$ BEGIN
            CREATE TYPE "TipoFuncionarioCliente" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE', 'RESPONSAVEL');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
      `;
      console.log('✅ Enum TipoFuncionarioCliente criado/verificado');
    } catch (error) {
      console.log('ℹ️  Enum já existe ou erro esperado:', error.message);
    }
    
    // 2. Criar tabela FuncionarioCliente
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "FuncionarioCliente" (
          "id" TEXT NOT NULL,
          "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "nome" TEXT NOT NULL,
          "cpf" TEXT,
          "telefone" TEXT,
          "email" TEXT,
          "tipo" "TipoFuncionarioCliente" NOT NULL,
          "transportadoraId" "Transportadora",
          "cnh" TEXT,
          "ativo" BOOLEAN NOT NULL DEFAULT true,
          "observacoes" TEXT,
          CONSTRAINT "FuncionarioCliente_pkey" PRIMARY KEY ("id")
      );
    `;
    console.log('✅ Tabela FuncionarioCliente criada');
    
    // 3. Criar índices
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "FuncionarioCliente_tipo_idx" ON "FuncionarioCliente"("tipo");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "FuncionarioCliente_ativo_idx" ON "FuncionarioCliente"("ativo");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "FuncionarioCliente_nome_idx" ON "FuncionarioCliente"("nome");`;
    console.log('✅ Índices criados');
    
    // 4. Inserir dados de exemplo
    try {
      await prisma.$executeRaw`
        INSERT INTO "FuncionarioCliente" ("id", "nome", "tipo", "ativo") 
        SELECT gen_random_uuid()::text, 'João Silva', 'MOTORISTA'::\"TipoFuncionarioCliente\", true
        WHERE NOT EXISTS (SELECT 1 FROM "FuncionarioCliente" WHERE nome = 'João Silva');
      `;
      
      await prisma.$executeRaw`
        INSERT INTO "FuncionarioCliente" ("id", "nome", "tipo", "ativo") 
        SELECT gen_random_uuid()::text, 'Maria Santos', 'FUNCIONARIO'::\"TipoFuncionarioCliente\", true
        WHERE NOT EXISTS (SELECT 1 FROM "FuncionarioCliente" WHERE nome = 'Maria Santos');
      `;
      
      await prisma.$executeRaw`
        INSERT INTO "FuncionarioCliente" ("id", "nome", "tipo", "ativo") 
        SELECT gen_random_uuid()::text, 'Cliente Exemplo', 'CLIENTE'::\"TipoFuncionarioCliente\", true
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
    
    // Se o erro for sobre tipo já existir, isso é normal
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Alguns elementos já existiam no banco - isso é normal.');
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a migração
migrateFuncionarioCliente()
  .then(() => {
    console.log('🎉 Migração concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  });
