import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Busca o maior número de manifesto válido no banco de dados.
 */
async function buscarMaiorNumeroManifesto(): Promise<number> {
  try {
    const todosControles = await prisma.controleCarga.findMany({
      select: {
        numeroManifesto: true,
      },
      where: {
        numeroManifesto: {
          not: null,
        },
      },
    });

    if (todosControles.length === 0) {
      return 0;
    }

    const numeros = todosControles
      .map(item => parseInt(item.numeroManifesto!, 10))
      .filter(num => !isNaN(num));

    return Math.max(...numeros, 0);

  } catch (error) {
    console.error('Erro ao buscar o maior número de manifesto:', error);
    return 0; // Retorna 0 em caso de erro para não parar a operação.
  }
}

export async function gerarProximoNumeroManifesto(transportadora: 'ACERT' | 'EXPRESSO_GOIAS'): Promise<string> {
  try {
    const maiorNumero = await buscarMaiorNumeroManifesto();
    const proximoNumero = maiorNumero + 1;
    
    console.log(`[gerarProximoNumeroManifesto] Próximo número de manifesto gerado: ${proximoNumero}`);
    
    return String(proximoNumero);
  } catch (error) {
    console.error('[gerarProximoNumeroManifesto] Erro ao gerar próximo número de manifesto:', error);
    // Fallback: usa o timestamp atual como número único
    const fallbackNumber = Math.floor(Date.now() / 1000);
    console.error(`[gerarProximoNumeroManifesto] Usando fallback: ${fallbackNumber}`);
    return fallbackNumber.toString();
  }
}
