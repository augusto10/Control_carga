import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarSequencia() {
  try {
    console.log('=== Verificando sequência de números de manifesto ===\n');
    
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
    
    // Exibe os controles em ordem cronológica
    console.log('=== Controles em Ordem Cronológica ===');
    let sequenciaCorreta = true;
    
    controles.forEach((controle, index) => {
      const numeroEsperado = (index + 1).toString();
      const status = controle.numeroManifesto === numeroEsperado ? '✅' : '❌';
      
      if (controle.numeroManifesto !== numeroEsperado) {
        sequenciaCorreta = false;
      }
      
      console.log(`${status} ${index + 1}. Nº: ${controle.numeroManifesto?.toString().padEnd(3)} | ` +
                 `Data: ${controle.dataCriacao.toISOString()} | ` +
                 `Transportadora: ${controle.transportadora.padEnd(14)} | ` +
                 `Motorista: ${controle.motorista.padEnd(10)} | ` +
                 `Notas: ${controle._count.notas}`);
    });
    
    if (sequenciaCorreta) {
      console.log('\n✅ Todos os números de manifesto estão na sequência correta!');
    } else {
      console.log('\n❌ Foram encontradas inconsistências na numeração dos manifestos.');
    }
    
  } catch (error) {
    console.error('Erro ao verificar sequência:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executa a verificação
verificarSequencia()
  .catch(console.error)
  .finally(() => process.exit(0));
