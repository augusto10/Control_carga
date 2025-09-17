const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createMotoristaMapping() {
  console.log('🔧 Criando tabela para mapear motoristas RETIRA_VENDEDOR...\n');

  try {
    // Criar tabela para mapear motoristas que são RETIRA_VENDEDOR mas foram salvos como TERCEIRIZADA
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "MotoristaTransportadoraMapping" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "motoristaId" uuid NOT NULL,
        "transportadoraReal" text NOT NULL,
        "transportadoraNoBanco" text NOT NULL,
        "dataCriacao" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_motorista_mapping FOREIGN KEY ("motoristaId") REFERENCES "Motorista"(id) ON DELETE CASCADE
      )
    `;

    console.log('✅ Tabela MotoristaTransportadoraMapping criada com sucesso!');

    // Criar índice para performance
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_motorista_mapping_motorista 
      ON "MotoristaTransportadoraMapping" ("motoristaId")
    `;

    console.log('✅ Índice criado com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMotoristaMapping();
