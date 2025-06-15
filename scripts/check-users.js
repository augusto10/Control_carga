const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Conectando ao banco de dados...');
    
    // Listar todos os usuários
    const users = await prisma.$queryRaw`
      SELECT id, nome, email, tipo, ativo, "dataCriacao" 
      FROM "Usuario"
      ORDER BY "dataCriacao" DESC;
    `;
    
    console.log('\nUsuários encontrados:');
    console.table(users);
    
    // Verificar o usuário admin
    const admin = await prisma.$queryRaw`
      SELECT id, nome, email, tipo, ativo, "dataCriacao" 
      FROM "Usuario" 
      WHERE email = 'admin@controlecarga.com';
    `;
    
    console.log('\nDetalhes do usuário admin:');
    console.table(admin);
    
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
