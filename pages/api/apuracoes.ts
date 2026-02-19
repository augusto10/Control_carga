import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../services/api-externa';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[API Apurações] Requisição recebida:', req.url);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { data_inicio, data_fim, limit = '50', offset = '0' } = req.query;
    console.log('[API Apurações] Query params:', { data_inicio, data_fim, limit, offset });

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;

    if (!username || !password) {
      return res.status(500).json({
        error: 'Credenciais da API externa não configuradas',
        details: 'Configure API_EXTERNA_USERNAME e API_EXTERNA_PASSWORD no .env.local'
      });
    }

    const filtros: {
      data_inicio?: string;
      data_fim?: string;
      limit: number;
      offset: number;
    } = {
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    };

    if (data_inicio && typeof data_inicio === 'string') {
      filtros.data_inicio = data_inicio;
    }
    if (data_fim && typeof data_fim === 'string') {
      filtros.data_fim = data_fim;
    }

    console.log('[API Apurações] Filtros:', filtros);
    
    // A API externa tem limite! Vamos buscar em lotes de 100
    const BATCH_SIZE = 100;
    const maxRecords = parseInt(limit as string, 10);
    let allData: any[] = [];
    let currentOffset = parseInt(offset as string, 10);
    let fetchedCount = 0;
    let errorCount = 0;
    const MAX_ERRORS = 3; // Parar após 3 erros consecutivos
    
    while (fetchedCount < maxRecords && errorCount < MAX_ERRORS) {
      const batchSize = Math.min(BATCH_SIZE, maxRecords - fetchedCount);
      const batchFilters = {
        ...filtros,
        limit: batchSize,
        offset: currentOffset
      };
      
      try {
        const resultado = await apiExternaService.listarApuracoes(batchFilters, username, password);
        
        if (!resultado || !resultado.data || resultado.data.length === 0) {
          break; // Não há mais dados
        }
        
        allData = [...allData, ...resultado.data];
        fetchedCount += resultado.data.length;
        currentOffset += resultado.data.length;
        errorCount = 0; // Reset error count on success
        
        // Se retornou menos que o batch size, não há mais dados
        if (resultado.data.length < batchSize) {
          break;
        }
      } catch (error: any) {
        console.error('[API Apurações] Erro no batch:', error.message);
        errorCount++;
        // Continuar mesmo com erro, pular para o próximo batch
        currentOffset += batchSize;
      }
    }

    const finalResult = {
      data: allData,
      total: allData.length,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    };

    console.log('[API Apurações] Resultado final:', {
      total: finalResult.total,
      count: finalResult.data?.length,
      temDados: !!finalResult.data?.[0]
    });

    return res.status(200).json(finalResult);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Erro interno ao processar requisição',
      message: error.message || 'Erro desconhecido',
      details: error.response?.data || error.stack
    });
  }
}
