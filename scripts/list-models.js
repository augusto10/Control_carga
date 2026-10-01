const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Modelos disponíveis no Prisma Client:');
    const models = Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_'));
    console.log(models);
    
    if ('pedidoConferido' in prisma) {
      console.log('\nMétodos disponíveis em pedidoConferido:');
      console.log(Object.keys(prisma.pedidoConferido));
      
      try {
        const count = await prisma.pedidoConferido.count();
        console.log(`\nTotal de registros em PedidoConferido: ${count}`);
      } catch (error) {
        console.error('Erro ao contar registros:', error.message);
      }
    } else {
      console.log('\nO modelo pedidoConferido não está disponível no Prisma Client');
    }
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
