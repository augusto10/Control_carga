import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../services/api-externa';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { data_inicio, data_fim, limit = '50', offset = '0' } = req.query;

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

    const resultado = await apiExternaService.listarApuracoes(filtros, username, password);

    if (!resultado) {
      return res.status(500).json({
        error: 'Erro ao buscar apurações na API externa',
        details: 'A API externa retornou um erro ou não respondeu'
      });
    }

    return res.status(200).json(resultado);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Erro interno ao processar requisição',
      message: error.message || 'Erro desconhecido',
      details: error.response?.data || error.stack
    });
  }
}

