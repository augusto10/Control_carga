const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Listar todos os modelos disponíveis
    console.log('Modelos disponíveis no Prisma Client:');
    console.log(Object.keys(prisma).filter(key => !key.startsWith('_')));
    
    // Verificar se o modelo PedidoConferido existe
    console.log('\nVerificando se o modelo PedidoConferido existe...');
    console.log('pedidoConferido' in prisma ? '✅ Modelo encontrado' : '❌ Modelo não encontrado');
    
    // Tentar contar os registros
    try {
      const count = await prisma.pedidoConferido.count();
      console.log(`\nTotal de registros em PedidoConferido: ${count}`);
    } catch (countError) {
      console.error('\nErro ao contar registros de PedidoConferido:', countError.message);
    }
    
  } catch (error) {
    console.error('Erro ao verificar o Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
