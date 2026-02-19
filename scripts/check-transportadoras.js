const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTransportadoras() {
  console.log('🔍 Verificando transportadoras no banco...');

  try {
    // Verificar se a tabela existe e tem dados
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Transportadora"`;
    console.log(`📊 Total de transportadoras: ${count[0].count}`);

    if (count[0].count > 0) {
      const transportadoras = await prisma.$queryRaw`
        SELECT id, nome, codigo, ativo 
        FROM "Transportadora" 
        ORDER BY nome ASC
      `;
      
      console.log('📋 Transportadoras encontradas:');
      transportadoras.forEach(t => {
        console.log(`  - ${t.nome} (${t.codigo}) - ${t.ativo ? 'Ativo' : 'Inativo'}`);
      });
    } else {
      console.log('❌ Nenhuma transportadora encontrada no banco');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar transportadoras:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransportadoras();
