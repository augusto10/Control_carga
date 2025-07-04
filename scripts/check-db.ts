import { PrismaClient } from '@prisma/client';

interface TableInfo {
  table_name: string;
}

const prisma = new PrismaClient();

async function main() {
  try {
    // Testar a conexão com o banco de dados
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados com sucesso!');
    
    // Listar tabelas
    const result = await prisma.$queryRaw<TableInfo[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    
    console.log('\n📊 Tabelas no banco de dados:');
    console.table(result);
    
    // Verificar se a tabela Usuario existe
    const usuarioTableExists = result.some((t) => t.table_name === 'Usuario');
    
    if (usuarioTableExists) {
      console.log('\n👤 Tabela Usuario encontrada. Buscando usuários...');
      const usuarios = await prisma.$queryRaw`SELECT * FROM "Usuario"`;
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
