import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPrisma() {
  try {
    // Verificar se o modelo PedidoConferido está disponível
    console.log('Modelos disponíveis no Prisma Client:');
    console.log(Object.keys(prisma));
    
    // Verificar o tipo do modelo PedidoConferido
    console.log('\nTipo de prisma.pedidoConferido:', typeof prisma.pedidoConferido);
    
    // Tentar listar algumas conferências
    const conferencias = await prisma.pedidoConferido.findMany({
      take: 5,
      include: {
        pedido: {
          include: {
            controle: true,
          },
        },
        conferente: true,
      },
    });
    
    console.log('\nConferências encontradas:', conferencias);
  } catch (error) {
    console.error('Erro ao testar o Prisma Client:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();
