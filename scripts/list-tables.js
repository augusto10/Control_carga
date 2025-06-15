const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Listar tabelas usando query raw
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    
    console.log('Tabelas no banco de dados:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verificar se a tabela Usuario existe
    const usuarioTableExists = result.some(t => t.table_name === 'Usuario');
    
    if (usuarioTableExists) {
      console.log('\nUsuários na tabela Usuario:');
      const usuarios = await prisma.$queryRaw`SELECT * FROM "Usuario"`;
      console.log(JSON.stringify(usuarios, null, 2));
    } else {
      console.log('\nTabela Usuario não encontrada.');
    }
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
