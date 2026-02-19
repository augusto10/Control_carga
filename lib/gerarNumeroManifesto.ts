import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cache global para armazenar o último número usado
declare global {
  var __ultimoNumeroManifesto: number | undefined;
}

// Inicializa o cache global se não existir
if (global.__ultimoNumeroManifesto === undefined) {
  global.__ultimoNumeroManifesto = 0;
}

/**
 * Busca o maior número de manifesto válido em todas as transportadoras
 */
async function buscarMaiorNumeroManifesto(): Promise<number> {
  try {
    console.log('[buscarMaiorNumeroManifesto] Buscando maior número...');
    
    // Busca os últimos 100 controles com número de manifesto
    const resultado = await prisma.controleCarga.findMany({
      where: {
        numeroManifesto: {
          not: null,
        },
      },
      select: {
        numeroManifesto: true,
      },
      orderBy: {
        dataCriacao: 'desc',
      },
      take: 100, // Limita a busca para evitar sobrecarga
    });

    console.log(`[buscarMaiorNumeroManifesto] ${resultado.length} registros encontrados`);
    
    if (resultado.length > 0) {
      console.log('[buscarMaiorNumeroManifesto] Primeiros registros:', 
        resultado.slice(0, 3).map(r => r.numeroManifesto));
    }

    // Filtra e converte para números, removendo valores inválidos
    const numeros = resultado
      .map(item => item.numeroManifesto)
      .filter((num): num is string => num !== null)
      .map(num => {
        // Tenta converter para número
        const n = parseInt(num, 10);
        // Aceita apenas números positivos menores que 1.000.000
        return !isNaN(n) && n > 0 && n < 1000000 ? n : 0;
      });

    // Encontra o maior número
    const maiorNumero = numeros.length > 0 ? Math.max(...numeros) : 0;
    
    console.log(`[buscarMaiorNumeroManifesto] Maior número válido: ${maiorNumero}`);
    
    return maiorNumero;
  } catch (error) {
    console.error('[buscarMaiorNumeroManifesto] Erro ao buscar maior número de manifesto:', error);
    return 0;
  }
}

export async function gerarProximoNumeroManifesto(transportadora: 'ACERT' | 'EXPRESSO_GOIAS'): Promise<string> {
  console.log(`[gerarProximoNumeroManifesto] Iniciando para ${transportadora}`);
  
  try {
    // Se já temos um número em cache
    if (global.__ultimoNumeroManifesto && global.__ultimoNumeroManifesto > 0) {
      const proximoNumero = global.__ultimoNumeroManifesto + 1;
      console.log(`[gerarProximoNumeroManifesto] Usando número do cache + 1: ${proximoNumero}`);
      global.__ultimoNumeroManifesto = proximoNumero;
      return proximoNumero.toString();
    }
    
    // Se não tem no cache, busca no banco de dados
    console.log(`[gerarProximoNumeroManifesto] Buscando no banco de dados...`);
    const maiorNumero = await buscarMaiorNumeroManifesto();
    const proximoNumero = maiorNumero + 1;
    
    console.log(`[gerarProximoNumeroManifesto] Próximo número calculado: ${proximoNumero}`);
    
    // Atualiza o cache global
    global.__ultimoNumeroManifesto = proximoNumero;
    
    return proximoNumero.toString();
  } catch (error) {
    console.error('[gerarProximoNumeroManifesto] Erro ao gerar próximo número de manifesto:', error);
    // Fallback: usa o timestamp atual como número único
    const fallbackNumber = Math.floor(Date.now() / 1000);
    console.error(`[gerarProximoNumeroManifesto] Usando fallback: ${fallbackNumber}`);
    return fallbackNumber.toString();
  }
}
