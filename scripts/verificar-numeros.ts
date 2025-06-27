import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarNumeros() {
  try {
    console.log('=== Verificando números de manifesto ===');
    
    // Busca todos os controles ordenados por data de criação
    const controles = await prisma.controleCarga.findMany({
      orderBy: {
        dataCriacao: 'asc',
      },
      select: {
        id: true,
        numeroManifesto: true,
        transportadora: true,
        dataCriacao: true,
        motorista: true,
        _count: {
          select: { notas: true }
        }
      },
    });

    console.log(`Total de controles: ${controles.length}\n`);
    
    // Agrupa por transportadora para exibição
    const porTransportadora: Record<string, any[]> = {};
    
    controles.forEach(controle => {
      if (!porTransportadora[controle.transportadora]) {
        porTransportadora[controle.transportadora] = [];
      }
      porTransportadora[controle.transportadora].push(controle);
    });

    // Exibe os controles por transportadora
    Object.entries(porTransportadora).forEach(([transportadora, lista]) => {
      console.log(`=== ${transportadora} (${lista.length} controles) ===`);
      
      lista.forEach(controle => {
        const data = new Date(controle.dataCriacao).toLocaleString('pt-BR');
        console.log(`- Nº: ${controle.numeroManifesto?.toString().padEnd(5)} | Data: ${data} | Motorista: ${controle.motorista.padEnd(10)} | Notas: ${controle._count.notas}`);
      });
      
      console.log();
    });
    
  } catch (error) {
    console.error('Erro ao verificar números:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executa a verificação
verificarNumeros()
  .catch(console.error)
  .finally(() => process.exit(0));
