console.log('=== Teste de Conexão Simples ===');
console.log('Iniciando...');

import { PrismaClient } from '@prisma/client';

async function testeConexao() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  });

  try {
    console.log('Conectando ao banco de dados...');
    await prisma.$connect();
    
    console.log('Conexão bem-sucedida!');
    
    // Tenta uma consulta simples
    const count = await prisma.controleCarga.count();
    console.log(`Total de registros na tabela ControleCarga: ${count}`);
    
    if (count > 0) {
      const primeiro = await prisma.controleCarga.findFirst();
      console.log('Primeiro registro:');
      console.log(JSON.stringify(primeiro, null, 2));
    }
    
  } catch (error) {
    console.error('Erro na conexão/consulta:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
    console.log('Conexão encerrada.');
  }
}

testeConexao()
  .catch(console.error)
  .finally(() => {
    console.log('Teste concluído.');
    process.exit(0);
  });
