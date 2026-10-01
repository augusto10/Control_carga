import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Iniciando aplicação da migração...');
    
    // Lê o arquivo SQL
    const sql = readFileSync(
      join(__dirname, '../prisma/migrations/add_assinatura_columns.sql'),
      'utf-8'
    );
    
    console.log('Executando SQL:');
    console.log(sql);
    
    // Executa o SQL diretamente
    await prisma.$executeRawUnsafe(sql);
    
    console.log('Migração aplicada com sucesso!');
  } catch (error) {
    console.error('Erro ao aplicar migração:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
