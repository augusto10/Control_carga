import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testarConexao() {
  try {
    console.log('Testando conexão com o banco de dados...');
    
    // Testa a conexão
    await prisma.$connect();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    
    // Conta o número de registros na tabela controleCarga
    const totalControles = await prisma.controleCarga.count();
    console.log(`\n📊 Total de controles no banco de dados: ${totalControles}`);
    
    if (totalControles > 0) {
      console.log('\n📝 Últimos 3 controles:');
      const ultimosControles = await prisma.controleCarga.findMany({
        take: 3,
        orderBy: { dataCriacao: 'desc' },
        select: {
          id: true,
          numeroManifesto: true,
          transportadora: true,
          dataCriacao: true,
          motorista: true,
          _count: { select: { notas: true } },
        },
      });
      
      console.log(JSON.stringify(ultimosControles, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar conexão com o banco de dados:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testarConexao();
