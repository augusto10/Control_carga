import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listarControles() {
  try {
    console.log('Listando todos os controles...');
    const controles = await prisma.controleCarga.findMany({
      select: {
        id: true,
        numeroManifesto: true,
        transportadora: true,
        dataCriacao: true,
        _count: {
          select: { notas: true }
        }
      },
      orderBy: {
        dataCriacao: 'desc',
      },
    });

    console.log('\nControles encontrados:', controles.length);
    console.log('----------------------------');
    
    controles.forEach((controle) => {
      console.log(`ID: ${controle.id}`);
      console.log(`Número: ${controle.numeroManifesto || 'N/A'}`);
      console.log(`Transportadora: ${controle.transportadora}`);
      console.log(`Data: ${controle.dataCriacao.toISOString()}`);
      console.log(`Total de notas: ${controle._count.notas}`);
      console.log('----------------------------');
    });
  } catch (error) {
    console.error('Erro ao listar controles:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

listarControles();
