import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Buscando usuários no banco de dados...');
    
    // Listar todos os usuários
    const usuarios = await prisma.$queryRaw`
      SELECT id, nome, email, tipo, ativo, "dataCriacao" 
      FROM "Usuario"
      ORDER BY "dataCriacao" DESC;
    `;
    
    console.log('\n📋 Usuários encontrados:');
    console.table(usuarios);
    
    // Verificar o usuário admin
    const admin = await prisma.$queryRaw`
      SELECT id, nome, email, tipo, ativo, "dataCriacao" 
      FROM "Usuario" 
      WHERE email = 'admin@controlecarga.com';
    `;
    
    console.log('\n👤 Detalhes do usuário admin:');
    console.table(admin);
    
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
