// @ts-ignore
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Listar todos os modelos disponíveis
    console.log('Modelos disponíveis no Prisma Client:');
    console.log(Object.keys(prisma));
    
    // Verificar se o modelo PedidoConferido está disponível
    console.log('\nTipo de prisma.pedidoConferido:', typeof prisma.pedidoConferido);
    
    // Tentar contar as conferências
    const count = await prisma.pedidoConferido.count();
    console.log('\nTotal de conferências:', count);
    
  } catch (error) {
    console.error('Erro ao testar o modelo PedidoConferido:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
