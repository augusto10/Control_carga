import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../services/api-externa';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[API Notas Fiscais] Requisição recebida:', req.url);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { data_inicio, data_fim, limit = '50', offset = '0' } = req.query;
    console.log('[API Notas Fiscais] Query params:', { data_inicio, data_fim, limit, offset });

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;

    if (!username || !password) {
      console.warn('[API Notas Fiscais] Credenciais não configuradas.');
      return res.status(200).json({
        data: [],
        total: 0,
        warning: 'Credenciais não configuradas'
      });
    }

    const filtros = {
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    };

    if (data_inicio && typeof data_inicio === 'string') {
      filtros.data_inicio = data_inicio;
    }
    if (data_fim && typeof data_fim === 'string') {
      filtros.data_fim = data_fim;
    }

    const resultado = await apiExternaService.listarNotasFiscais(filtros, username, password);

    console.log('[API Notas Fiscais] Resultado:', {
      total: resultado?.total,
      count: resultado?.data?.length,
      sample: resultado?.data?.[0] ? {
        ORCAMENTO_ID: resultado.data[0].ORCAMENTO_ID,
        ORCAMENTO_BASE_ID: resultado.data[0].ORCAMENTO_BASE_ID,
        NUMERO_NOTA: resultado.data[0].NUMERO_NOTA,
        IDENTIFICACAO_NFE: resultado.data[0].IDENTIFICACAO_NFE
      } : null
    });

    return res.status(200).json(resultado);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Erro interno',
      message: error.message
    });
  }
}
