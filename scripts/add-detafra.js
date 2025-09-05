const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addDetafraTransportes() {
  console.log('🚚 Adicionando Detafra Transportes...');

  try {
    // Verificar se já existe
    const existing = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "Transportadora" 
      WHERE nome = 'Detafra Transportes'
    `;
    
    if (existing[0].count > 0) {
      console.log('✅ Detafra Transportes já existe no banco.');
      return;
    }

    // Inserir Detafra Transportes
    await prisma.$executeRaw`
      INSERT INTO "Transportadora" (id, nome, codigo, ativo, "dataCriacao", "dataAtualizacao")
      VALUES (gen_random_uuid(), 'Detafra Transportes', 'DETAFRA_TRANSPORTES', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    console.log('✅ Detafra Transportes adicionada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar Detafra Transportes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDetafraTransportes();
