const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Testar a conexão com o banco de dados
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados com sucesso!');
    
    // Listar tabelas
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    
    console.log('\n📊 Tabelas no banco de dados:');
    console.table(result);
    
    // Verificar se a tabela Usuario existe
    const usuarioTableExists = result.some(t => t.table_name === 'Usuario');
    
    if (usuarioTableExists) {
      console.log('\n👤 Tabela Usuario encontrada. Buscando usuários...');
      const usuarios = await prisma.usuario.findMany();
      console.table(usuarios);
    } else {
      console.log('\n❌ Tabela Usuario não encontrada.');
    }
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
